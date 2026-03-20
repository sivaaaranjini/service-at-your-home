const supabase = require('../config/supabaseClient');

// @desc    Get my notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.user._id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', req.params.id)
            .eq('user_id', req.user._id) // Security check
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Internal Helper for Other Controllers
const createNotification = async (userId, type, message, link = '') => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                type,
                message,
                link,
                is_read: false
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Failed to create notification:', error.message);
        return null;
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    createNotification
};
