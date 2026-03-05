const fetch = require('node-fetch');

/**
 * Sends an email using Brevo's Transactional Email API (HTTP)
 * Using fetch is more reliable than the SDK which can have versioning issues.
 */
const sendEmail = async (options) => {
    const key = (process.env.EMAIL_PASS || '').trim();
    const user = (process.env.EMAIL_USER || '').trim();

    if (!key || !user) {
        throw new Error('EMAIL_USER or EMAIL_PASS is missing from environment');
    }

    // CRITICAL: Log info to see what is happening in Render
    console.log(`[BREVO_INFO] Sending to: ${options.email}`);
    console.log(`[BREVO_INFO] Using Key Prefix: ${key.substring(0, 8)} | Length: ${key.length}`);

    if (!key.startsWith('xkeysib-')) {
        console.error('[BREVO_CRITICAL] API Key does NOT start with xkeysib-. This is likely a Gmail password!');
    }

    const url = 'https://api.brevo.com/v3/smtp/email';

    const data = {
        sender: {
            name: "Service at Your Home",
            email: user
        },
        to: [{
            email: options.email
        }],
        subject: options.subject,
        htmlContent: options.html || `<html><body><p>${options.message}</p></body></html>`,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': key,
                'content-type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[BREVO_API_ERROR]', JSON.stringify(result));
            throw new Error(result.message || 'Brevo API rejected the request');
        }

        console.log('[BREVO_SUCCESS] Email sent successfully');
        return result;
    } catch (error) {
        console.error('[BREVO_TRANSPORT_ERROR]', error.message);
        throw error;
    }
};

module.exports = sendEmail;
