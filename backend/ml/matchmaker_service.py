"""
Saanjh AI Matchmaker Service
Powered by Dual-Transformer Matchmaker (transformer-corrected) & Qdrant Vector Database
"""

import os
import sys
import json
import pickle
import argparse
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from pymongo import MongoClient
from bson.objectid import ObjectId
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

# 1. Custom Keras Layers from transformer-corrected.ipynb
class FeatureTokenizer(layers.Layer):
    """Projects each tabular feature value into a learned d-dimensional token embedding."""
    def __init__(self, num_features, embed_dim, **kwargs):
        super().__init__(**kwargs)
        self.num_features = num_features
        self.embed_dim = embed_dim

    def build(self, input_shape):
        self.weight = self.add_weight(
            shape=(1, self.num_features, self.embed_dim),
            initializer="glorot_uniform",
            trainable=True,
            name="feat_weights",
        )
        self.bias = self.add_weight(
            shape=(1, self.num_features, self.embed_dim),
            initializer="zeros",
            trainable=True,
            name="feat_biases",
        )

    def call(self, x):
        return tf.expand_dims(x, -1) * self.weight + self.bias

    def get_config(self):
        c = super().get_config()
        c.update({"num_features": self.num_features, "embed_dim": self.embed_dim})
        return c


class TransformerEncoderBlock(layers.Layer):
    """Multi-head self-attention + LayerNorm + FeedForward + residuals (post-LN)."""
    def __init__(self, embed_dim, num_heads, ff_dim, dropout_rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim, self.num_heads, self.ff_dim, self.dropout_rate = (
            embed_dim,
            num_heads,
            ff_dim,
            dropout_rate,
        )
        self.mha = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim // num_heads)
        self.ffn = models.Sequential([
            layers.Dense(ff_dim, activation="gelu"),
            layers.Dropout(dropout_rate),
            layers.Dense(embed_dim),
        ])
        self.ln1 = layers.LayerNormalization(epsilon=1e-5)
        self.ln2 = layers.LayerNormalization(epsilon=1e-5)
        self.drop1 = layers.Dropout(dropout_rate)
        self.drop2 = layers.Dropout(dropout_rate)

    def build(self, input_shape):
        self.mha.build(query_shape=input_shape, value_shape=input_shape)
        self.ffn.build(input_shape)
        self.ln1.build(input_shape)
        self.ln2.build(input_shape)
        super().build(input_shape)

    def call(self, x, training=None):
        attn = self.drop1(self.mha(x, x, training=training), training=training)
        x = self.ln1(x + attn)
        ffn_out = self.drop2(self.ffn(x, training=training), training=training)
        return self.ln2(x + ffn_out)

    def get_config(self):
        c = super().get_config()
        c.update({
            "embed_dim": self.embed_dim,
            "num_heads": self.num_heads,
            "ff_dim": self.ff_dim,
            "dropout_rate": self.dropout_rate,
        })
        return c


# 2. MatchmakerEngine class
class MatchmakerEngine:
    def __init__(self, base_dir=None):
        if base_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        self.base_dir = base_dir
        self.model_path = os.path.join(base_dir, "dual_transformer_matchmaker.keras")
        self.scalers_path = os.path.join(base_dir, "speed_dating_scalers.pkl")

        # Load scalers & artifacts
        with open(self.scalers_path, "rb") as f:
            self.scalers = pickle.load(f)

        self.subject_features = self.scalers["subject_features"]
        self.partner_features = self.scalers["partner_features"]
        self.cross_features = self.scalers["cross_features"]
        self.scaler_subj = self.scalers["scaler_subj"]
        self.scaler_part = self.scalers["scaler_part"]
        self.scaler_cross = self.scalers["scaler_cross"]
        self.best_threshold = float(self.scalers.get("best_threshold", 0.64))

        # Load Dual Transformer model
        self.model = tf.keras.models.load_model(
            self.model_path,
            custom_objects={
                "FeatureTokenizer": FeatureTokenizer,
                "TransformerEncoderBlock": TransformerEncoderBlock,
            },
            compile=False,
        )

        # Initialize Qdrant Client
        self.qdrant_storage_path = os.path.abspath(
            os.path.join(base_dir, "..", "data", "qdrant_db")
        )
        os.makedirs(self.qdrant_storage_path, exist_ok=True)

        qdrant_url = os.environ.get("QDRANT_URL")
        if qdrant_url:
            self.qdrant = QdrantClient(url=qdrant_url)
        else:
            self.qdrant = QdrantClient(path=self.qdrant_storage_path)

        self.collection_name = "saanjh_user_embeddings"
        self._init_qdrant_collection()

    def _init_qdrant_collection(self):
        """Ensures the collection exists with 32-dim Cosine vector configuration."""
        if not self.qdrant.collection_exists(self.collection_name):
            self.qdrant.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=32, distance=Distance.COSINE),
            )

    def extract_features(self, user_doc, profile_doc=None, interests_doc=None, answers=None):
        """Maps a MongoDB User/Profile/Interests into the 47-dimensional subject feature vector."""
        feats = np.zeros(len(self.subject_features), dtype=np.float32)

        # Demographics
        gender_raw = (user_doc.get("genderIdentity") or "").lower()
        gender_code = 1.0 if gender_raw in ["man", "male"] else 0.0

        dob = user_doc.get("dateOfBirth")
        age = 25.0
        if dob:
            from datetime import datetime
            if isinstance(dob, str):
                try:
                    dob = datetime.fromisoformat(dob.replace("Z", "+00:00"))
                except:
                    dob = None
            if hasattr(dob, "year"):
                age = float(max(18, min(80, datetime.now().year - dob.year)))

        go_out_map = {"rarely": 2.0, "sometimes": 4.0, "often": 5.0, "very-often": 6.0}
        go_out_str = (profile_doc.get("goingOutFrequency") if profile_doc else "") or "sometimes"
        go_out_val = go_out_map.get(go_out_str, 4.0)

        # Partner priorities (attr, sinc, intel, fun, amb, shar)
        priorities = (profile_doc.get("partnerPriorities") if profile_doc else {}) or {}
        attr1_1 = float(priorities.get("attractiveness", 6.0))
        sinc1_1 = float(priorities.get("sincerity", 7.0))
        intel1_1 = float(priorities.get("intelligence", 7.0))
        fun1_1 = float(priorities.get("humour", 6.0))
        amb1_1 = float(priorities.get("ambition", 6.0))
        shar1_1 = float(priorities.get("sharedInterests", 6.0))

        pref_sum = attr1_1 + sinc1_1 + intel1_1 + fun1_1 + amb1_1 + shar1_1 or 1.0
        pref_norm = np.array([attr1_1, sinc1_1, intel1_1, fun1_1, amb1_1, shar1_1]) / pref_sum

        # Interests mapping
        all_interests = set()
        if user_doc.get("interests"):
            for item in user_doc["interests"]:
                all_interests.add(item.lower())
        if interests_doc and interests_doc.get("interests"):
            for item in interests_doc["interests"]:
                all_interests.add(item.lower())

        interest_names = [
            "sports", "tvsports", "exercise", "dining", "museums", "art", "hiking",
            "gaming", "clubbing", "reading", "tv", "theater", "movies", "concerts",
            "music", "shopping", "yoga"
        ]

        interest_scores = {}
        for iname in interest_names:
            score = 5.0
            for u_int in all_interests:
                if iname in u_int or u_int in iname:
                    score = 9.0
                    break
            interest_scores[iname] = score

        interest_vec = np.array([interest_scores[k] for k in interest_names], dtype=np.float32)
        int_norm = float(np.linalg.norm(interest_vec))

        # Subject self ratings (default baseline ~6-7)
        attr = 6.5
        sinc = 7.5
        intel = 7.5
        fun = 6.8
        amb = 6.5
        shar = 6.5
        like = 6.8
        prob = 5.5

        traits = np.array([attr, sinc, intel, fun, amb, shar])
        pref_alignment = float(np.sum(pref_norm * traits))
        trait_composite = float(np.mean(traits))

        feature_dict = {
            "gender": gender_code,
            "age": age,
            "field_cd": 1.0,
            "career_c": 1.0,
            "imprace": 4.0,
            "imprelig": 4.0,
            "date": 4.0,
            "go_out": go_out_val,
            "attr1_1": attr1_1,
            "sinc1_1": sinc1_1,
            "intel1_1": intel1_1,
            "fun1_1": fun1_1,
            "amb1_1": amb1_1,
            "shar1_1": shar1_1,
            "attr3_1": 6.5,
            "sinc3_1": 7.5,
            "intel3_1": 7.5,
            "fun3_1": 6.8,
            "amb3_1": 6.5,
            "attr": attr,
            "sinc": sinc,
            "intel": intel,
            "fun": fun,
            "amb": amb,
            "shar": shar,
            "like": like,
            "prob": prob,
            "pref_alignment": pref_alignment,
            "trait_composite": trait_composite,
            "interest_vector_norm": int_norm,
        }

        for iname in interest_names:
            feature_dict[iname] = interest_scores[iname]

        for idx, col in enumerate(self.subject_features):
            feats[idx] = feature_dict.get(col, 5.0)

        return feats

    def compute_embedding(self, raw_features):
        """Transforms 47 raw features through scaler + Transformer to 32-dim normalized vector."""
        scaled = self.scaler_subj.transform(raw_features.reshape(1, -1)).astype(np.float32)
        tok = self.model.get_layer("subj_tokenizer")(scaled)
        enc1 = self.model.get_layer("subj_enc_1")(tok, training=False)
        enc2 = self.model.get_layer("subj_enc_2")(enc1, training=False)
        emb = tf.reduce_mean(enc2, axis=1)[0].numpy()
        norm = float(np.linalg.norm(emb))
        if norm > 1e-6:
            emb = emb / norm
        return emb.astype(float).tolist()

    def upsert_user_vector(self, user_id_str, user_doc, profile_doc=None, interests_doc=None):
        """Computes and indexes a user's vector in Qdrant."""
        feats = self.extract_features(user_doc, profile_doc, interests_doc)
        vector = self.compute_embedding(feats)

        # Convert 24-char hex string to an integer ID for Qdrant compatibility
        point_id = int(str(user_id_str)[-8:], 16)

        payload = {
            "user_id": str(user_id_str),
            "fullName": user_doc.get("fullName", ""),
            "displayName": user_doc.get("displayName") or user_doc.get("fullName", ""),
            "email": user_doc.get("email", ""),
            "city": user_doc.get("city") or (profile_doc.get("city") if profile_doc else "") or "",
            "gender": user_doc.get("genderIdentity", ""),
            "interests": user_doc.get("interests", []) or (interests_doc.get("interests", []) if interests_doc else []),
            "profileCompleted": bool(user_doc.get("profileCompleted", False)),
            "profilePhoto": user_doc.get("profilePhoto", ""),
            "bio": user_doc.get("bio", ""),
            "occupation": user_doc.get("occupation", ""),
        }

        self.qdrant.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )
        return {"point_id": point_id, "vector_dim": len(vector)}

    def find_matches(self, user_doc, profile_doc=None, interests_doc=None, candidate_users=None, top_k=6):
        """
        Two-stage AI matchmaking:
        Stage 1: Approximate Nearest Neighbor (ANN) search in Qdrant Vector Database.
        Stage 2: Full Dual-Transformer cross-attention inference for calibrated match probability.
        """
        subj_feats = self.extract_features(user_doc, profile_doc, interests_doc)
        subj_vector = self.compute_embedding(subj_feats)
        user_id_str = str(user_doc.get("_id") or user_doc.get("id"))
        gender_pref = user_doc.get("genderPreference") or ["woman"]
        if isinstance(gender_pref, str):
            gender_pref = [gender_pref]
        gender_pref = [str(g).lower() for g in gender_pref]

        # 1. Search nearest vectors in Qdrant
        qdrant_results = self.qdrant.query_points(
            collection_name=self.collection_name,
            query=subj_vector,
            limit=top_k + 8,
        )

        candidates = []
        for point in qdrant_results.points:
            p_payload = point.payload or {}
            cand_id = p_payload.get("user_id")
            cand_gender = str(p_payload.get("gender") or "").lower()
            if cand_id and str(cand_id) != str(user_id_str):
                # Filter out same gender if seeking opposite gender
                if "everyone" not in gender_pref and gender_pref:
                    if cand_gender and cand_gender not in gender_pref:
                        continue
                candidates.append((cand_id, p_payload, float(point.score)))

        # Fallback if Qdrant has few candidates
        if len(candidates) < 2 and candidate_users:
            for c in candidate_users:
                cid = str(c.get("_id") or c.get("id"))
                if cid != str(user_id_str) and not any(cid == x[0] for x in candidates):
                    candidates.append((
                        cid,
                        {
                            "user_id": cid,
                            "fullName": c.get("fullName", ""),
                            "displayName": c.get("displayName") or c.get("fullName", ""),
                            "email": c.get("email", ""),
                            "city": c.get("city", ""),
                            "gender": c.get("genderIdentity", ""),
                            "interests": c.get("interests", []),
                            "profilePhoto": c.get("profilePhoto", ""),
                            "bio": c.get("bio", ""),
                            "occupation": c.get("occupation", ""),
                        },
                        0.75,
                    ))

        # 2. Score candidates with Dual Transformer (Cross-Attention + Dyadic Merge)
        matched_results = []
        for cand_id, payload, vec_sim in candidates[:top_k]:
            cand_doc = next((c for c in (candidate_users or []) if str(c.get("_id") or c.get("id")) == cand_id), payload)
            part_feats = self.extract_features(cand_doc)

            # Cross features: age_gap, samerace, shared_interest_sim
            age_s = float(subj_feats[1])
            age_p = float(part_feats[1])
            age_gap = abs(age_s - age_p)
            samerace = 1.0

            int_s = subj_feats[19:36]
            int_p = part_feats[19:36]
            sim = float(np.dot(int_s, int_p) / (np.linalg.norm(int_s) * np.linalg.norm(int_p) + 1e-6))
            cross_vec = np.array([age_gap, samerace, sim], dtype=np.float32)

            # Scale inputs
            s_scaled = self.scaler_subj.transform(subj_feats.reshape(1, -1))
            p_scaled = self.scaler_part.transform(part_feats.reshape(1, -1))
            c_scaled = self.scaler_cross.transform(cross_vec.reshape(1, -1))

            prob = float(self.model.predict([s_scaled, p_scaled, c_scaled], verbose=0)[0][0])

            # Convert to match score percentage (blend model probability + vector cosine alignment)
            composite_score = int(round(prob * 60 + vec_sim * 40))
            composite_score = max(55, min(98, composite_score))

            matched_results.append({
                "userId": cand_id,
                "fullName": payload.get("fullName") or cand_doc.get("fullName", "User"),
                "displayName": payload.get("displayName") or cand_doc.get("displayName", "User"),
                "city": payload.get("city") or cand_doc.get("city", "Saanjh Community"),
                "age": int(round(part_feats[1])),
                "matchScore": composite_score,
                "modelProbability": round(prob, 4),
                "vectorSimilarity": round(vec_sim, 4),
                "interests": payload.get("interests") or cand_doc.get("interests", []),
                "profilePhoto": payload.get("profilePhoto") or cand_doc.get("profilePhoto", ""),
                "bio": payload.get("bio") or cand_doc.get("bio", ""),
                "occupation": payload.get("occupation") or cand_doc.get("occupation", ""),
                "tags": (payload.get("interests") or cand_doc.get("interests", []))[:3],
            })

        matched_results.sort(key=lambda x: x["matchScore"], reverse=True)
        return matched_results[:top_k]

    def get_status(self):
        """Returns Qdrant vector collection statistics & model status."""
        try:
            info = self.qdrant.get_collection(self.collection_name)
            points_count = info.points_count or 0
        except Exception as e:
            points_count = 0

        return {
            "model": "Dual-Transformer Matchmaker (transformer-corrected.ipynb)",
            "architecture": "Dyadic Cross-Attention Transformer (post-LN, 4 heads, d=32)",
            "vectorDatabase": "Qdrant",
            "collection": self.collection_name,
            "vectorDimension": 32,
            "distance": "Cosine",
            "indexedVectors": points_count,
            "decisionThreshold": self.best_threshold,
        }


