const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', userController.getMe);
router.get('/me/data', userController.downloadMyData);
router.delete('/me', userController.deleteMyAccount);
router.patch('/me', userController.updateMe);
router.post('/me/photo', userController.updatePhoto);

module.exports = router;
