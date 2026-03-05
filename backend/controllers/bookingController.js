const supabase = require('../config/supabaseClient');
const sendEmail = require('../utils/sendEmail');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Customer)
const createBooking = async (req, res) => {
    const { serviceId, date, time } = req.body;

    try {
        // 1. Get Service to find Provider
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('provider_id, service_name')
            .eq('id', serviceId)
            .single();

        if (serviceError || !service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // 2. Insert Booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert([{
                customer_id: req.user._id,
                provider_id: service.provider_id,
                service_id: serviceId,
                date,
                time,
                status: 'Pending',
                payment_status: 'Pending'
            }])
            .select()
            .single();

        if (bookingError) throw bookingError;

        // 3. Notify Service Provider
        try {
            const { data: provider } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', service.provider_id)
                .single();

            if (provider && provider.email) {
                const message = `Hello ${provider.name},\n\nYou have a new booking request for your service: "${service.service_name}".\n\nBooking Details:\nDate: ${new Date(date).toLocaleDateString()}\nTime: ${time}\n\nPlease check your dashboard for more details.\n\nBest regards,\nService at Your Home Team`;

                await sendEmail({
                    email: provider.email,
                    subject: 'New Booking Request - Service at Your Home',
                    message: message,
                });
            }
        } catch (emailError) {
            console.error('Failed to send email notification to provider:', emailError);
        }

        res.status(201).json({
            ...booking,
            _id: booking.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
    try {
        let query = supabase
            .from('bookings')
            .select(`
                *,
                serviceId:service_id(id, service_name, price, category),
                providerId:provider_id(id, name, email),
                customerId:customer_id(id, name, email, phone)
            `);

        if (req.user.role === 'customer') {
            query = query.eq('customer_id', req.user._id);
        } else if (req.user.role === 'provider') {
            query = query.eq('provider_id', req.user._id);
        }

        const { data: bookings, error } = await query;

        if (error) throw error;

        // Map `id` back to `_id` so frontend doesn't break
        const mappedBookings = bookings.map(b => ({
            ...b,
            _id: b.id,
            serviceId: b.serviceId ? { ...b.serviceId, _id: b.serviceId.id } : null,
            providerId: b.providerId ? { ...b.providerId, _id: b.providerId.id } : null,
            customerId: b.customerId ? { ...b.customerId, _id: b.customerId.id } : null,
        }));

        res.json(mappedBookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Provider/Admin)
const updateBookingStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('provider_id')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (
            req.user.role !== 'admin' &&
            booking.provider_id !== req.user._id
        ) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            ...updatedBooking,
            _id: updatedBooking.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Provider arrival via QR
// @route   POST /api/bookings/verify-provider
// @access  Private (Customer)
const verifyProviderArrival = async (req, res) => {
    const { bookingId, scannedProviderId } = req.body;

    try {
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('customer_id, provider_id, status')
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.customer_id !== req.user._id) {
            return res.status(401).json({ message: 'Not authorized for this booking' });
        }

        if (booking.provider_id !== scannedProviderId) {
            return res.status(400).json({ message: 'Provider does not match booking' });
        }

        if (booking.status === 'Cancelled' || booking.status === 'Completed') {
            return res.status(400).json({ message: 'Booking is already completed or cancelled' });
        }

        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'In Progress' })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({ message: 'Provider verified successfully', booking: { ...updatedBooking, _id: updatedBooking.id } });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createBooking,
    getBookings,
    updateBookingStatus,
    verifyProviderArrival
};
