/**
 * Email Utility
 * AURA ARCHIVE - Nodemailer wrapper for sending emails
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<Object>} - Nodemailer response
 */
const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'AURA ARCHIVE <noreply@auraarchive.com>',
        to,
        subject,
        text,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✓ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`✗ Failed to send email to ${to}:`, error.message);
        throw error;
    }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name (optional)
 */
const sendPasswordResetEmail = async (email, resetToken, userName = 'Valued Customer') => {
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px;">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 400; letter-spacing: 4px; color: #0a0a0a;">
                    AURA ARCHIVE
                  </h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 400; color: #0a0a0a;">
                    Reset Your Password
                  </h2>
                  <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #525252;">
                    Dear ${userName},
                  </p>
                  <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #525252;">
                    We received a request to reset your password. Click the button below to create a new password. This link will expire in 1 hour.
                  </p>
                  <!-- Button -->
                  <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px;">
                    <tr>
                      <td style="background-color: #0a0a0a; padding: 16px 40px;">
                        <a href="${resetUrl}" style="color: #ffffff; font-size: 14px; font-weight: 500; letter-spacing: 1px; text-decoration: none; text-transform: uppercase;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #737373;">
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #737373;">
                    Or copy and paste this URL into your browser:<br>
                    <a href="${resetUrl}" style="color: #0a0a0a; word-break: break-all;">${resetUrl}</a>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #fafafa; text-align: center; border-top: 1px solid #e5e5e5;">
                  <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                    &copy; ${new Date().getFullYear()} AURA ARCHIVE. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

    const text = `
    AURA ARCHIVE - Reset Your Password
    
    Dear ${userName},
    
    We received a request to reset your password. 
    Click the link below to create a new password (expires in 1 hour):
    
    ${resetUrl}
    
    If you didn't request a password reset, you can safely ignore this email.
    
    © ${new Date().getFullYear()} AURA ARCHIVE
  `;

    return sendEmail({
        to: email,
        subject: 'Reset Your Password - AURA ARCHIVE',
        text,
        html,
    });
};

/**
 * Send contact form email to admin
 * @param {Object} data - Contact form data
 */
const sendContactFormEmail = async ({ name, email, phone, subject, message }) => {
    const adminEmail = process.env.ADMIN_EMAIL;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Contact Form Submission</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 4px;">
        <h2 style="margin: 0 0 20px; color: #0a0a0a; border-bottom: 2px solid #0a0a0a; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold; width: 120px;">Name:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Email:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
              <a href="mailto:${email}" style="color: #0a0a0a;">${email}</a>
            </td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Phone:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${phone}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-weight: bold;">Subject:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5;">${subject}</td>
          </tr>
        </table>
        <div style="margin-top: 20px;">
          <h3 style="margin: 0 0 10px; color: #0a0a0a;">Message:</h3>
          <p style="margin: 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="margin: 30px 0 0; font-size: 12px; color: #737373;">
          Sent from AURA ARCHIVE Contact Form at ${new Date().toLocaleString()}
        </p>
      </div>
    </body>
    </html>
  `;

    return sendEmail({
        to: adminEmail,
        subject: `[Contact Form] ${subject}`,
        text: `New contact from ${name} (${email}): ${message}`,
        html,
    });
};

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendContactFormEmail,
};
