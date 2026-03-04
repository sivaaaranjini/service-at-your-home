const express = require('express');
const router = express.Router();
const { getMessages, createMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:bookingId', protect, getMessages);
router.post('/', protect, createMessage);

module.exports = router;
