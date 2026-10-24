const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, optionalAuth, csrfProtection } = require('../middleware/authMiddleware');

const router = express.Router();

// General auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please take a calm breath and try again after 15 minutes.',
  },
});

// Stricter rate limiter for OTP verification attempts (per IP)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts from this IP. Please wait 15 minutes before trying again.',
  },
});

router.post('/signup', authLimiter, csrfProtection, authController.signup);
router.post('/verify-otp', otpLimiter, csrfProtection, authController.verifyUserOtp);
router.post('/resend-otp', otpLimiter, csrfProtection, authController.resendUserOtp);
router.post('/login', authLimiter, csrfProtection, authController.login);
router.post('/google', authLimiter, csrfProtection, authController.googleAuth);
router.post('/google-complete', optionalAuth, csrfProtection, authController.completeGoogleProfile);
router.post('/logout', csrfProtection, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
