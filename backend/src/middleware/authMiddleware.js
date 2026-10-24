const jwt = require('jsonwebtoken');
const User = require('../models/User');

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8443',
  'https://saanjh-vj7v.onrender.com',
  'http://localhost:8443',
  'https://localhost:8443',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:8443',
  'https://127.0.0.1:8443',
  'http://127.0.0.1:5173',
];

/**
 * CSRF Protection Middleware
 * Verifies Origin / Referer for all state-changing HTTP methods
 */
function csrfProtection(req, res, next) {
  // Safe read-only methods are exempt
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // In test environment, skip CSRF check
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  if (origin) {
    const isAllowed = allowedOrigins.some(
      (allowed) => origin === allowed || origin.replace(/^https?:\/\//, '') === allowed.replace(/^https?:\/\//, '')
    );
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        code: 'CSRF_BLOCKED',
        message: 'Request blocked due to invalid origin.',
      });
    }
  } else if (referer) {
    const isAllowed = allowedOrigins.some((allowed) => referer.startsWith(allowed));
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        code: 'CSRF_BLOCKED',
        message: 'Request blocked due to invalid referer.',
      });
    }
  }

  next();
}

/**
 * Require valid JWT authentication (via Cookie or Bearer header)
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Please log in to continue.',
      });
    }

    const accessSecret =
      process.env.JWT_ACCESS_SECRET || 'saanjh_dev_access_secret_fallback_key';

    let decoded;
    try {
      decoded = jwt.verify(token, accessSecret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid session token. Please log in again.',
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account associated with this session no longer exists.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.accountStatus}. Please contact support.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Route guard: Require verified email
 * Unverified users cannot access onboarding or app features
 */
function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      code: 'UNVERIFIED_EMAIL',
      onboardingStep: 'verify',
      email: req.user.email,
      message: 'Please verify your email address to continue.',
    });
  }

  next();
}

/**
 * Route guard: Check user has completed prior onboarding steps
 */
const stepHierarchy = {
  signup: 0,
  verify: 1,
  google_complete: 1,
  profile: 2,
  interests: 3,
  interest_questions: 4,
  done: 5,
};

function requireStep(requiredStep) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userStepLevel = stepHierarchy[req.user.onboardingStep] || 0;
    const requiredLevel = stepHierarchy[requiredStep] || 0;

    if (userStepLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        code: 'STEP_NOT_COMPLETED',
        currentStep: req.user.onboardingStep,
        message: `Please complete the previous onboarding steps first.`,
      });
    }

    next();
  };
}

module.exports = {
  csrfProtection,
  authenticate,
  requireVerified,
  requireStep,
};
