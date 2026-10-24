const express = require('express');
const onboardingController = require('../controllers/onboardingController');
const {
  authenticate,
  requireVerified,
  csrfProtection,
} = require('../middleware/authMiddleware');

const router = express.Router();

// Profile endpoints
router.get('/profile', authenticate, requireVerified, onboardingController.getProfile);
router.post('/profile', authenticate, requireVerified, csrfProtection, onboardingController.saveProfile);

// Interests endpoints
router.get('/interests/catalog', onboardingController.getCatalog);
router.get('/interests', authenticate, requireVerified, onboardingController.getUserInterests);
router.post('/interests', authenticate, requireVerified, csrfProtection, onboardingController.saveUserInterests);

// Interest Questions & Answers endpoints
router.get('/questions', authenticate, requireVerified, onboardingController.getQuestions);
router.post('/answers', authenticate, requireVerified, csrfProtection, onboardingController.saveAnswer);

// Settings (Profile & Interests edit)
router.get('/settings', authenticate, requireVerified, onboardingController.getSettings);
router.put('/settings/profile', authenticate, requireVerified, csrfProtection, onboardingController.saveProfile);
router.put('/settings/interests', authenticate, requireVerified, csrfProtection, onboardingController.saveUserInterests);

module.exports = router;
