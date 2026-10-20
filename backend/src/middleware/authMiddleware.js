const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to require authentication via JWT (Cookie or Authorization Bearer header)
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Check Authorization header fallback
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
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

    // Verify user still exists in database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this session no longer exists.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
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
 * Optional authentication: attaches user if valid token present, otherwise continues as guest
 */
async function optionalAuth(req, res, next) {
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

    if (token) {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET || 'saanjh_dev_access_secret_fallback_key';
      try {
        const decoded = jwt.verify(token, accessSecret);
        const user = await User.findById(decoded.userId);
        if (user && user.accountStatus === 'active') {
          req.user = user;
        }
      } catch {
        // Silently ignore invalid optional tokens
      }
    }
    next();
  } catch {
    next();
  }
}

/**
 * Role-based authorization middleware
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions to access this resource.',
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
};
