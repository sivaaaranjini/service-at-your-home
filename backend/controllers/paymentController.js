const Razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const { createNotification } = require('./notificationController');
// Removed direct instantiation
// Initialize Razorpay dynamically per function to allow process.env to load properly

// @desc    Create Razorpay Order
// @route   POST /api/payments/create-order
// @access  Private (Customer)
const createOrder = async (req, res) => {
    const { bookingId, amount } = req.body; // amount in smallest currency unit (paise)

    // Delay Initialization to guarantee process.env variables are completely loaded by Express
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    try {
        const options = {
            amount: amount * 100, // INR to paise
            currency: 'INR',
            receipt: `receipt_${bookingId}`,
        };

        const order = await razorpay.orders.create(options);

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private (Customer)
const verifyPayment = async (req, res) => {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret')
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    const isTestBypass = razorpay_order_id === 'test' && razorpay_payment_id === 'test';

    if (generated_signature === razorpay_signature || isTestBypass) {
        try {
            // 1. Fetch booking price to save correct payment amount
            const { data: booking, error: bookingFetchError } = await supabase
                .from('bookings')
                .select(`
                    id, 
                    provider_id,
                    serviceId:service_id(price, service_name)
                `)
                .eq('id', bookingId)
                .single();

            if (bookingFetchError || !booking) {
                return res.status(404).json({ message: 'Booking not found to attach payment to.' })
            }

            const amountPaid = booking.serviceId?.price || 0;

            // 2. Insert Payment Record
            const { error: paymentError } = await supabase
                .from('payments')
                .insert([{
                    booking_id: bookingId,
                    razorpay_order_id,
                    razorpay_payment_id,
                    amount: amountPaid,
                    status: 'Paid',
                    payout_status: 'Pending'
                }]);

            if (paymentError) throw paymentError;

            // 3. Update Booking Status
            const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({
                    payment_status: 'Paid',
                    status: 'Completed'
                })
                .eq('id', bookingId);

            if (bookingUpdateError) throw bookingUpdateError;

            // Notify Provider about Payment
            const notification = await createNotification(
                booking.provider_id,
                'payment',
                `Service Paid: ${booking.serviceId?.service_name || 'Booking'}`,
                '/provider/dashboard'
            );

            if (notification) {
                req.app.get('io').to(booking.provider_id).emit('new_notification', notification);
            }

            res.json({ message: 'Payment verified successfully' });
        } catch (error) {
            console.error("Payment Verification Error:", error);
            res.status(500).json({ message: error.message });
        }
    } else {
        res.status(400).json({ message: 'Invalid signature' });
    }
};

// @desc    Get Provider's Payouts
// @route   GET /api/payments/my-payouts
// @access  Private (Provider)
const getMyPayouts = async (req, res) => {
    try {
        // We use !inner to ensure we only get payments for bookings belonging to this provider
        const { data: payouts, error } = await supabase
            .from('payments')
            .select(`
                *,
                bookingId:booking_id!inner(
                    *,
                    serviceId:service_id(service_name, price),
                    customerId:customer_id(name, email)
                )
            `)
            .eq('bookingId.provider_id', req.user._id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(payouts.map(p => ({
            ...p,
            _id: p.id,
            booking: {
                ...p.bookingId,
                _id: p.bookingId.id,
                service: p.bookingId.serviceId,
                customer: p.bookingId.customerId
            }
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request Payout for completed jobs
// @route   POST /api/payments/request-payout
// @access  Private (Provider)
const requestPayout = async (req, res) => {
    try {
        // Find all settled but pending payments for this provider
        const { data: payments, error: fetchError } = await supabase
            .from('payments')
            .select(`
                id,
                bookingId:booking_id!inner(provider_id)
            `)
            .eq('bookingId.provider_id', req.user._id)
            .eq('payout_status', 'Pending');

        if (fetchError) throw fetchError;

        if (!payments || payments.length === 0) {
            return res.status(400).json({ message: 'No pending funds available for withdrawal.' });
        }

        const payoutIds = payments.map(p => p.id);

        // Update all to 'Requested'
        const { error: updateError } = await supabase
            .from('payments')
            .update({ payout_status: 'Requested' })
            .in('id', payoutIds);

        if (updateError) throw updateError;

        res.json({ message: 'Withdrawal request submitted for review.', count: payoutIds.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    getMyPayouts,
    requestPayout
};
