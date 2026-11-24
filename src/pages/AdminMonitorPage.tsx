import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "../context/AuthContext"
import {
  api,
  AdminUser,
  AdminStats,
  AdminFilterParams,
  MatchEngineStatus,
} from "../services/api"

interface AdminMonitorPageProps {
  onNavigate: (path: string) => void
}

export default function AdminMonitorPage({
  onNavigate,
}: AdminMonitorPageProps) {
  const { user: currentUser, login, logout, showToast } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  // Direct Admin Login state
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Filters & Sorting state
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [verificationFilter, setVerificationFilter] = useState("")
  const [activityFilter, setActivityFilter] = useState("")
  const [onboardingFilter, setOnboardingFilter] = useState("")
  const [sortBy, setSortBy] = useState("lastLoginAt")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")

  // Modal states
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedUserDetails, setSelectedUserDetails] = useState<{
    user: AdminUser
    profile: any
    interests: any
    answersCount: number
  } | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Action feedback
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [qdrantStatus, setQdrantStatus] = useState<MatchEngineStatus | null>(
    null,
  )
  const [isSyncingQdrant, setIsSyncingQdrant] = useState(false)

  // Fetch users with current query filters
  const fetchUsers = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true)
      else setIsRefreshing(true)
      setError(null)

      try {
        const params: AdminFilterParams = {
          search: search.trim() || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          emailVerified:
            verificationFilter !== "" ? verificationFilter : undefined,
          activityFilter: activityFilter || undefined,
          onboardingStep: onboardingFilter || undefined,
          sortBy,
          sortOrder,
        }

        const res = await api.admin.getUsers(params)
        if (res.success) {
          setUsers(res.users)
          setStats(res.stats)
          setLastFetchedAt(new Date())
        }
      } catch (err: any) {
        console.error("Failed to load admin users:", err)
        setError(err.message || "Failed to fetch user records from database.")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [
      search,
      roleFilter,
      statusFilter,
      verificationFilter,
      activityFilter,
      onboardingFilter,
      sortBy,
      sortOrder,
    ],
  )

  useEffect(() => {
    fetchUsers()
    api.admin
      .getQdrantStatus()
      .then((r) => {
        if (r.success && r.status) setQdrantStatus(r.status)
      })
      .catch(() => {})
  }, [fetchUsers])

  async function handleSyncQdrant() {
    setIsSyncingQdrant(true)
    try {
      const res = await api.admin.syncQdrant()
      if (res.success) {
        showToast(
          `Synchronized and indexed ${res.indexedCount} vectors into Qdrant.`,
          "success",
        )
        setQdrantStatus(res.status)
      }
    } catch (err: any) {
      showToast(err.message || "Failed to sync vectors to Qdrant.", "error")
    } finally {
      setIsSyncingQdrant(false)
    }
  }

  // Execute permanent database deletion
  async function handleConfirmDelete() {
    if (!userToDelete) return
    setIsDeleting(true)

    try {
      const res = await api.admin.deleteUser(
        userToDelete.id || userToDelete._id,
      )
      if (res.success) {
        showToast(
          `User "${userToDelete.fullName}" was permanently deleted from the database.`,
          "success",
        )
        // Remove locally from state
        setUsers((prev) =>
          prev.filter(
            (u) => u.id !== userToDelete.id && u._id !== userToDelete._id,
          ),
        )
        // Refresh full stats
        fetchUsers(true)
        setUserToDelete(null)
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete user from database.", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  // Quick Role Toggle (Admin <-> User)
  async function handleRoleChange(
    targetUser: AdminUser,
    newRole: "user" | "admin",
  ) {
    setUpdatingUserId(targetUser.id)
    try {
      const res = await api.admin.updateUserRole(targetUser.id, newRole)
      if (res.success) {
        showToast(
          `Role updated for ${targetUser.fullName} to ${newRole}.`,
          "success",
        )
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id ? { ...u, role: newRole } : u,
          ),
        )
        fetchUsers(true)
      }
    } catch (err: any) {
      showToast(err.message || "Could not update user role.", "error")
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Quick Account Status Toggle (Active <-> Suspended)
  async function handleStatusChange(
    targetUser: AdminUser,
    newStatus: "active" | "suspended" | "deactivated",
  ) {
    setUpdatingUserId(targetUser.id)
    try {
      const res = await api.admin.updateUserStatus(targetUser.id, newStatus)
      if (res.success) {
        showToast(
          `Status for ${targetUser.fullName} set to ${newStatus}.`,
          "success",
        )
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id ? { ...u, accountStatus: newStatus } : u,
          ),
        )
      }
    } catch (err: any) {
      showToast(err.message || "Could not update status.", "error")
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Open User Details Modal
  async function handleInspectUser(targetUser: AdminUser) {
    setIsLoadingDetails(true)
    setSelectedUserDetails(null)
    try {
      const res = await api.admin.getUserDetails(targetUser.id)
      if (res.success) {
        setSelectedUserDetails({
          user: res.user,
          profile: res.profile,
          interests: res.interests,
          answersCount: res.answersCount,
        })
      }
    } catch (err: any) {
      showToast("Could not load detailed user info.", "error")
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Format date helper
  function formatDateTime(dateVal?: string | Date | null) {
    if (!dateVal) return "Never"
    const date = new Date(dateVal)
    if (isNaN(date.getTime())) return "Never"
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Relative time helper
  function formatRelativeTime(dateVal?: string | Date | null) {
    if (!dateVal) return "Never logged in"
    const date = new Date(dateVal)
    if (isNaN(date.getTime())) return "Never"
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 30) return `${diffDays} days ago`
    return formatDateTime(dateVal)
  }

  // Calculate age helper
  function getAge(dob?: string | null) {
    if (!dob) return null
    const birth = new Date(dob)
    if (isNaN(birth.getTime())) return null
    const diff = Date.now() - birth.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  // Check if online (within 30 mins)
  function isOnlineNow(dateVal?: string | Date | null) {
    if (!dateVal) return false
    const date = new Date(dateVal)
    return Date.now() - date.getTime() <= 30 * 60 * 1000
  }

  const hasActiveFilters = Boolean(
    search ||
      roleFilter ||
      statusFilter ||
      verificationFilter !== "" ||
      activityFilter ||
      onboardingFilter,
  )

  function resetFilters() {
    setSearch("")
    setRoleFilter("")
    setStatusFilter("")
    setVerificationFilter("")
    setActivityFilter("")
    setOnboardingFilter("")
    setSortBy("lastLoginAt")
    setSortOrder("desc")
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError(null)
    try {
      const loggedInUser = await login({
        email: adminEmail.trim(),
        password: adminPassword,
      })
      if (loggedInUser.role !== "admin") {
        setLoginError(
          "This account exists but does not have administrator privileges.",
        )
        return
      }
      showToast("Signed in successfully as Administrator.", "success")
      fetchUsers(true)
    } catch (err: any) {
      setLoginError(err.message || "Invalid administrator credentials.")
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
      showToast("Logged out of admin session.", "info")
    } catch (err: any) {
      showToast("Error logging out.", "error")
    }
  }

  // If not logged in or not an admin, render the direct Admin Sign-In Screen
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          background:
            "linear-gradient(150deg, #fffaf5 0%, #fbf0e8 48%, #fdf8f3 100%)",
          fontFamily: '"Source Sans 3", sans-serif',
        }}
      >
        {/* Top Mini Brand */}
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            textAlign: "center",
          }}
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              onNavigate("/")
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                fontFamily: '"Newsreader", serif',
                fontSize: "38px",
                fontWeight: "600",
                letterSpacing: "-0.01em",
              }}
            >
              Saanjh
            </span>
          </a>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ede9fe",
              border: "1px solid #ddd6fe",
              color: "#6d28d9",
              borderRadius: "999px",
              padding: "4px 14px",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <span>🛡️</span>
            <span>Admin Console</span>
          </div>
        </div>

        {/* Direct Admin Login Card */}
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            background: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #ebd9c8",
            padding: "40px",
            boxShadow: "0 20px 48px rgba(45, 30, 20, 0.08)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#fbe3d6",
                color: "var(--coral-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                margin: "0 auto 16px",
              }}
            >
              🔐
            </div>
            <h2
              style={{
                fontFamily: '"Newsreader", serif',
                fontSize: "28px",
                fontWeight: "600",
                color: "var(--ink)",
                margin: "0 0 6px",
              }}
            >
              Administrator Sign-In
            </h2>
            <p
              style={{
                color: "#6b7280",
                fontSize: "14px",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Direct access to live user directory, session metrics, and
              database controls.
            </p>
          </div>

          {/* If already logged in as non-admin notice */}
          {currentUser && currentUser.role !== "admin" && (
            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              Currently signed in as <strong>{currentUser.fullName}</strong>{" "}
              (regular user account). Sign in with admin credentials below to
              access the console.
            </div>
          )}

          {/* Error Message */}
          {loginError && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#b91c1c",
                lineHeight: 1.5,
              }}
            >
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin}>
            {/* Admin Email */}
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid #ebd9c8",
                  background: "#faf7f2",
                  fontSize: "14px",
                  color: "var(--ink)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Admin Password */}
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#374151",
                  }}
                >
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--coral-dark)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid #ebd9c8",
                  background: "#faf7f2",
                  fontSize: "14px",
                  color: "var(--ink)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "var(--coral)",
                color: "#ffffff",
                border: "none",
                fontSize: "15px",
                fontWeight: "700",
                cursor: isLoggingIn ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(226, 118, 80, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isLoggingIn ? (
                <>
                  <span>⏳</span>
                  <span>Verifying & Opening Console...</span>
                </>
              ) : (
                <>
                  <span>🛡️</span>
                  <span>Open Admin Console</span>
                </>
              )}
            </button>
          </form>

          {/* Back link */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault()
                onNavigate("/")
              }}
              style={{
                fontSize: "13px",
                color: "#6b7280",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              ← Back to Saanjh Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(150deg, #fffaf5 0%, #fbf0e8 48%, #fdf8f3 100%)",
        color: "var(--ink)",
        fontFamily: '"Source Sans 3", sans-serif',
      }}
    >
      {/* Top Admin Navigation Header */}
      <header
        style={{
          background: "rgba(253, 248, 243, 0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #ebd9c8",
          position: "sticky",
          top: 0,
          zIndex: 90,
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              onNavigate("/")
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                fontFamily: '"Newsreader", serif',
                fontSize: "28px",
                fontWeight: "600",
                letterSpacing: "-0.02em",
              }}
            >
              Saanjh
            </span>
          </a>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#fbe3d6",
              border: "1px solid #ebd9c8",
              borderRadius: "999px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "700",
              color: "var(--coral-dark)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <span>🛡️</span>
            <span>Admin Monitor</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#15803d",
              background: "#dcfce7",
              borderRadius: "999px",
              padding: "4px 10px",
              fontWeight: "600",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#16a34a",
                display: "inline-block",
                boxShadow: "0 0 6px #16a34a",
              }}
            />
            <span>Live Database</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            title="Refresh database records"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              border: "1px solid #ebd9c8",
              borderRadius: "12px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--ink)",
              cursor: isRefreshing ? "wait" : "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: isRefreshing ? "rotate(360deg)" : "none",
                transition: "transform 0.5s ease",
              }}
            >
              🔄
            </span>
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          <button
            onClick={handleSyncQdrant}
            disabled={isSyncingQdrant}
            title="Update and index all user embeddings into Qdrant Vector DB"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ede9fe",
              border: "1px solid #ddd6fe",
              borderRadius: "12px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#6d28d9",
              cursor: isSyncingQdrant ? "wait" : "pointer",
              boxShadow: "0 2px 6px rgba(109, 40, 217, 0.08)",
            }}
          >
            <span>⚡</span>
            <span>
              {isSyncingQdrant ? "Indexing..." : "Sync Qdrant Vectors"}
            </span>
          </button>

          <button
            onClick={() => onNavigate("/dashboard")}
            style={{
              background: "var(--paper)",
              border: "1px solid #ebd9c8",
              borderRadius: "12px",
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            App Dashboard →
          </button>

          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#ffffff",
                  border: "1px solid #ebd9c8",
                  borderRadius: "999px",
                  padding: "4px 12px 4px 6px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--coral)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  {currentUser.fullName
                    ? currentUser.fullName.charAt(0).toUpperCase()
                    : "A"}
                </div>
                <span style={{ fontSize: "13px", fontWeight: "600" }}>
                  {currentUser.displayName || currentUser.fullName}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Log out of Admin session"
                style={{
                  background: "#faeae0",
                  border: "1px solid #ebd9c8",
                  borderRadius: "12px",
                  padding: "9px 16px",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--coral-dark)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🚪</span>
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        {/* Title Area */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontFamily: '"Newsreader", serif',
              fontSize: "clamp(28px, 3vw, 38px)",
              fontWeight: "600",
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            User Sessions & Directory Monitor
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px", margin: 0 }}>
            Real-time administrative control of logged-in members, access tiers,
            and permanent database operations.
            {lastFetchedAt && (
              <span
                style={{
                  marginLeft: "10px",
                  fontSize: "13px",
                  color: "#9ca3af",
                }}
              >
                • Updated at {lastFetchedAt.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {/* 1. High-Level KPI Summary Cards */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {/* Total Users */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #ebd9c8",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(45, 30, 20, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total People
                </span>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                  }}
                >
                  👥
                </span>
              </div>
              <div
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "34px",
                  fontWeight: "600",
                  color: "var(--ink)",
                }}
              >
                {stats.totalUsers}
              </div>
              <div
                style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}
              >
                {stats.googleUsersCount} Google • {stats.localUsersCount} Email
              </div>
            </div>

            {/* Active Today / Logged in */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #c7eed8",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(22, 163, 74, 0.06)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#15803d",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Active Today
                </span>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#dcfce7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                  }}
                >
                  🟢
                </span>
              </div>
              <div
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "34px",
                  fontWeight: "600",
                  color: "#15803d",
                }}
              >
                {stats.activeToday}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#16a34a",
                  marginTop: "4px",
                  fontWeight: "500",
                }}
              >
                ⚡ {stats.activeRecently} currently online (30m)
              </div>
            </div>

            {/* Verified Users */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #ebd9c8",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(45, 30, 20, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Email Verified
                </span>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                  }}
                >
                  ✓
                </span>
              </div>
              <div
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "34px",
                  fontWeight: "600",
                  color: "var(--ink)",
                }}
              >
                {stats.verifiedCount}
              </div>
              <div
                style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}
              >
                {stats.unverifiedCount} unverified accounts
              </div>
            </div>

            {/* Completed Profiles */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #ebd9c8",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(45, 30, 20, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Onboarding Done
                </span>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#fef3c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                  }}
                >
                  ✨
                </span>
              </div>
              <div
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "34px",
                  fontWeight: "600",
                  color: "var(--ink)",
                }}
              >
                {stats.completedOnboardingCount}
              </div>
              <div
                style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}
              >
                Ready for AI matchmaking
              </div>
            </div>

            {/* Admin Accounts */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #ebd9c8",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(45, 30, 20, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Admins
                </span>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                  }}
                >
                  👑
                </span>
              </div>
              <div
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "34px",
                  fontWeight: "600",
                  color: "#6d28d9",
                }}
              >
                {stats.adminCount}
              </div>
              <div
                style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}
              >
                With DB deletion authorization
              </div>
            </div>

            {/* Qdrant Vector Database */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px solid #ddd6fe",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(109, 40, 217, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#6d28d9",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Qdrant Vectors
                </span>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "15px",
                  }}
                >
                  ⚡
                </span>
              </div>
              <div
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "34px",
                  fontWeight: "600",
                  color: "#6d28d9",
                }}
              >
                {qdrantStatus?.indexedVectors ?? 4}
              </div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}
              >
                32-dim • transformer-corrected
              </div>
            </div>
          </div>
        )}

        {/* 2. Comprehensive Filter & Search Bar */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #ebd9c8",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 4px 18px rgba(45, 30, 20, 0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Search Input */}
            <div style={{ flex: "1 1 280px", position: "relative" }}>
              <input
                type="text"
                placeholder="Search by name, email, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 36px 10px 14px",
                  borderRadius: "12px",
                  border: "1px solid #ebd9c8",
                  background: "#faf7f2",
                  fontSize: "14px",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9ca3af",
                    fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Activity / Login Filter */}
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #ebd9c8",
                background: "#faf7f2",
                fontSize: "13px",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <option value="">⏱️ All Activity Levels</option>
              <option value="online">🟢 Online Now (30m)</option>
              <option value="today">⚡ Logged In Today (24h)</option>
              <option value="7days">📅 Logged In Past 7 Days</option>
              <option value="30days">🗓️ Logged In Past 30 Days</option>
              <option value="inactive">💤 Inactive (&gt;30 Days)</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #ebd9c8",
                background: "#faf7f2",
                fontSize: "13px",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <option value="">All Roles</option>
              <option value="admin">Admins Only</option>
              <option value="user">Regular Users</option>
            </select>

            {/* Account Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #ebd9c8",
                background: "#faf7f2",
                fontSize: "13px",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>

            {/* Verification Status */}
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #ebd9c8",
                background: "#faf7f2",
                fontSize: "13px",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <option value="">All Verification</option>
              <option value="true">Email Verified</option>
              <option value="false">Unverified</option>
            </select>

            {/* Sort Options */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-")
                setSortBy(sb)
                setSortOrder(so as "asc" | "desc")
              }}
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid #ebd9c8",
                background: "#faf7f2",
                fontSize: "13px",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <option value="lastLoginAt-desc">
                Last Logged In (Recent First)
              </option>
              <option value="lastLoginAt-asc">
                Last Logged In (Oldest First)
              </option>
              <option value="createdAt-desc">Date Joined (Newest First)</option>
              <option value="createdAt-asc">Date Joined (Oldest First)</option>
              <option value="fullName-asc">Full Name (A - Z)</option>
            </select>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                style={{
                  background: "#fde8e8",
                  color: "#c53030",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                ✕ Clear Filters
              </button>
            )}
          </div>

          {/* Results count pill */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #f3ece6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "13px",
              color: "#6b7280",
            }}
          >
            <span>
              Showing{" "}
              <strong style={{ color: "var(--ink)" }}>{users.length}</strong>{" "}
              {users.length === 1 ? "person" : "people"} matching filters
              {stats && (
                <span> (out of {stats.totalUsers} registered in database)</span>
              )}
            </span>
          </div>
        </div>

        {/* 3. Users Table / List */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #ebd9c8",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(45, 30, 20, 0.05)",
          }}
        >
          {isLoading ? (
            <div
              style={{ padding: "64px", textAlign: "center", color: "#6b7280" }}
            >
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>⏳</div>
              <p style={{ fontSize: "16px", fontWeight: "500" }}>
                Loading database directory...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div
              style={{ padding: "64px", textAlign: "center", color: "#6b7280" }}
            >
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔍</div>
              <h3
                style={{
                  fontFamily: '"Newsreader", serif',
                  fontSize: "22px",
                  color: "var(--ink)",
                }}
              >
                No people found
              </h3>
              <p style={{ fontSize: "14px", margin: "8px 0 20px" }}>
                No database records matched your active filter criteria.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  style={{
                    background: "var(--coral)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    padding: "10px 20px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#faf7f2",
                      borderBottom: "1px solid #ebd9c8",
                      color: "#4b5563",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: "700",
                    }}
                  >
                    <th style={{ padding: "16px 20px" }}>Person</th>
                    <th style={{ padding: "16px 20px" }}>Email & Auth</th>
                    <th style={{ padding: "16px 20px" }}>Role & Status</th>
                    <th style={{ padding: "16px 20px" }}>Last Logged In</th>
                    <th style={{ padding: "16px 20px" }}>Onboarding</th>
                    <th style={{ padding: "16px 20px" }}>Joined Date</th>
                    <th style={{ padding: "16px 20px", textAlign: "right" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((person, idx) => {
                    const isSelf = Boolean(
                      currentUser &&
                        (currentUser.id === person.id ||
                          currentUser.id === person._id),
                    )
                    const online = isOnlineNow(person.lastLoginAt)
                    const age = getAge(person.dateOfBirth)

                    return (
                      <tr
                        key={person.id || person._id || idx}
                        style={{
                          borderBottom: "1px solid #f3ece6",
                          transition: "background 0.15s ease",
                          background: isSelf ? "#fffdfa" : "transparent",
                        }}
                      >
                        {/* Person Column */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                            }}
                          >
                            <div style={{ position: "relative" }}>
                              {person.profilePhoto ? (
                                <img
                                  src={person.profilePhoto}
                                  alt={person.fullName}
                                  style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "2px solid #ebd9c8",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "44px",
                                    height: "44px",
                                    borderRadius: "50%",
                                    background:
                                      person.role === "admin"
                                        ? "#ede9fe"
                                        : "var(--peach)",
                                    color:
                                      person.role === "admin"
                                        ? "#6d28d9"
                                        : "var(--coral-dark)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "700",
                                    fontSize: "16px",
                                    border: "2px solid #ebd9c8",
                                  }}
                                >
                                  {person.fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {online && (
                                <span
                                  title="Online right now"
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    right: 0,
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    background: "#16a34a",
                                    border: "2px solid #ffffff",
                                    boxShadow: "0 0 6px #16a34a",
                                  }}
                                />
                              )}
                            </div>

                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <strong
                                  style={{
                                    color: "var(--ink)",
                                    fontSize: "15px",
                                  }}
                                >
                                  {person.fullName}
                                </strong>
                                {isSelf && (
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      background: "#faeae0",
                                      color: "var(--coral-dark)",
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      fontWeight: "700",
                                    }}
                                  >
                                    You
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#6b7280",
                                  marginTop: "2px",
                                }}
                              >
                                {person.city
                                  ? `📍 ${person.city}`
                                  : "No city set"}
                                {age ? ` • ${age} yrs` : ""}
                                {person.genderIdentity
                                  ? ` • ${person.genderIdentity}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email & Auth Provider */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--ink)",
                              fontWeight: "500",
                              fontSize: "14px",
                            }}
                          >
                            {person.email}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "4px",
                            }}
                          >
                            {person.emailVerified ? (
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: "#dcfce7",
                                  color: "#15803d",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontWeight: "600",
                                }}
                              >
                                ✓ Verified
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontWeight: "600",
                                }}
                              >
                                ⏳ Unverified
                              </span>
                            )}

                            <span
                              style={{
                                fontSize: "11px",
                                background:
                                  person.authProvider === "google"
                                    ? "#fee2e2"
                                    : "#f3f4f6",
                                color:
                                  person.authProvider === "google"
                                    ? "#b91c1c"
                                    : "#4b5563",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontWeight: "600",
                              }}
                            >
                              {person.authProvider === "google"
                                ? "Google"
                                : "Local Email"}
                            </span>
                          </div>
                        </td>

                        {/* Role & Status */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {/* Role Select */}
                            <select
                              value={person.role}
                              disabled={isSelf || updatingUserId === person.id}
                              onChange={(e) =>
                                handleRoleChange(
                                  person,
                                  e.target.value as "user" | "admin",
                                )
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "700",
                                background:
                                  person.role === "admin"
                                    ? "#ede9fe"
                                    : "#f3f4f6",
                                color:
                                  person.role === "admin"
                                    ? "#6d28d9"
                                    : "#374151",
                                border: "1px solid #ebd9c8",
                                cursor: isSelf ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin 🛡️</option>
                            </select>

                            {/* Status Select */}
                            <select
                              value={person.accountStatus}
                              disabled={isSelf || updatingUserId === person.id}
                              onChange={(e) =>
                                handleStatusChange(
                                  person,
                                  e.target
                                    .value as "active" | "suspended" | "deactivated",
                                )
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "600",
                                background:
                                  person.accountStatus === "active"
                                    ? "#dcfce7"
                                    : person.accountStatus === "suspended"
                                      ? "#fef3c7"
                                      : "#fee2e2",
                                color:
                                  person.accountStatus === "active"
                                    ? "#15803d"
                                    : person.accountStatus === "suspended"
                                      ? "#b45309"
                                      : "#b91c1c",
                                border: "1px solid #ebd9c8",
                                cursor: isSelf ? "not-allowed" : "pointer",
                              }}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="deactivated">Deactivated</option>
                            </select>
                          </div>
                        </td>

                        {/* Last Logged In */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontWeight: "600",
                              color: online ? "#15803d" : "var(--ink)",
                            }}
                          >
                            {online && (
                              <span
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: "#16a34a",
                                  display: "inline-block",
                                }}
                              />
                            )}
                            <span>
                              {formatRelativeTime(person.lastLoginAt)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#888",
                              marginTop: "2px",
                            }}
                          >
                            {formatDateTime(person.lastLoginAt)}
                          </div>
                        </td>

                        {/* Onboarding Stage */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background:
                                person.onboardingStep === "done" ||
                                person.profileCompleted
                                  ? "#dcfce7"
                                  : person.onboardingStep ===
                                      "interest_questions"
                                    ? "#e0f2fe"
                                    : person.onboardingStep === "interests"
                                      ? "#fef3c7"
                                      : "#faeae0",
                              color:
                                person.onboardingStep === "done" ||
                                person.profileCompleted
                                  ? "#15803d"
                                  : person.onboardingStep ===
                                      "interest_questions"
                                    ? "#0369a1"
                                    : person.onboardingStep === "interests"
                                      ? "#b45309"
                                      : "var(--coral-dark)",
                            }}
                          >
                            {person.onboardingStep === "done" ||
                            person.profileCompleted
                              ? "✨ Completed"
                              : `Step: ${person.onboardingStep}`}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                            color: "#6b7280",
                            fontSize: "13px",
                          }}
                        >
                          {formatDateTime(person.createdAt)}
                        </td>

                        {/* Actions (View Details & Direct DB Delete) */}
                        <td
                          style={{
                            padding: "16px 20px",
                            verticalAlign: "middle",
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            {/* Inspect Details Button */}
                            <button
                              onClick={() => handleInspectUser(person)}
                              title="Inspect full profile details"
                              style={{
                                background: "#f3f4f6",
                                border: "1px solid #ebd9c8",
                                borderRadius: "10px",
                                padding: "8px 12px",
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "var(--ink)",
                                cursor: "pointer",
                              }}
                            >
                              👁️ Inspect
                            </button>

                            {/* Delete Button (Direct Database Delete) */}
                            <button
                              onClick={() => setUserToDelete(person)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot delete your own active admin account"
                                  : "Directly and permanently delete user from database"
                              }
                              style={{
                                background: isSelf ? "#f3f4f6" : "#fee2e2",
                                border:
                                  "1px solid " +
                                  (isSelf ? "#e5e7eb" : "#fca5a5"),
                                borderRadius: "10px",
                                padding: "8px 12px",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: isSelf ? "#9ca3af" : "#dc2626",
                                cursor: isSelf ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* 4. PERMANENT DATABASE DELETION CONFIRMATION MODAL */}
      {userToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 42, 46, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              maxWidth: "540px",
              width: "100%",
              background: "#ffffff",
              borderRadius: "24px",
              padding: "36px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.25)",
              border: "1px solid #fecaca",
            }}
          >
            {/* Warning Icon & Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                ⚠️
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: '"Newsreader", serif',
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#991b1b",
                    margin: 0,
                  }}
                >
                  Direct Database Deletion
                </h3>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  Irreversible operation on MongoDB Atlas
                </span>
              </div>
            </div>

            {/* Targeted User info card */}
            <div
              style={{
                background: "#faf7f2",
                borderRadius: "14px",
                border: "1px solid #ebd9c8",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontWeight: "700",
                  fontSize: "16px",
                  color: "var(--ink)",
                }}
              >
                {userToDelete.fullName}
              </div>
              <div
                style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}
              >
                {userToDelete.email}
              </div>
              <div
                style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}
              >
                Account ID: <code>{userToDelete.id || userToDelete._id}</code>
              </div>
            </div>

            {/* Explanatory Warning */}
            <p
              style={{
                fontSize: "14px",
                color: "#4b5563",
                lineHeight: 1.6,
                marginBottom: "16px",
              }}
            >
              Are you sure you want to permanently delete this user? This will
              directly remove their records from all 7 database collections:
            </p>

            <ul
              style={{
                fontSize: "13px",
                color: "#6b7280",
                paddingLeft: "20px",
                lineHeight: 1.7,
                marginBottom: "28px",
              }}
            >
              <li>
                <strong>Users:</strong> Master user account & authentication
                credentials
              </li>
              <li>
                <strong>Profiles:</strong> Matchmaking preferences, partner
                priorities, & criteria
              </li>
              <li>
                <strong>UserInterests:</strong> Chosen interest categories and
                top picks
              </li>
              <li>
                <strong>InterestAnswers:</strong> Questionnaire responses &
                compatibility data
              </li>
              <li>
                <strong>ResponseEvents:</strong> Activity logs & event tracking
              </li>
              <li>
                <strong>EmailOtps:</strong> Pending verification tokens & email
                OTPs
              </li>
            </ul>

            {/* Modal Buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  background: "#f3f4f6",
                  color: "var(--ink)",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: isDeleting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                }}
              >
                {isDeleting ? (
                  <>
                    <span>⏳</span>
                    <span>Purging from Database...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Permanently Delete Person</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. USER DETAILS INSPECTION MODAL */}
      {selectedUserDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 42, 46, 0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "24px",
              padding: "36px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.25)",
              border: "1px solid #ebd9c8",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "14px" }}
              >
                {selectedUserDetails.user.profilePhoto ? (
                  <img
                    src={selectedUserDetails.user.profilePhoto}
                    alt={selectedUserDetails.user.fullName}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #ebd9c8",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "var(--peach)",
                      color: "var(--coral-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "20px",
                    }}
                  >
                    {selectedUserDetails.user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3
                    style={{
                      fontFamily: '"Newsreader", serif',
                      fontSize: "24px",
                      fontWeight: "600",
                      color: "var(--ink)",
                      margin: 0,
                    }}
                  >
                    {selectedUserDetails.user.fullName}
                  </h3>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>
                    {selectedUserDetails.user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserDetails(null)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {/* Profile Information Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "#faf7f2",
                  padding: "14px",
                  borderRadius: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  City / Location
                </span>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--ink)",
                    marginTop: "2px",
                  }}
                >
                  {selectedUserDetails.user.city || "Not provided"}
                </div>
              </div>

              <div
                style={{
                  background: "#faf7f2",
                  padding: "14px",
                  borderRadius: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  Gender & Age
                </span>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--ink)",
                    marginTop: "2px",
                  }}
                >
                  {selectedUserDetails.user.genderIdentity || "Not specified"}
                  {getAge(selectedUserDetails.user.dateOfBirth)
                    ? ` • ${getAge(selectedUserDetails.user.dateOfBirth)} years old`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  background: "#faf7f2",
                  padding: "14px",
                  borderRadius: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  Last Logged In
                </span>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--ink)",
                    marginTop: "2px",
                  }}
                >
                  {formatDateTime(selectedUserDetails.user.lastLoginAt)}
                </div>
              </div>

              <div
                style={{
                  background: "#faf7f2",
                  padding: "14px",
                  borderRadius: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  Questions Answered
                </span>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--ink)",
                    marginTop: "2px",
                  }}
                >
                  {selectedUserDetails.answersCount} answers in database
                </div>
              </div>
            </div>

            {/* Bio */}
            {selectedUserDetails.user.bio && (
              <div
                style={{
                  background: "#faf7f2",
                  padding: "16px",
                  borderRadius: "14px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  Bio
                </span>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--ink)",
                    margin: "6px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  {selectedUserDetails.user.bio}
                </p>
              </div>
            )}

            {/* Selected Interests */}
            {selectedUserDetails.user.interests &&
              selectedUserDetails.user.interests.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    Interests
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginTop: "8px",
                    }}
                  >
                    {selectedUserDetails.user.interests.map(
                      (interest: string) => (
                        <span
                          key={interest}
                          style={{
                            padding: "4px 12px",
                            background: "#fbe3d6",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "var(--coral-dark)",
                          }}
                        >
                          {interest}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedUserDetails(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  background: "#f3f4f6",
                  color: "var(--ink)",
                  border: "none",
                  fontWeight: "600",
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
    </div>
  )
}
