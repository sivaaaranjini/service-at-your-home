const supabase = require('../config/supabaseClient');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, phone, is_provider_approved, created_at, updated_at');

        if (error) throw error;

        // Map id to _id for frontend compatibility
        res.json(users.map(u => ({ ...u, _id: u.id, createdAt: u.created_at })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve provider
// @route   PUT /api/admin/approve-provider/:id
// @access  Private (Admin)
const approveProvider = async (req, res) => {
    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'provider') {
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update({ is_provider_approved: true })
                .eq('id', req.params.id)
                .select()
                .single();

            if (updateError) throw updateError;

            res.json({ message: 'Provider approved', user: { ...updatedUser, _id: updatedUser.id } });
        } else {
            res.status(400).json({ message: 'User is not a provider' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bookings (Admin view)
// @route   GET /api/admin/bookings
// @access  Private (Admin)
const getAllBookings = async (req, res) => {
    try {
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                *,
                serviceId:service_id(id, service_name, price, category),
                providerId:provider_id(id, name, email),
                customerId:customer_id(id, name, email)
            `);

        if (error) throw error;

        // Map array
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
}

// @desc    Get platform revenue analytics
// @route   GET /api/admin/revenue
// @access  Private (Admin)
const getRevenue = async (req, res) => {
    try {
        // Find completed payments via the status logic
        const { data: completedBookings, error } = await supabase
            .from('bookings')
            .select(`
                id, payment_status,
                serviceId:service_id(price)
            `)
            .eq('status', 'Completed');

        if (error) throw error;

        let totalRevenue = 0;
        completedBookings.forEach(booking => {
            if (booking.serviceId && booking.serviceId.price) {
                totalRevenue += booking.serviceId.price;
            }
        });

        const platformCommission = totalRevenue * 0.10;

        res.json({
            totalRevenue,
            platformCommission,
            completedBookingsCount: completedBookings.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getUsers,
    approveProvider,
    deleteUser,
    getAllBookings,
    getRevenue
};
