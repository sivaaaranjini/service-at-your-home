const express = require('express');
const router = express.Router();
const {
    createBooking,
    getBookings,
    updateBookingStatus,
    verifyProviderArrival,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('customer'), createBooking);
router.get('/', protect, getBookings);
router.put('/:id/status', protect, authorize('provider', 'admin'), updateBookingStatus);
router.post('/verify-provider', protect, authorize('customer'), verifyProviderArrival);

module.exports = router;
