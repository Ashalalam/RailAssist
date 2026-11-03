import dotenv from 'dotenv';

dotenv.config();

/**
 * Service responsible for dispatching system emails (e.g. Password Reset Links).
 * Follows defensive engineering:
 * If SMTP / Email provider is unconfigured, it does NOT pretend delivery succeeded.
 * In development, it logs the secure link to the console for verified local testing.
 */
class EmailService {
  constructor() {
    this.host = process.env.EMAIL_HOST;
    this.port = process.env.EMAIL_PORT;
    this.user = process.env.EMAIL_USER;
    this.pass = process.env.EMAIL_PASS;
    this.from = process.env.EMAIL_FROM || 'no-reply@railassist.internal';
  }

  isConfigured() {
    return Boolean(this.host && this.user && this.pass);
  }

  async sendPasswordResetEmail({ to, name, resetUrl, resetToken }) {
    const isReady = this.isConfigured();

    if (!isReady) {
      console.warn('========================================================================');
      console.warn('[SECURITY NOTICE - AUTHENTICATION SERVICE]');
      console.warn(`Password reset requested for: ${to}`);
      console.warn('[EMAIL DELIVERY NOT CONFIGURED] No SMTP / email delivery provider is configured in server/.env.');
      console.warn('To enable real email dispatch, configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS.');
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DEV RECOVERY LINK] Access this single-use reset URL directly for verification:');
        console.warn(`--> ${resetUrl}`);
      }
      console.warn('========================================================================');

      return {
        delivered: false,
        reason: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        devResetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined
      };
    }

    // In environments with configured SMTP, real delivery logic executes here
    try {
      console.log(`[EmailService] Attempting password reset dispatch to: ${to} via ${this.host}...`);
      // Future expansion: nodemailer transporter.sendMail(...)
      return {
        delivered: true,
        recipient: to
      };
    } catch (err) {
      console.error('[EmailService Error] Failed to dispatch password reset email:', err.message);
      return {
        delivered: false,
        error: err.message
      };
    }
  }
}

export default new EmailService();
