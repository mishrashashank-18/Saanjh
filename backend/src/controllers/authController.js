const { z } = require('zod');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyGoogleIdToken } = require('../services/googleAuthService');
const { sendVerificationEmail } = require('../services/emailService');
const { createOtp, verifyOtp } = require('../services/otpService');

// Check minimum age of 18 years
function isAtLeast18(dobString) {
  if (!dobString) return false;
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
      .string({ required_error: 'Date of birth is required' })
      .refine(
        (val) => isAtLeast18(val),
        'You must be at least 18 years old to join Saanjh'
      ),
    genderIdentity: z
      .enum(['woman', 'man', 'non-binary', 'other', 'prefer-not-to-say'], {
        errorMap: () => ({ message: 'Please select a valid gender option' }),
      }),
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

const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

const resendOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .toLowerCase(),
});

const googleCompleteSchema = z.object({
  email: z.string().email().optional(),
  dateOfBirth: z
    .string({ required_error: 'Date of birth is required' })
    .refine((val) => isAtLeast18(val), 'You must be at least 18 years old to join Saanjh'),
  genderIdentity: z.enum(['woman', 'man', 'non-binary', 'other', 'prefer-not-to-say'], {
    errorMap: () => ({ message: 'Please select a valid gender option' }),
  }),
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

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000,
  });

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
    onboardingStep: user.onboardingStep,
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
    const email = validatedData.email.toLowerCase().trim();

    // Check if user already exists
    let existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(409).json({
          success: false,
          code: 'ACCOUNT_EXISTS',
          message: 'An account with this email already exists. Sign in instead.',
          field: 'email',
        });
      }

      // User exists but is unverified: update their details and resend OTP
      const passwordHash = await User.hashPassword(validatedData.password);
      existingUser.fullName = validatedData.fullName;
      existingUser.displayName = validatedData.fullName;
      existingUser.passwordHash = passwordHash;
      existingUser.mobileNumber = validatedData.mobileNumber || '';
      existingUser.dateOfBirth = new Date(validatedData.dateOfBirth);
      existingUser.genderIdentity = validatedData.genderIdentity;
      existingUser.onboardingStep = 'verify';
      await existingUser.save();

      // Generate OTP and email it
      const { rawCode } = await createOtp({ userId: existingUser._id, email: existingUser.email });
      try {
        await sendVerificationEmail({
          email: existingUser.email,
          fullName: existingUser.fullName,
          code: rawCode,
        });
      } catch (emailErr) {
        return res.status(500).json({
          success: false,
          code: 'EMAIL_SEND_FAILED',
          message: "Couldn't send the code, try again",
        });
      }

      return res.status(200).json({
        success: true,
        message: 'A fresh verification code has been sent to your email.',
        email: existingUser.email,
        onboardingStep: 'verify',
      });
    }

    // New user registration
    const passwordHash = await User.hashPassword(validatedData.password);
    const newUser = await User.create({
      fullName: validatedData.fullName,
      displayName: validatedData.fullName,
      email,
      passwordHash,
      mobileNumber: validatedData.mobileNumber || '',
      dateOfBirth: new Date(validatedData.dateOfBirth),
      genderIdentity: validatedData.genderIdentity,
      emailVerified: false,
      onboardingStep: 'verify',
      authProvider: 'local',
      lastLoginAt: new Date(),
    });

    // Generate OTP & email it
    const { rawCode } = await createOtp({ userId: newUser._id, email: newUser.email });
    try {
      await sendVerificationEmail({
        email: newUser.email,
        fullName: newUser.fullName,
        code: rawCode,
      });
    } catch (emailErr) {
      return res.status(500).json({
        success: false,
        code: 'EMAIL_SEND_FAILED',
        message: "Couldn't send the code, try again",
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Verification code sent to your email.',
      email: newUser.email,
      onboardingStep: 'verify',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/verify-otp
 */
async function verifyUserOtp(req, res, next) {
  try {
    const { email, code } = verifyOtpSchema.parse(req.body);

    const result = await verifyOtp({ email, code });

    if (!result.valid) {
      return res.status(result.statusCode || 400).json({
        success: false,
        code: 'INVALID_OTP',
        message: result.message,
      });
    }

    const user = await User.findById(result.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    user.emailVerified = true;
    if (user.onboardingStep === 'verify' || user.onboardingStep === 'signup') {
      user.onboardingStep = 'profile';
    }
    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(
      res,
      200,
      user,
      'Email verified successfully! Welcome to Saanjh.'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/resend-otp
 */
async function resendUserOtp(req, res, next) {
  try {
    const { email } = resendOtpSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal email non-existence, return generic success
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a new code has been sent.',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your email is already verified. Please sign in.',
      });
    }

    const { rawCode } = await createOtp({ userId: user._id, email: user.email });

    try {
      await sendVerificationEmail({
        email: user.email,
        fullName: user.fullName,
        code: rawCode,
      });
    } catch (emailErr) {
      return res.status(500).json({
        success: false,
        code: 'EMAIL_SEND_FAILED',
        message: "Couldn't send the code, try again",
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A fresh verification code has been sent to your email.',
    });
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

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please check your credentials.',
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'This account was created using Google Sign-In. Please click "Continue with Google".',
      });
    }

    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password. Please check your credentials.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.accountStatus}. Please contact Saanjh support.`,
      });
    }

    // Unverified users cannot log in: send them to verify with fresh OTP
    if (!user.emailVerified) {
      try {
        const { rawCode } = await createOtp({ userId: user._id, email: user.email });
        await sendVerificationEmail({
          email: user.email,
          fullName: user.fullName,
          code: rawCode,
        });
      } catch (e) {
        // Cooldown or Brevo error handled
      }

      return res.status(403).json({
        success: false,
        code: 'UNVERIFIED_EMAIL',
        onboardingStep: 'verify',
        email: user.email,
        message: 'Please verify your email address to continue. We have sent a verification code to your email.',
      });
    }

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
    const token = req.body.credential || req.body.idToken || req.body.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication credential is required.',
      });
    }

    const googleProfile = await verifyGoogleIdToken(token);

    let user = await User.findOne({
      $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }],
    });

    if (user) {
      user.googleId = googleProfile.googleId;
      user.emailVerified = true;
      user.lastLoginAt = new Date();
      if (!user.profilePhoto && googleProfile.profilePhoto) {
        user.profilePhoto = googleProfile.profilePhoto;
      }

      // Check if user has DOB and gender. If not, redirect to google_complete
      if (!user.dateOfBirth || !user.genderIdentity) {
        user.onboardingStep = 'google_complete';
      }
      await user.save({ validateBeforeSave: false });

      return sendAuthResponse(res, 200, user, 'Logged in successfully with Google.');
    }

    // Create new Google user
    user = await User.create({
      fullName: googleProfile.fullName,
      displayName: googleProfile.fullName,
      email: googleProfile.email,
      googleId: googleProfile.googleId,
      emailVerified: true,
      authProvider: 'google',
      profilePhoto: googleProfile.profilePhoto,
      passwordHash: null,
      onboardingStep: 'google_complete',
      lastLoginAt: new Date(),
    });

    return sendAuthResponse(res, 201, user, 'Welcome to Saanjh! Please complete your account details.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/google-complete
 * Supplies DOB (18+) & gender for Google signups
 */
async function completeGoogleProfile(req, res, next) {
  try {
    const validatedData = googleCompleteSchema.parse(req.body);
    let user = req.user;

    // Fallback: If cookies were blocked, lookup by verified Google email
    if (!user && validatedData.email) {
      user = await User.findOne({
        email: validatedData.email.toLowerCase().trim(),
        authProvider: 'google',
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Please log in to continue.',
      });
    }

    user.dateOfBirth = new Date(validatedData.dateOfBirth);
    user.genderIdentity = validatedData.genderIdentity;
    if (user.onboardingStep === 'google_complete' || user.onboardingStep === 'verify') {
      user.onboardingStep = 'profile';
    }
    await user.save();

    return sendAuthResponse(
      res,
      200,
      user,
      'Account details saved successfully.'
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
    onboardingStep: req.user.onboardingStep,
  });
}

module.exports = {
  signup,
  verifyUserOtp,
  resendUserOtp,
  login,
  googleAuth,
  completeGoogleProfile,
  logout,
  getCurrentUser,
};