# 3. CLI Handlers for Node.js / Express integration
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", choices=["status", "sync_all", "match", "upsert"], required=True)
    parser.add_argument("--user-id", default=None)
    args = parser.parse_args()

    engine = MatchmakerEngine()

    # Load MongoDB URI from .env
    from dotenv import load_dotenv
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(env_path)

    mongo_uri = os.environ.get("MONGODB_URI")
    client = MongoClient(mongo_uri)
    db = client.get_default_database()

    if args.action == "status":
        print(json.dumps({"success": True, "status": engine.get_status()}))
        sys.exit(0)

    elif args.action == "sync_all":
        users = list(db.users.find({}))
        synced = 0
        for u in users:
            uid = str(u["_id"])
            profile = db.profiles.find_one({"userId": u["_id"]})
            interests = db.userinterests.find_one({"userId": u["_id"]})
            engine.upsert_user_vector(uid, u, profile, interests)
            synced += 1

        print(json.dumps({
            "success": True,
            "message": f"Successfully vectorized and indexed {synced} users into Qdrant.",
            "indexedCount": synced,
            "status": engine.get_status(),
        }))
        sys.exit(0)

    elif args.action == "upsert" and args.user_id:
        try:
            oid = ObjectId(args.user_id)
            user = db.users.find_one({"_id": oid})
        except:
            user = db.users.find_one({"_id": args.user_id})

        if not user:
            print(json.dumps({"success": False, "message": "User not found"}))
            sys.exit(1)

        profile = db.profiles.find_one({"userId": user["_id"]})
        interests = db.userinterests.find_one({"userId": user["_id"]})
        res = engine.upsert_user_vector(args.user_id, user, profile, interests)
        print(json.dumps({"success": True, "result": res}))
        sys.exit(0)

    elif args.action == "match":
        if not args.user_id:
            # Default to first non-admin user
            user = db.users.find_one({"role": {"$ne": "admin"}}) or db.users.find_one({})
        else:
            try:
                user = db.users.find_one({"_id": ObjectId(args.user_id)})
            except:
                user = db.users.find_one({"_id": args.user_id})

        if not user:
            print(json.dumps({"success": False, "message": "User not found"}))
            sys.exit(1)

        profile = db.profiles.find_one({"userId": user["_id"]})
        interests = db.userinterests.find_one({"userId": user["_id"]})
        all_candidates = list(db.users.find({"_id": {"$ne": user["_id"]}}))

        matches = engine.find_matches(user, profile, interests, candidate_users=all_candidates)
        print(json.dumps({
            "success": True,
            "userId": str(user["_id"]),
            "matches": matches,
            "engine": engine.get_status(),
        }))
        sys.exit(0)


if __name__ == "__main__":
    main()
