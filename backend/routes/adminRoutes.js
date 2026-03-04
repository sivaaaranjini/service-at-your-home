const express = require('express');
const router = express.Router();
const { getUsers, approveProvider, deleteUser, getAllBookings, getRevenue } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/users', protect, authorize('admin'), getUsers);
router.put('/approve-provider/:id', protect, authorize('admin'), approveProvider);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.get('/bookings', protect, authorize('admin'), getAllBookings);
router.get('/revenue', protect, authorize('admin'), getRevenue);

module.exports = router;
