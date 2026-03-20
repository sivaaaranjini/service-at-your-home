const cron = require('node-cron');
const supabase = require('../config/supabaseClient');
const sendEmail = require('../utils/sendEmail');

const startReminderJob = () => {
    // Run daily at 07:00 AM server time
    cron.schedule('0 7 * * *', async () => {
        console.log('[CRON] Running daily provider reminder job...');
        try {
            // Get today's date in YYYY-MM-DD local time
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            // Fetch bookings for today
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    time,
                    status,
                    date,
                    service:service_id(service_name, location),
                    customer:customer_id(name),
                    provider:provider_id(name, email)
                `)
                .eq('date', formattedDate)
                .in('status', ['Pending', 'Accepted']);

            if (error) {
                console.error('[CRON] Error fetching bookings:', error);
                return;
            }

            if (!bookings || bookings.length === 0) {
                console.log('[CRON] No bookings found for today.');
                return;
            }

            console.log(`[CRON] Found ${bookings.length} booking(s) for today. Sending reminders...`);

            for (const booking of bookings) {
                if (booking.provider && booking.provider.email) {
                    const providerName = booking.provider.name || 'Provider';
                    const customerName = booking.customer ? booking.customer.name : 'a client';
                    const time = booking.time;
                    const location = booking.service ? booking.service.location : 'their location';
                    const serviceName = booking.service ? booking.service.service_name : 'a service';

                    const message = `Hello ${providerName},\n\nToday you have ${customerName} at ${time} at ${location} and this service is booked: ${serviceName}.\n\nPlease ensure you arrive on time and are prepared.\n\nBest regards,\nService at Your Home Team`;

                    try {
                        await sendEmail({
                            email: booking.provider.email,
                            subject: 'Daily Reminder: You have a booking today!',
                            message: message
                        });
                        console.log(`[CRON] Sent reminder to ${booking.provider.email} (booking ID: ${booking.id})`);
                    } catch (emailError) {
                        console.error(`[CRON] Failed to send reminder to ${booking.provider.email}:`, emailError);
                    }
                }
            }

        } catch (err) {
            console.error('[CRON] Error in reminder job:', err);
        }
    });
};

module.exports = startReminderJob;
