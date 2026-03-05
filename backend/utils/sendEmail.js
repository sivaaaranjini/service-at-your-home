const fetch = require('node-fetch');

/**
 * Sends an email using Brevo's Transactional Email API (HTTP)
 * This is much more reliable than SMTP on cloud platforms like Render.
 */
const sendEmail = async (options) => {
    if (!process.env.EMAIL_PASS || !process.env.EMAIL_USER) {
        throw new Error('EMAIL_USER or EMAIL_PASS (Brevo API Key) is missing from environment variables');
    }

    const url = 'https://api.brevo.com/v3/smtp/email';

    const data = {
        sender: {
            name: "Service at Your Home",
            email: process.env.EMAIL_USER
        },
        to: [{
            email: options.email
        }],
        subject: options.subject,
        htmlContent: options.html || `<html><body><p>${options.message}</p></body></html>`,
        textContent: options.message
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.EMAIL_PASS,
                'content-type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Brevo API Error Response:', result);
            throw new Error(result.message || 'Failed to send email via Brevo API');
        }

        return result;
    } catch (error) {
        console.error('Brevo HTTP API Error:', error.message);
        throw error;
    }
};

module.exports = sendEmail;
