const express = require('express');
const router = express.Router();
const {
    createReview,
    getReviewsByService,
    getReviewsByProvider,
    getRecentReviews
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getRecentReviews);
router.post('/', protect, authorize('customer'), createReview);
router.get('/recent', getRecentReviews);
router.get('/service/:serviceId', getReviewsByService);
router.get('/provider/:providerId', getReviewsByProvider);

module.exports = router;
