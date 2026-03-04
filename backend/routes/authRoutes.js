const express = require('express');
const router = express.Router();
const { registerUser, verifyOtp, loginUser, getTopProviders } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.get('/top-providers', getTopProviders);

module.exports = router;
