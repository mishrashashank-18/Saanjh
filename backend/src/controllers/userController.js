const { z } = require('zod');
const User = require('../models/User');
const Profile = require('../models/Profile');
const UserInterests = require('../models/UserInterests');
const InterestAnswers = require('../models/InterestAnswers');
const GeneratedQuestions = require('../models/GeneratedQuestions');
const ResponseEvents = require('../models/ResponseEvents');
const EmailOtp = require('../models/EmailOtp');

function isAtLeast18(dobString) {
  if (!dobString) return true;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
  return dob <= cutoff;
}

// Strict allowlist for editable profile fields
const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  displayName: z.string().trim().max(100).optional(),
  mobileNumber: z.string().trim().optional(),
  dateOfBirth: z
    .string()
    .optional()
    .refine((val) => !val || isAtLeast18(val), {
      message: 'You must be at least 18 years old to join Saanjh',
    }),
  genderIdentity: z
    .enum(['woman', 'man', 'non-binary', 'other', 'prefer-not-to-say', ''])
    .optional(),
  bio: z.string().max(1000).optional(),
  city: z.string().trim().max(100).optional(),
  education: z.string().trim().max(100).optional(),
  occupation: z.string().trim().max(100).optional(),
  languages: z.array(z.string()).optional(),
  relationshipStatus: z.string().optional(),
  interests: z.array(z.string()).optional(),
  profilePhoto: z.string().optional(),
});

const updatePhotoSchema = z.object({
  photoUrl: z.string().optional(),
  profilePhoto: z.string().optional(),
}).refine((data) => data.photoUrl || data.profilePhoto, {
  message: 'Photo URL or image data is required',
});

/**
 * GET /api/users/me
 * Retrieve the current authenticated user's complete profile
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user.toJSON(),
  });
}

/**
 * PATCH /api/users/me
 * Update allowed fields on current user profile
 */
async function updateMe(req, res, next) {
  try {
    const validatedData = updateProfileSchema.parse(req.body);

    const user = req.user;

    // Apply allowed updates
    if (validatedData.fullName !== undefined) user.fullName = validatedData.fullName;
    if (validatedData.displayName !== undefined) user.displayName = validatedData.displayName;
    if (validatedData.mobileNumber !== undefined) user.mobileNumber = validatedData.mobileNumber;
    if (validatedData.dateOfBirth !== undefined) {
      user.dateOfBirth = validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null;
    }
    if (validatedData.genderIdentity !== undefined) user.genderIdentity = validatedData.genderIdentity;
    if (validatedData.bio !== undefined) user.bio = validatedData.bio;
    if (validatedData.city !== undefined) user.city = validatedData.city;
    if (validatedData.education !== undefined) user.education = validatedData.education;
    if (validatedData.occupation !== undefined) user.occupation = validatedData.occupation;
    if (validatedData.languages !== undefined) user.languages = validatedData.languages;
    if (validatedData.relationshipStatus !== undefined) user.relationshipStatus = validatedData.relationshipStatus;
    if (validatedData.interests !== undefined) user.interests = validatedData.interests;
    if (validatedData.profilePhoto !== undefined) user.profilePhoto = validatedData.profilePhoto;

    // Determine if profile is adequately completed
    const hasCoreDetails = Boolean(
      user.fullName &&
      user.city &&
      user.bio &&
      (user.dateOfBirth || user.age)
    );
    if (hasCoreDetails) {
      user.profileCompleted = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Your profile has been updated successfully.',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users/me/photo
 * Update user's profile photo
 */
async function updatePhoto(req, res, next) {
  try {
    const validatedData = updatePhotoSchema.parse(req.body);
    const photo = validatedData.photoUrl || validatedData.profilePhoto;

    const user = req.user;
    user.profilePhoto = photo;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully.',
      profilePhoto: user.profilePhoto,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/me/data (or /me/data)
 * Export and download user's complete data snapshot in JSON format
 */
async function downloadMyData(req, res, next) {
  try {
    const userId = req.user._id;

    const [profile, interests, answers, events] = await Promise.all([
      Profile.findOne({ userId }),
      UserInterests.findOne({ userId }),
      InterestAnswers.find({ userId }).sort({ category: 1, questionIndex: 1 }),
      ResponseEvents.find({ userId }).sort({ createdAt: 1 }),
    ]);

    const dataSnapshot = {
      exportTimestamp: new Date().toISOString(),
      user: req.user.toJSON(),
      profile: profile ? profile.toJSON() : null,
      interests: interests ? interests.toJSON() : null,
      questionAnswers: answers.map((a) => a.toJSON()),
      responseEvents: events.map((e) => ({
        stage: e.stage,
        field: e.field,
        value: e.value,
        previousValue: e.previousValue,
        source: e.source,
        createdAt: e.createdAt,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="saanjh_user_data_${userId}.json"`);
    return res.status(200).json(dataSnapshot);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/me (or /me)
 * Permanently deletes user account and all related records across all collections
 */
async function deleteMyAccount(req, res, next) {
  try {
    const userId = req.user._id;
    const email = req.user.email;

    await Promise.all([
      User.deleteOne({ _id: userId }),
      Profile.deleteMany({ userId }),
      UserInterests.deleteMany({ userId }),
      InterestAnswers.deleteMany({ userId }),
      GeneratedQuestions.deleteMany({ userId }),
      ResponseEvents.deleteMany({ userId }),
      EmailOtp.deleteMany({ email }),
    ]);

    // Clear auth cookies
    res.clearCookie('saanjh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.clearCookie('saanjh_refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated personal data have been permanently removed.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMe,
  updateMe,
  updatePhoto,
  downloadMyData,
  deleteMyAccount,
};
