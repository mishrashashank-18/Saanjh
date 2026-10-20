const { z } = require('zod');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyGoogleIdToken } = require('../services/googleAuthService');

// Minimum age requirement for dating/matchmaking: 18 years
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

// 1. Zod Validation Schemas
const signupSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please enter a valid email address')
      .toLowerCase(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        'Password must contain at least one letter and one number'
      ),
    confirmPassword: z.string().optional(),
    mobileNumber: z.string().trim().optional(),
    dateOfBirth: z
      .string()
      .optional()
      .refine(
        (val) => !val || isAtLeast18(val),
        'You must be at least 18 years old to join Saanjh'
      ),
    genderIdentity: z
      .enum(['woman', 'man', 'non-binary', 'other', 'prefer-not-to-say', ''], {
        errorMap: () => ({ message: 'Please select a valid gender option' }),
      })
      .optional(),
    termsAccepted: z
      .boolean({
        required_error: 'You must accept the terms and privacy policy',
      })
      .refine((val) => val === true, 'You must accept the terms and privacy policy'),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.confirmPassword !== data.password) {
        return false;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

const googleAuthSchema = z.object({
  credential: z.string().optional(),
  idToken: z.string().optional(),
  token: z.string().optional(),
});

// 2. Token & Cookie Helpers
function generateTokens(user) {
  const accessSecret =
    process.env.JWT_ACCESS_SECRET || 'saanjh_dev_access_secret_fallback_key';
  const refreshSecret =
    process.env.JWT_REFRESH_SECRET || 'saanjh_dev_refresh_secret_fallback_key';

  const accessToken = jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    accessSecret,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    refreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

function setTokenCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  // 1-hour access token cookie
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000,
  });

  // 7-day refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function sendAuthResponse(res, statusCode, user, message) {
  const { accessToken, refreshToken } = generateTokens(user);
  setTokenCookies(res, accessToken, refreshToken);

  return res.status(statusCode).json({
    success: true,
    message,
    user: user.toJSON(),
    accessToken,
  });
}

// 3. Controller Actions

/**
 * POST /api/auth/signup
 */
async function signup(req, res, next) {
  try {
    const validatedData = signupSchema.parse(req.body);

    // Normalize email
    const email = validatedData.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in instead.',
        field: 'email',
      });
    }

    // Hash the password securely
    const passwordHash = await User.hashPassword(validatedData.password);

    // Prepare birth date if provided
    let dateOfBirth = null;
    if (validatedData.dateOfBirth) {
      dateOfBirth = new Date(validatedData.dateOfBirth);
    }

    // Create user record
    const newUser = await User.create({
      fullName: validatedData.fullName,
      displayName: validatedData.fullName,
      email,
      passwordHash,
      mobileNumber: validatedData.mobileNumber || '',
      dateOfBirth,
      genderIdentity: validatedData.genderIdentity || '',
      emailVerified: false,
      profileCompleted: false,
      lastLoginAt: new Date(),
    });

    return sendAuthResponse(
      res,
      201,
      newUser,
      'Welcome to Saanjh! Your account has been created successfully.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const email = validatedData.email.toLowerCase().trim();

    // Query user including passwordHash for comparison
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please check your credentials.',
      });
    }

    // Check if user is Google-only account without password
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message:
          'This account was created using Google Sign-In. Please click "Continue with Google" to sign in.',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please check your credentials.',
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.accountStatus}. Please contact Saanjh support.`,
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    return sendAuthResponse(
      res,
      200,
      user,
      'Welcome back! You have logged in successfully.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/google
 */
async function googleAuth(req, res, next) {
  try {
    const validatedData = googleAuthSchema.parse(req.body);
    const token =
      validatedData.credential ||
      validatedData.idToken ||
      validatedData.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication credential is required.',
      });
    }

    // Verify token with official Google client
    const googleProfile = await verifyGoogleIdToken(token);

    // 1. Check if user already exists by googleId
    let user = await User.findOne({ googleId: googleProfile.googleId });

    if (user) {
      // Existing Google user: update login time and photo if empty
      user.lastLoginAt = new Date();
      if (!user.profilePhoto && googleProfile.profilePhoto) {
        user.profilePhoto = googleProfile.profilePhoto;
      }
      user.emailVerified = true;
      await user.save({ validateBeforeSave: false });

      return sendAuthResponse(
        res,
        200,
        user,
        'Logged in successfully with Google.'
      );
    }

    // 2. Check if user exists by verified email (linking Google ID)
    user = await User.findOne({ email: googleProfile.email });

    if (user) {
      // Link Google ID to existing email account without overriding existing password
      user.googleId = googleProfile.googleId;
      user.emailVerified = true;
      user.lastLoginAt = new Date();
      if (!user.profilePhoto && googleProfile.profilePhoto) {
        user.profilePhoto = googleProfile.profilePhoto;
      }
      await user.save({ validateBeforeSave: false });

      return sendAuthResponse(
        res,
        200,
        user,
        'Your Google account has been connected and you are logged in.'
      );
    }

    // 3. New user registration via Google
    user = await User.create({
      fullName: googleProfile.fullName,
      displayName: googleProfile.fullName,
      email: googleProfile.email,
      googleId: googleProfile.googleId,
      emailVerified: googleProfile.emailVerified,
      profilePhoto: googleProfile.profilePhoto,
      passwordHash: null,
      profileCompleted: false,
      lastLoginAt: new Date(),
    });

    return sendAuthResponse(
      res,
      201,
      user,
      'Welcome to Saanjh! Your account was created with Google.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}

/**
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user.toJSON(),
  });
}

module.exports = {
  signup,
  login,
  googleAuth,
  logout,
  getCurrentUser,
};
