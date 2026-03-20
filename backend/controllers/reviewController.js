const supabase = require('../config/supabaseClient');
const { createNotification } = require('./notificationController');

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private (Customer)
const createReview = async (req, res) => {
    const { bookingId, rating, comment } = req.body;

    try {
        // 1. Get Booking to verify customer and get provider/service IDs
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select(`
                customer_id, 
                provider_id, 
                service_id, 
                status,
                serviceId:service_id(service_name)
            `)
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // 2. Security Check: Only the customer who booked it can review it
        if (booking.customer_id !== req.user._id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // 3. Status Check: Only completed or paid bookings can be reviewed
        if (booking.status !== 'Completed' && booking.status !== 'Paid') {
            return res.status(400).json({ message: 'Only paid or completed services can be reviewed' });
        }

        // 4. Create Review
        const { data: review, error: insertError } = await supabase
            .from('reviews')
            .insert([{
                booking_id: bookingId,
                customer_id: req.user._id,
                provider_id: booking.provider_id,
                service_id: booking.service_id,
                rating,
                comment
            }])
            .select()
            .single();

        if (insertError) {
            if (insertError.code === '23505') { // Unique constraint violation
                return res.status(400).json({ message: 'You have already reviewed this booking' });
            }
            throw insertError;
        }

        // Notify Provider about New Review
        const notification = await createNotification(
            booking.provider_id,
            'review',
            `New Review received for ${booking.serviceId?.service_name || 'your service'}`,
            '/provider/dashboard'
        );

        if (notification) {
            req.app.get('io').to(booking.provider_id).emit('new_notification', notification);
        }

        res.status(201).json({
            ...review,
            _id: review.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a service
// @route   GET /api/reviews/service/:serviceId
// @access  Public
const getReviewsByService = async (req, res) => {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                customerId:customer_id(id, name)
            `)
            .eq('service_id', req.params.serviceId);

        if (error) throw error;

        const mappedReviews = reviews.map(r => ({
            ...r,
            _id: r.id,
            customerId: r.customerId ? { ...r.customerId, _id: r.customerId.id } : null
        }));

        res.json(mappedReviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
const getReviewsByProvider = async (req, res) => {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                customerId:customer_id(id, name),
                serviceId:service_id(id, service_name)
            `)
            .eq('provider_id', req.params.providerId);

        if (error) throw error;

        const mappedReviews = reviews.map(r => ({
            ...r,
            _id: r.id,
            customerId: r.customerId ? { ...r.customerId, _id: r.customerId.id } : null,
            serviceId: r.serviceId ? { ...r.serviceId, _id: r.serviceId.id } : null
        }));

        res.json(mappedReviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get recent global reviews
// @route   GET /api/reviews/recent
// @access  Public
const getRecentReviews = async (req, res) => {
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                *,
                customerId:customer_id(id, name),
                serviceId:service_id(id, service_name)
            `)
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) throw error;

        const mappedReviews = reviews.map(r => ({
            ...r,
            _id: r.id,
            customerId: r.customerId ? { ...r.customerId, _id: r.customerId.id } : null,
            serviceId: r.serviceId ? { ...r.serviceId, _id: r.serviceId.id } : null
        }));

        res.json(mappedReviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createReview,
    getReviewsByService,
    getReviewsByProvider,
    getRecentReviews
};
