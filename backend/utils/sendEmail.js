const SibApiV3Sdk = require('@getbrevo/brevo');

/**
 * Sends an email using the official Brevo Transactional Email SDK.
 * This ensures the request is perfectly formatted and authenticated.
 */
const sendEmail = async (options) => {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];

    // Ensure the key is clean and valid
    const key = (process.env.EMAIL_PASS || '').trim();

    if (!key.startsWith('xkeysib-')) {
        console.error('[BREVO_CRITICAL] Your EMAIL_PASS does not start with xkeysib-. This will fail!');
    }

    apiKey.apiKey = key;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.html || `<html><body><p>${options.message}</p></body></html>`;
    sendSmtpEmail.sender = { name: "Service at Your Home", email: process.env.EMAIL_USER };
    sendSmtpEmail.to = [{ email: options.email }];
    sendSmtpEmail.textContent = options.message;

    try {
        console.log(`[BREVO_DEBUG] Sending email to ${options.email} via Brevo SDK...`);
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('[BREVO_DEBUG] Brevo SDK Send Success:', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('[BREVO_ERROR] SDK Error Detail:', error.response ? JSON.stringify(error.response.text) : error.message);
        throw error;
    }
};

module.exports = sendEmail;
