const supabase = require('../config/supabaseClient');

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (Customer)
const createComplaint = async (req, res) => {
    const { bookingId, description } = req.body;

    try {
        // Verify Booking Ownership
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('customer_id, provider_id')
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.customer_id !== req.user._id) {
            return res.status(401).json({ message: 'Not authorized for this booking' });
        }

        const { data: createdComplaint, error: createError } = await supabase
            .from('complaints')
            .insert([{
                customer_id: req.user._id,
                provider_id: booking.provider_id,
                booking_id: bookingId,
                description,
                status: 'Open'
            }])
            .select()
            .single();

        if (createError) throw createError;

        res.status(201).json({
            ...createdComplaint,
            _id: createdComplaint.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private (Admin)
const getComplaints = async (req, res) => {
    try {
        const { data: complaints, error } = await supabase
            .from('complaints')
            .select(`
                *,
                customerId:customer_id(id, name, email),
                providerId:provider_id(id, name, email),
                bookingId:booking_id(
                    id, 
                    serviceId:service_id(service_name)
                )
            `);

        if (error) throw error;

        const mappedComplaints = complaints.map(c => ({
            ...c,
            _id: c.id,
            customerId: c.customerId ? { ...c.customerId, _id: c.customerId.id } : null,
            providerId: c.providerId ? { ...c.providerId, _id: c.providerId.id } : null,
            bookingId: c.bookingId ? {
                ...c.bookingId,
                _id: c.bookingId.id,
                serviceId: c.bookingId.serviceId
            } : null
        }));

        res.json(mappedComplaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resolve a complaint
// @route   PUT /api/complaints/:id/resolve
// @access  Private (Admin)
const resolveComplaint = async (req, res) => {
    try {
        const { action } = req.body; // e.g., 'refund', 'dismiss'
        const complaintId = req.params.id;

        const { data: complaint, error: fetchError } = await supabase
            .from('complaints')
            .select('booking_id')
            .eq('id', complaintId)
            .single();

        if (fetchError || !complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (action === 'refund' && complaint.booking_id) {
            const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({ status: 'Refunded' })
                .eq('id', complaint.booking_id);

            if (bookingUpdateError) {
                console.error("Failed to update booking status to refunded", bookingUpdateError);
            }
        }

        const { data: updatedComplaint, error: updateError } = await supabase
            .from('complaints')
            .update({ status: 'Resolved' })
            .eq('id', complaintId)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            ...updatedComplaint,
            _id: updatedComplaint.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createComplaint,
    getComplaints,
    resolveComplaint
};
