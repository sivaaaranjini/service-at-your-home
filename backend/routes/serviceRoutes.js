const express = require('express');
const router = express.Router();
const {
    getServices,
    createService,
    updateService,
    deleteService,
    getMyServices,
    getServiceById,
} = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getServices);
router.get('/my-services', protect, authorize('provider'), getMyServices);
router.get('/:id', getServiceById);
router.post('/', protect, authorize('provider', 'admin'), createService);
router.put('/:id', protect, authorize('provider', 'admin'), updateService);
router.delete('/:id', protect, authorize('provider', 'admin'), deleteService);

module.exports = router;
