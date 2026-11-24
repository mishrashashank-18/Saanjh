const User = require("../models/User")
const Profile = require("../models/Profile")
const UserInterests = require("../models/UserInterests")
const InterestAnswers = require("../models/InterestAnswers")
const GeneratedQuestions = require("../models/GeneratedQuestions")
const ResponseEvents = require("../models/ResponseEvents")
const EmailOtp = require("../models/EmailOtp")
const matchmakerService = require("../services/matchmakerService")

/**
 * GET /api/admin/users
 * Retrieve all registered users with filtering, sorting, and aggregate KPI statistics
 */
async function getUsers(req, res, next) {
  try {
    const {
      search,
      role,
      status,
      emailVerified,
      onboardingStep,
      authProvider,
      activityFilter,
      sortBy = "lastLoginAt",
      sortOrder = "desc",
    } = req.query

    // Build query filter
    const query = {}

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [
        { fullName: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex },
        { city: searchRegex },
        { occupation: searchRegex },
      ]
    }

    if (role && ["user", "admin"].includes(role)) {
      query.role = role
    }

    if (status && ["active", "suspended", "deactivated"].includes(status)) {
      query.accountStatus = status
    }

    if (emailVerified !== undefined && emailVerified !== "") {
      query.emailVerified = emailVerified === "true" || emailVerified === true
    }

    if (onboardingStep && onboardingStep.trim()) {
      query.onboardingStep = onboardingStep.trim()
    }

    if (authProvider && ["local", "google"].includes(authProvider)) {
      query.authProvider = authProvider
    }

    const now = new Date()
    if (activityFilter === "online") {
      // Logged in within last 30 minutes
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)
      query.lastLoginAt = { $gte: thirtyMinsAgo }
    } else if (activityFilter === "today") {
      // Logged in in last 24 hours
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      query.lastLoginAt = { $gte: twentyFourHoursAgo }
    } else if (activityFilter === "7days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      query.lastLoginAt = { $gte: sevenDaysAgo }
    } else if (activityFilter === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      query.lastLoginAt = { $gte: thirtyDaysAgo }
    } else if (activityFilter === "inactive") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      query.$or = [
        { lastLoginAt: { $lt: thirtyDaysAgo } },
        { lastLoginAt: { $exists: false } },
        { lastLoginAt: null },
      ]
    }

    // Sort order
    const direction = sortOrder === "asc" ? 1 : -1
    const sort = { [sortBy]: direction }

    // Fetch filtered users
    const users = await User.find(query).sort(sort).lean()

    // Compute aggregate statistics across the entire database
    const allUsers = await User.find({}).lean()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)

    const stats = {
      totalUsers: allUsers.length,
      activeToday: allUsers.filter(
        (u) => u.lastLoginAt && new Date(u.lastLoginAt) >= twentyFourHoursAgo,
      ).length,
      activeRecently: allUsers.filter(
        (u) => u.lastLoginAt && new Date(u.lastLoginAt) >= thirtyMinsAgo,
      ).length,
      verifiedCount: allUsers.filter((u) => u.emailVerified).length,
      unverifiedCount: allUsers.filter((u) => !u.emailVerified).length,
      completedOnboardingCount: allUsers.filter(
        (u) => u.onboardingStep === "done" || u.profileCompleted,
      ).length,
      googleUsersCount: allUsers.filter((u) => u.authProvider === "google")
        .length,
      localUsersCount: allUsers.filter((u) => u.authProvider === "local")
        .length,
      adminCount: allUsers.filter((u) => u.role === "admin").length,
    }

    // Format output
    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      fullName: u.fullName,
      displayName: u.displayName || u.fullName,
      email: u.email,
      role: u.role || "user",
      accountStatus: u.accountStatus || "active",
      emailVerified: Boolean(u.emailVerified),
      onboardingStep: u.onboardingStep || "verify",
      authProvider: u.authProvider || "local",
      profilePhoto: u.profilePhoto || "",
      city: u.city || "",
      dateOfBirth: u.dateOfBirth,
      genderIdentity: u.genderIdentity || "",
      occupation: u.occupation || "",
      education: u.education || "",
      bio: u.bio || "",
      languages: u.languages || [],
      interests: u.interests || [],
      relationshipStatus: u.relationshipStatus || "",
      profileCompleted: Boolean(u.profileCompleted),
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))

    return res.status(200).json({
      success: true,
      stats,
      count: formattedUsers.length,
      users: formattedUsers,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/users/:userId
 * Retrieve full details for an individual user, including Profile and Interactivity data
 */
async function getUserDetails(req, res, next) {
  try {
    const { userId } = req.params

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      })
    }

    const [profile, userInterests, answersCount] = await Promise.all([
      Profile.findOne({ userId }),
      UserInterests.findOne({ userId }),
      InterestAnswers.countDocuments({ userId }),
    ])

    return res.status(200).json({
      success: true,
      user: user.toJSON(),
      profile: profile ? profile.toJSON() : null,
      interests: userInterests ? userInterests.toJSON() : null,
      answersCount,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/admin/users/:userId
 * Permanently deletes the user and ALL associated records across all database collections
 */
async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or already deleted from database.",
      })
    }

    // Safety guard: prevent admin from deleting their own account via the admin panel
    if (req.user && req.user._id.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot delete your own logged-in admin account from the admin monitor.",
      })
    }

    const userEmail = user.email
    const userName = user.fullName

    // Permanently purge all data from MongoDB across all collections
    const [
      userDelete,
      profileDelete,
      interestsDelete,
      answersDelete,
      questionsDelete,
      eventsDelete,
      otpDelete,
    ] = await Promise.all([
      User.deleteOne({ _id: userId }),
      Profile.deleteMany({ userId }),
      UserInterests.deleteMany({ userId }),
      InterestAnswers.deleteMany({ userId }),
      GeneratedQuestions.deleteMany({ userId }),
      ResponseEvents.deleteMany({ userId }),
      EmailOtp.deleteMany({ $or: [{ userId }, { email: userEmail }] }),
    ])

    return res.status(200).json({
      success: true,
      message: `User "${userName}" (${userEmail}) has been permanently deleted from the database.`,
      deletedUserId: userId,
      recordsPurged: {
        user: userDelete.deletedCount,
        profiles: profileDelete.deletedCount,
        interests: interestsDelete.deletedCount,
        answers: answersDelete.deletedCount,
        generatedQuestions: questionsDelete.deletedCount,
        responseEvents: eventsDelete.deletedCount,
        otps: otpDelete.deletedCount,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/users/:userId/role
 * Update user role (e.g. promote to admin or demote to user)
 */
async function updateUserRole(req, res, next) {
  try {
    const { userId } = req.params
    const { role } = req.body

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Must be either "user" or "admin".',
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      })
    }

    user.role = role
    await user.save({ validateBeforeSave: false })

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to "${role}".`,
      user: user.toJSON(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/users/:userId/status
 * Update user account status (active, suspended, deactivated)
 */
async function updateUserStatus(req, res, next) {
  try {
    const { userId } = req.params
    const { status } = req.body

    if (!["active", "suspended", "deactivated"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid status. Must be "active", "suspended", or "deactivated".',
      })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      })
    }

    user.accountStatus = status
    await user.save({ validateBeforeSave: false })

    return res.status(200).json({
      success: true,
      message: `User account status updated to "${status}".`,
      user: user.toJSON(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/qdrant/status
 */
async function getQdrantStatus(req, res, next) {
  try {
    const result = await matchmakerService.getEngineStatus()
    return res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/qdrant/sync
 */
async function syncQdrant(req, res, next) {
  try {
    const result = await matchmakerService.syncAllVectors()
    return res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getUsers,
  getUserDetails,
  deleteUser,
  updateUserRole,
  updateUserStatus,
  getQdrantStatus,
  syncQdrant,
}
