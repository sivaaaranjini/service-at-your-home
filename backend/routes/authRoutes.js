const express = require('express');
const router = express.Router();
const { registerUser, verifyOtp, loginUser, getTopProviders, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.get('/top-providers', getTopProviders);
router.put('/profile', protect, updateProfile);

module.exports = router;
