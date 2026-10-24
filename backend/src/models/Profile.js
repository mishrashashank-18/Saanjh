const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    genderPreference: {
      type: [String],
      default: ['everyone'],
    },
    ageRange: {
      min: {
        type: Number,
        default: 18,
        min: 18,
      },
      max: {
        type: Number,
        default: 40,
        min: 18,
      },
    },
    relationshipGoal: {
      type: String,
      enum: ['long-term', 'casual', 'friendship', 'unsure', ''],
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    maxDistanceKm: {
      type: Number,
      default: 25,
    },
    languages: {
      type: [String],
      default: [],
    },
    partnerPriorities: {
      attractiveness: { type: Number, min: 1, max: 10, default: 5 },
      sincerity: { type: Number, min: 1, max: 10, default: 5 },
      intelligence: { type: Number, min: 1, max: 10, default: 5 },
      humour: { type: Number, min: 1, max: 10, default: 5 },
      ambition: { type: Number, min: 1, max: 10, default: 5 },
      sharedInterests: { type: Number, min: 1, max: 10, default: 5 },
    },
    goingOutFrequency: {
      type: String,
      enum: ['rarely', 'sometimes', 'often', 'very-often', ''],
      default: '',
    },
    culturalImportance: {
      type: String,
      enum: ['not-important', 'a-little', 'somewhat', 'very-important', 'prefer-not-to-say', ''],
      default: '',
    },
    dealBreakers: {
      type: String,
      maxlength: 500,
      default: '',
    },
    notes: {
      type: String,
      maxlength: 500,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    responseVersion: {
      type: String,
      default: 'v1.0',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
