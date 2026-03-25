const express = require('express');
const router = express.Router();
const { getOffers, createOffer, deleteOffer } = require('../controllers/offerController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getOffers);
router.post('/', protect, authorize('admin'), createOffer);
router.delete('/:id', protect, authorize('admin'), deleteOffer);

module.exports = router;
