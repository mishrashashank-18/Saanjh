import React, { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import PhotoUploadModal from "../components/PhotoUploadModal"
import {
  api,
  ProfileData,
  UserInterestsData,
  AIMatch,
  MatchEngineStatus,
} from "../services/api"

interface DashboardPageProps {
  onNavigate: (path: string) => void
}

interface CuratedCandidate {
  userId: string
  name: string
  age: number
  city: string
  occupation: string
  bio: string
  photo: string
  matchScore: number
  vectorSimilarity: number
  modelProbability: number
  tags: string[]
}

const defaultCandidates: CuratedCandidate[] = [
  {
    userId: "cand-aarohi",
    name: "Aarohi",
    age: 24,
    city: "Bangalore, India",
    occupation: "Software Engineer",
    bio: "Software Engineer. Loves exploring new places, meaningful conversations and weekend getaways with filter coffee.",
    photo: "/images/aarohi-reference.png",
    matchScore: 92,
    vectorSimilarity: 0.94,
    modelProbability: 0.92,
    tags: ["Travel", "Books", "Hiking", "Music"],
  },
  {
    userId: "cand-priya",
    name: "Priya",
    age: 25,
    city: "Delhi, India",
    occupation: "Product Designer",
    bio: "Product Designer. Enjoys long walks, electronic music, fitness routines and building ideas that make people smile.",
    photo: "/images/riya-reference.png",
    matchScore: 88,
    vectorSimilarity: 0.89,
    modelProbability: 0.87,
    tags: ["Tech", "Music", "Fitness", "Design"],
  },
  {
    userId: "cand-meera",
    name: "Meera",
    age: 25,
    city: "Pune, India",
    occupation: "Architect",
    bio: "Architect. Passionate about sustainable spaces, pottery, contemporary art galleries, and quiet Sunday mornings.",
    photo: "/images/meera-reference.png",
    matchScore: 85,
    vectorSimilarity: 0.87,
    modelProbability: 0.83,
    tags: ["Art", "Nature", "Coffee", "Architecture"],
  },
]

function HeaderIcon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [userInterests, setUserInterests] = useState<UserInterestsData | null>(null)
  const [candidates, setCandidates] = useState<CuratedCandidate[]>(defaultCandidates)
  const [matchEngine, setMatchEngine] = useState<MatchEngineStatus | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<CuratedCandidate | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, matchRes] = await Promise.all([
          api.onboarding.getSettings().catch(() => null),
          api.matches.getMatches().catch(() => null),
        ])

        if (settingsRes?.profile) setProfile(settingsRes.profile)
        if (settingsRes?.userInterests) setUserInterests(settingsRes.userInterests)

        if (matchRes?.success && matchRes.matches && matchRes.matches.length > 0) {
          setMatchEngine(matchRes.engine || null)

          const mapped: CuratedCandidate[] = matchRes.matches
            .filter((m: AIMatch) => m.userId !== (user?.id || (user as any)?._id))
            .map((m: AIMatch) => {
              const baseName = (m.displayName || m.fullName || "Member").split(" ")[0]
              let fallbackPhoto = "/images/aarohi-reference.png"
              if (baseName.toLowerCase().includes("aditya")) {
                fallbackPhoto = "/images/aditya-reference.png"
              } else if (baseName.toLowerCase().includes("meera")) {
                fallbackPhoto = "/images/meera-reference.png"
              } else if (baseName.toLowerCase().includes("neha")) {
                fallbackPhoto = "/images/neha-reference.png"
              }

              return {
                userId: m.userId,
                name: baseName,
                age: m.age || 24,
                city: m.city || "Bangalore, India",
                occupation: m.occupation || "Creative Professional",
                bio: m.bio || `${baseName} values thoughtful conversations, creative curiosity, and deep interpersonal connection.`,
                photo: m.profilePhoto || fallbackPhoto,
                matchScore: m.matchScore || 85,
                vectorSimilarity: m.vectorSimilarity || 0.90,
                modelProbability: m.modelProbability || 0.86,
                tags: m.tags && m.tags.length > 0 ? m.tags.map((t: string) => t.replace(/_/g, " ")) : ["Values", "Interests", "Pacing"],
              }
            })

          if (mapped.length >= 3) {
            setCandidates(mapped.slice(0, 6))
          } else {
            const combined = [...mapped]
            for (const def of defaultCandidates) {
              if (combined.length < 3 && !combined.some((c) => c.name.toLowerCase() === def.name.toLowerCase())) {
                combined.push(def)
              }
            }
            setCandidates(combined)
          }
        }
      } catch (err) {
        console.warn("Dashboard loading notice:", err)
      }
    }

    loadData()
  }, [user])

  const displayName = user?.displayName || user?.fullName || "Shashank Mishra"

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--cream, #fffaf4)",
        color: "var(--ink, #1f1a17)",
      }}
    >
      {/* 1. Exactly Matching Website Header */}
      <header className="site-header" id="top">
        <a
          className="logo"
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onNavigate("/")
          }}
          aria-label="Saanjh home"
        >
          <span className="logo-mark">
            <i />
            <i />
            <i />
          </span>
          <span>Saanjh</span>
        </a>

        {/* Navigation links matching the main site */}
        <nav className={mobileMenuOpen ? "open" : ""}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              onNavigate("/")
            }}
          >
            Home
          </a>
          <a
            className="active"
            href="#matches"
            onClick={(e) => {
              e.preventDefault()
            }}
          >
            Matches
          </a>
          <a
            href="#questions"
            onClick={(e) => {
              e.preventDefault()
              onNavigate("/onboarding/interest-questions")
            }}
          >
            Questions
          </a>
          <a
            href="#messages"
            onClick={(e) => {
              e.preventDefault()
              alert("Conversations open when connection is accepted.")
            }}
          >
            Messages
          </a>
          <a
            href="#insights"
            onClick={(e) => {
              e.preventDefault()
              onNavigate("/settings")
            }}
          >
            Insights
          </a>
        </nav>

        {/* User Nav on Right */}
        <div className="user-nav">
          <button aria-label="Search" onClick={() => alert("Search candidate profiles...")}>
            <HeaderIcon name="search" />
          </button>
          <button className="notification" aria-label="Notifications" onClick={() => alert("No new notifications.")}>
            <HeaderIcon name="bell" />
            <i />
          </button>

          {user && user.role === "admin" && (
            <button
              type="button"
              className="admin-nav-button"
              onClick={() => onNavigate("/admin")}
              title="Open Admin Monitor"
              style={{
                background: "#fbe3d6",
                border: "1px solid #ebd9c8",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "700",
                color: "var(--coral-dark)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <span>🛡️</span>
              <span>Admin</span>
            </button>
          )}

          {/* User Logged-in Pill with Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="user-logged-in-pill"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User account menu"
            >
              <span className="user-pill-avatar" style={{ overflow: "hidden" }}>
                <img
                  src={
                    user?.profilePhoto ||
                    (displayName.toLowerCase().includes("shashank") || user?.email?.includes("shashank")
                      ? "/images/shashank.jpg"
                      : "/images/shashank.jpg")
                  }
                  alt={displayName}
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              </span>
              <span className="user-pill-name">{displayName}</span>
              <span style={{ fontSize: "11px", color: "#8c827a", marginLeft: "2px" }}>▼</span>
            </button>

            {showUserMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "46px",
                  background: "#ffffff",
                  border: "1px solid #ebd9c8",
                  borderRadius: "14px",
                  boxShadow: "0 10px 28px rgba(45, 30, 20, 0.12)",
                  padding: "8px",
                  zIndex: 200,
                  width: "210px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false)
                    setIsPhotoModalOpen(true)
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    color: "var(--coral, #e0663c)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  📷 Add / Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false)
                    onNavigate("/profile")
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    color: "#1f1a17",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  👤 Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false)
                    onNavigate("/settings")
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    color: "#1f1a17",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  ⚙ Settings & Preferences
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false)
                    onNavigate("/onboarding/interest-questions")
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    color: "#1f1a17",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  📝 Review Questions
                </button>
                {user?.role === "admin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false)
                      onNavigate("/admin")
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      background: "#ede9fe",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      cursor: "pointer",
                      color: "#6d28d9",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      margin: "4px 0",
                    }}
                  >
                    🛡️ Admin Monitor
                  </button>
                )}
                <div style={{ height: "1px", background: "#f0e7df", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false)
                    logout()
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    color: "#b8431b",
                    fontWeight: 600,
                  }}
                >
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>

          <button
            className="menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <HeaderIcon name="menu" />
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Card Container */}
      <main style={{ maxWidth: "1140px", margin: "36px auto", padding: "0 20px" }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #ebd9c8",
            borderRadius: "24px",
            boxShadow: "0 12px 40px rgba(45, 30, 20, 0.06)",
            overflow: "hidden",
            padding: "36px",
          }}
        >
                    {/* Option to Add / Update Photo (Cloudinary Powered) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              background: user?.profilePhoto
                ? "linear-gradient(135deg, #fbf7f2 0%, #ffffff 100%)"
                : "linear-gradient(135deg, #fff7f2 0%, #ffffff 100%)",
              border: user?.profilePhoto ? "1px solid #ebd9c8" : "1.5px solid #f6cfbd",
              borderRadius: "20px",
              padding: "20px 28px",
              marginBottom: "32px",
              boxShadow: "0 4px 18px rgba(45, 30, 20, 0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                style={{
                  position: "relative",
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  padding: "3px",
                  background: user?.profilePhoto
                    ? "linear-gradient(135deg, #2f6b62, #e0663c)"
                    : "linear-gradient(135deg, #e0663c, #f6cfbd)",
                  boxShadow: "0 4px 14px rgba(224, 102, 60, 0.2)",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                onClick={() => setIsPhotoModalOpen(true)}
                title="Click to add or change photo with Cloudinary"
              >
                <img
                  src={
                    user?.profilePhoto ||
                    (displayName.toLowerCase().includes("shashank") || user?.email?.includes("shashank")
                      ? "/images/shashank.jpg"
                      : "/images/shashank.jpg")
                  }
                  alt={displayName}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    background: "#f0e6dc",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#e0663c",
                    border: "2px solid #ffffff",
                    color: "#ffffff",
                    fontSize: "11px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  📷
                </span>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "var(--ink, #1f1a17)" }}>
                    {user?.profilePhoto ? "Your Profile Photo is Active" : "Add Your Photo to Complete Your Profile"}
                  </h2>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Cloudinary CDN
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "13.5px", color: "#6a6158", lineHeight: 1.4 }}>
                  {user?.profilePhoto
                    ? "Uploaded and securely hosted on Cloudinary with smart face focus and responsive compression."
                    : "Members with authentic photos receive up to 4x higher mutual compatibility interest. Use Cloudinary to upload."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPhotoModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "999px",
                background: user?.profilePhoto ? "#ffffff" : "var(--coral, #e0663c)",
                color: user?.profilePhoto ? "var(--ink, #1f1a17)" : "#ffffff",
                border: user?.profilePhoto ? "1.5px solid #ded6cd" : "none",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: user?.profilePhoto ? "none" : "0 4px 14px rgba(224, 102, 60, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <span>📷</span>
              <span>{user?.profilePhoto ? "Change Photo" : "Add Photo"}</span>
            </button>
          </div>

          {/* Hero / Compatibility Engine Overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "28px",
              background: "linear-gradient(135deg, #fff9f5 0%, #ffffff 100%)",
              border: "1px solid #ebd9c8",
              borderRadius: "20px",
              padding: "28px 32px",
              marginBottom: "36px",
              alignItems: "center",
            }}
          >
            {/* Left Column */}
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ede9fe",
                  color: "#6d28d9",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Dual Transformer + Qdrant
              </span>
              <h1
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontSize: "34px",
                  fontWeight: 600,
                  lineHeight: 1.15,
                  margin: "0 0 10px",
                  color: "var(--ink, #1f1a17)",
                }}
              >
                Today's Curated Compatibility
              </h1>
              <p
                style={{
                  fontSize: "15px",
                  color: "#5d534b",
                  lineHeight: 1.5,
                  margin: "0 0 18px",
                  maxWidth: "520px",
                }}
              >
                Your multi-dimensional compatibility scores are calculated by evaluating dyadic cross-attention across shared values, personality traits, and lifestyle pacing.
              </p>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "5px 14px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                ● Qdrant Vector Index Active (32-dim Cosine Embeddings)
              </div>
            </div>

            {/* Right Column: Multi-Dimensional Breakdown */}
            <div
              style={{
                background: "#faf6f0",
                borderRadius: "16px",
                padding: "20px 24px",
                border: "1px solid #ebd9c8",
              }}
            >
              <div
                style={{
                  fontFamily: "'Newsreader', serif",
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Multi-Dimensional Alignment</span>
                <strong style={{ color: "#e0663c", fontSize: "16px" }}>92% Aggregate</strong>
              </div>

              {/* Progress bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 45px", alignItems: "center", gap: "12px", fontSize: "13.5px", fontWeight: 500 }}>
                  <span>Core Values</span>
                  <div style={{ height: "8px", background: "#e5ded4", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "95%", height: "100%", background: "#2f6b62", borderRadius: "999px" }} />
                  </div>
                  <strong style={{ textAlign: "right" }}>95%</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 45px", alignItems: "center", gap: "12px", fontSize: "13.5px", fontWeight: 500 }}>
                  <span>Personality</span>
                  <div style={{ height: "8px", background: "#e5ded4", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "88%", height: "100%", background: "#e0663c", borderRadius: "999px" }} />
                  </div>
                  <strong style={{ textAlign: "right" }}>88%</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 45px", alignItems: "center", gap: "12px", fontSize: "13.5px", fontWeight: 500 }}>
                  <span>Interests</span>
                  <div style={{ height: "8px", background: "#e5ded4", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "91%", height: "100%", background: "#8b5cf6", borderRadius: "999px" }} />
                  </div>
                  <strong style={{ textAlign: "right" }}>91%</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 45px", alignItems: "center", gap: "12px", fontSize: "13.5px", fontWeight: 500 }}>
                  <span>Lifestyle</span>
                  <div style={{ height: "8px", background: "#e5ded4", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "85%", height: "100%", background: "#0284c7", borderRadius: "999px" }} />
                  </div>
                  <strong style={{ textAlign: "right" }}>85%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section Heading */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Newsreader', serif",
                fontSize: "26px",
                fontWeight: 600,
                color: "var(--ink, #1f1a17)",
                margin: 0,
              }}
            >
              AI-Curated Connections
            </h2>
            <span style={{ fontSize: "13.5px", color: "#78716c", fontWeight: 400 }}>
              Showing top {Math.min(candidates.length, 3)} candidate pairs
            </span>
          </div>

          {/* Candidate Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "22px",
            }}
          >
            {candidates.slice(0, 3).map((candidate) => (
              <div
                key={candidate.userId}
                style={{
                  background: "#ffffff",
                  border: "1px solid #ebd9c8",
                  borderRadius: "20px",
                  padding: "22px",
                  boxShadow: "0 6px 20px rgba(45, 30, 20, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div>
                  {/* Card Top: User Info & Match Score */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={candidate.photo}
                        alt={candidate.name}
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #ebd9c8",
                        }}
                      />
                      <div>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink, #1f1a17)", margin: 0 }}>
                          {candidate.name}, {candidate.age}
                        </h3>
                        <span style={{ fontSize: "12.5px", color: "#78716c" }}>
                          📍 {candidate.city}
                        </span>
                      </div>
                    </div>

                    {/* Score Circle Badge */}
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #fbe3d6 0%, #fee2e2 100%)",
                        border: "2px solid #e0663c",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#b8431b",
                        fontWeight: 800,
                        fontSize: "13.5px",
                        lineHeight: 1,
                      }}
                    >
                      <span>{candidate.matchScore}%</span>
                      <span style={{ fontSize: "8.5px", textTransform: "uppercase" }}>Match</span>
                    </div>
                  </div>

                  {/* Bio */}
                  <p
                    style={{
                      fontSize: "13.5px",
                      color: "#4b5563",
                      lineHeight: 1.5,
                      margin: "0 0 14px",
                      minHeight: "58px",
                    }}
                  >
                    {candidate.bio}
                  </p>

                  {/* Tags */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    {candidate.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          background: "#f0e9df",
                          color: "#44403c",
                          padding: "3px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Telemetry Row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11.5px",
                      color: "#78716c",
                      background: "#fdfaf6",
                      padding: "7px 12px",
                      borderRadius: "10px",
                      border: "1px solid #f2e9df",
                      marginBottom: "16px",
                    }}
                  >
                    <span>
                      Vector Alignment:{" "}
                      <strong style={{ color: "#2f6b62" }}>
                        {Math.round(candidate.vectorSimilarity * 100)}%
                      </strong>
                    </span>
                    <span>
                      Attention Prob:{" "}
                      <strong style={{ color: "#2f6b62" }}>
                        {Math.round(candidate.modelProbability * 100)}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* View Profile Action */}
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(candidate)}
                  style={{
                    width: "100%",
                    padding: "11px",
                    background: "#e0663c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 3px 10px rgba(224, 102, 60, 0.25)",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#b8431b")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#e0663c")}
                >
                  View Connection Profile →
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Connection Detail Modal */}
      {selectedCandidate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31, 26, 23, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              maxWidth: "520px",
              width: "100%",
              padding: "32px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
              border: "1px solid #ebd9c8",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <img
                  src={selectedCandidate.photo}
                  alt={selectedCandidate.name}
                  style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #ebd9c8" }}
                />
                <div>
                  <h2 style={{ fontFamily: "'Newsreader', serif", fontSize: "24px", margin: 0, color: "#1f1a17" }}>
                    {selectedCandidate.name}, {selectedCandidate.age}
                  </h2>
                  <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "14px" }}>
                    📍 {selectedCandidate.city} • {selectedCandidate.occupation}
                  </p>
                </div>
              </div>

              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fbe3d6 0%, #fee2e2 100%)",
                  border: "2px solid #e0663c",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#b8431b",
                  fontWeight: 800,
                  fontSize: "15px",
                }}
              >
                <span>{selectedCandidate.matchScore}%</span>
                <span style={{ fontSize: "9px" }}>Match</span>
              </div>
            </div>

            <div style={{ background: "#faf6f0", padding: "16px", borderRadius: "14px", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "13px", textTransform: "uppercase", color: "#b8431b", letterSpacing: "0.5px" }}>
                About {selectedCandidate.name}
              </h4>
              <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.5, color: "#44403c" }}>
                {selectedCandidate.bio}
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "13px", textTransform: "uppercase", color: "#78716c", letterSpacing: "0.5px" }}>
                Shared Alignment & Passions
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedCandidate.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: "12.5px",
                      background: "#f0e9df",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      fontWeight: 600,
                      color: "#1f1a17",
                    }}
                  >
                    ★ {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  alert(`Connection invitation sent to ${selectedCandidate.name}!`)
                  setSelectedCandidate(null)
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#e0663c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Send Meaningful Prompt ✉
              </button>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                style={{
                  padding: "12px 18px",
                  background: "#f0e9df",
                  color: "#1f1a17",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloudinary Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
      />
    </div>
  )
}
