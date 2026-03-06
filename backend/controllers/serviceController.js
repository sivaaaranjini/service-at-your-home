const supabase = require('../config/supabaseClient');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getServices = async (req, res) => {
    console.log("[DEBUG getServices] Route hit...");
    try {
        const { category, search } = req.query;
        console.log("[DEBUG getServices] Building query...", { category, search });

        let query = supabase
            .from('services')
            .select(`
                *,
                providerId:provider_id(id, name, email, is_provider_approved)
            `);

        if (category) {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(`service_name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data: services, error } = await query;
        console.log("[DEBUG getServices] Supabase raw result:", {
            count: services?.length,
            hasError: !!error,
            firstItemKeys: services?.[0] ? Object.keys(services[0]) : 'N/A'
        });

        if (error) {
            console.error("[DEBUG getServices] Supabase error:", error);
            return res.status(500).json({ message: error.message });
        }

        // Map `id` back to `_id` so frontend doesn't break
        const mappedServices = services ? services.map(s => {
            // Safely handle providerId which might be an object or an array of 1 object
            let providerInfo = null;
            if (s.providerId) {
                const rawProvider = Array.isArray(s.providerId) ? s.providerId[0] : s.providerId;
                if (rawProvider) {
                    providerInfo = {
                        ...rawProvider,
                        _id: rawProvider.id
                    };
                }
            }

            return {
                ...s,
                _id: s.id,
                serviceName: s.service_name,
                providerId: providerInfo
            };
        }) : [];

        console.log(`[DEBUG getServices] Returning ${mappedServices.length} services`);
        return res.json(mappedServices);
    } catch (error) {
        console.error("[DEBUG getServices] Catch block error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = async (req, res) => {
    try {
        const { data: service, error } = await supabase
            .from('services')
            .select(`
                *,
                providerId:provider_id(id, name, email)
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({
            ...service,
            _id: service.id,
            providerId: service.providerId ? {
                ...service.providerId,
                _id: service.providerId.id
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private (Provider)
const createService = async (req, res) => {
    try {
        const { category, serviceName, description, price, location } = req.body;

        const { data: createdService, error } = await supabase
            .from('services')
            .insert([{
                provider_id: req.user._id, // Assume user._id mapping is maintained in middleware
                category,
                service_name: serviceName,
                description,
                price: parseInt(price),
                location
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            ...createdService,
            _id: createdService.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (Provider)
const updateService = async (req, res) => {
    try {
        // 1. Verify Ownership
        const { data: service, error: fetchError } = await supabase
            .from('services')
            .select('provider_id')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        if (service.provider_id !== req.user._id) {
            return res.status(401).json({ message: 'Not authorized to update this service' });
        }

        // 2. Update logic
        const updateData = {};
        if (req.body.category) updateData.category = req.body.category;
        if (req.body.serviceName) updateData.service_name = req.body.serviceName;
        if (req.body.description) updateData.description = req.body.description;
        if (req.body.price) updateData.price = parseInt(req.body.price);
        if (req.body.location) updateData.location = req.body.location;

        const { data: updatedService, error: updateError } = await supabase
            .from('services')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({
            ...updatedService,
            _id: updatedService.id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private (Provider/Admin)
const deleteService = async (req, res) => {
    try {
        // 1. Verify Ownership
        const { data: service, error: fetchError } = await supabase
            .from('services')
            .select('provider_id')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        if (service.provider_id !== req.user._id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to delete this service' });
        }

        // 2. Delete logic
        const { error: deleteError } = await supabase
            .from('services')
            .delete()
            .eq('id', req.params.id);

        if (deleteError) throw deleteError;

        res.json({ message: 'Service removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get provider services
// @route   GET /api/services/my-services
// @access  Private (Provider)
const getMyServices = async (req, res) => {
    try {
        const { data: services, error } = await supabase
            .from('services')
            .select('*')
            .eq('provider_id', req.user._id);

        if (error) throw error;

        // Ensure mapped UI properties
        const mappedServices = services.map(s => ({
            ...s,
            _id: s.id,
            serviceName: s.service_name
        }));

        res.json(mappedServices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getMyServices,
};
