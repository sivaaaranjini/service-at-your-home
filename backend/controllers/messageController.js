const supabase = require('../config/supabaseClient');

// @desc    Get all messages for a specific booking
// @route   GET /api/messages/:bookingId
// @access  Private
const getMessages = async (req, res) => {
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, name, role)
            `)
            .eq('booking_id', req.params.bookingId)
            .order('created_at', { ascending: true }); // Oldest first

        if (error) throw error;

        const mappedMessages = messages.map(m => ({
            ...m,
            _id: m.id,
            bookingId: m.booking_id,
            createdAt: m.created_at,
            sender: m.sender ? { ...m.sender, _id: m.sender.id } : null
        }));

        res.json(mappedMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Save a new message strictly by backend HTTP request 
// (Sockets will handle the real-time, but this persists in DB if they want to load history)
// @route   POST /api/messages
// @access  Private
const createMessage = async (req, res) => {
    try {
        const { bookingId, text } = req.body;

        // 1. Insert
        const { data: newMessage, error: insertError } = await supabase
            .from('messages')
            .insert([{
                booking_id: bookingId,
                sender_id: req.user._id,
                text
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        // 2. Fetch populated
        const { data: populatedMsg, error: fetchError } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, name, role)
            `)
            .eq('id', newMessage.id)
            .single();

        if (fetchError) throw fetchError;

        res.status(201).json({
            ...populatedMsg,
            _id: populatedMsg.id,
            bookingId: populatedMsg.booking_id,
            createdAt: populatedMsg.created_at,
            sender: populatedMsg.sender ? { ...populatedMsg.sender, _id: populatedMsg.sender.id } : null
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMessages, createMessage };
