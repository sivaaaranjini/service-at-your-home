const Razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
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
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        try {
            // 1. Fetch booking price to save correct payment amount
            const { data: booking, error: bookingFetchError } = await supabase
                .from('bookings')
                .select(`
                    id, 
                    serviceId:service_id(price)
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
                    status: 'Paid'
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

            res.json({ message: 'Payment verified successfully' });
        } catch (error) {
            console.error("Payment Verification Error:", error);
            res.status(500).json({ message: error.message });
        }
    } else {
        res.status(400).json({ message: 'Invalid signature' });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
};
