const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getMyPayouts, requestPayout } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/my-payouts', protect, authorize('provider'), getMyPayouts);
router.post('/request-payout', protect, authorize('provider'), requestPayout);

module.exports = router;
