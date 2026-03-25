const supabase = require('../config/supabaseClient');

// @desc    Get all active offers
// @route   GET /api/offers
// @access  Public
const getOffers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data.map(o => ({ ...o, _id: o.id })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private (Admin)
const createOffer = async (req, res) => {
    try {
        const { title, description, discount_percentage, service_id, expiry_date } = req.body;

        const { data, error } = await supabase
            .from('offers')
            .insert([{
                title,
                description,
                discount_percentage: parseInt(discount_percentage),
                service_id: service_id || null,
                expiry_date: expiry_date || null,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...data, _id: data.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an offer
// @route   DELETE /api/offers/:id
// @access  Private (Admin)
const deleteOffer = async (req, res) => {
    try {
        const { error } = await supabase
            .from('offers')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        res.json({ message: 'Offer removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOffers,
    createOffer,
    deleteOffer
};
