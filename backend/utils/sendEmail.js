const { Resend } = require('resend');

// Initialize Resend with your API Key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is missing. Please add it to your Render Environment Variables.');
    }

    try {
        const data = await resend.emails.send({
            // Note: Resend Free Tier only allows sending FROM this exact address:
            from: 'Service At Your Home <onboarding@resend.dev>',
            to: options.email, // In Free Tier, this must be the email you used to sign up for Resend!
            subject: options.subject,
            text: options.message,
            html: options.html || `<p>${options.message}</p>`,
        });

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data;
    } catch (error) {
        console.error('Resend Error:', error);
        throw error;
    }
};

module.exports = sendEmail;
