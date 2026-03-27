/**
 * Email Utility
 * AURA ARCHIVE - Nodemailer wrapper for sending emails
 */

const nodemailer = require('nodemailer');

// Create SMTP transporter (fallback for local dev)
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
};

/**
 * Send email via SendGrid / Brevo API (production) or SMTP (local dev)
 */
const sendEmail = async ({ to, subject, text, html }) => {
    const senderEmail = process.env.SMTP_USER || 'noreply@auraarchive.com';
    const senderName = 'AURA ARCHIVE';

    // Priority 0: Resend API (best for cloud/production)
    if (process.env.RESEND_API_KEY) {
        try {
            const resendFrom = process.env.RESEND_FROM || 'AURA ARCHIVE <onboarding@resend.dev>';
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: resendFrom,
                    to: [to],
                    subject,
                    html,
                    text,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`✗ Resend error for ${to}:`, data);
                console.warn('⚠ Resend failed, trying other providers...');
            } else {
                console.log(`✓ Email sent via Resend to ${to}: ${data.id}`);
                return { success: true, messageId: data.id };
            }
        } catch (error) {
            console.error(`✗ Resend failed for ${to}:`, error.message);
            console.warn('⚠ Falling back to other providers...');
        }
    }

    // Priority 1: SendGrid API
    if (process.env.SENDGRID_API_KEY) {
        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: senderEmail, name: senderName },
                    subject,
                    content: [
                        { type: 'text/plain', value: text || subject },
                        { type: 'text/html', value: html },
                    ],
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`✗ SendGrid error for ${to}:`, response.status, errData);
                throw new Error(errData?.errors?.[0]?.message || `SendGrid ${response.status}`);
            }

            console.log(`✓ Email sent via SendGrid to ${to}`);
            return { success: true, messageId: response.headers.get('x-message-id') };
        } catch (error) {
            console.error(`✗ SendGrid failed for ${to}:`, error.message);
            throw error;
        }
    }

    // Priority 2: Brevo API
    if (process.env.BREVO_API_KEY) {
        try {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { name: senderName, email: senderEmail },
                    to: [{ email: to }],
                    subject,
                    htmlContent: html,
                    textContent: text,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(`✗ Brevo error for ${to}:`, data);
                // Fall through to SMTP instead of throwing
                console.warn('⚠ Brevo failed, falling back to SMTP...');
            } else {
                console.log(`✓ Email sent via Brevo to ${to}: ${data.messageId}`);
                return { success: true, messageId: data.messageId };
            }
        } catch (error) {
            console.error(`✗ Brevo failed for ${to}:`, error.message);
            console.warn('⚠ Falling back to SMTP...');
        }
    }

    // Fallback: SMTP (local development)
    const transporter = createTransporter();
    const from = process.env.EMAIL_FROM || `${senderName} <${senderEmail}>`;

    try {
        const info = await transporter.sendMail({ from, to, subject, text, html });
        console.log(`✓ Email sent via SMTP to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`✗ SMTP failed for ${to}:`, error.message, error.code);
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
 * Send OTP verification email
 * @param {string} email - User email
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} userName - User's name
 */
const sendOtpEmail = async (email, otpCode, userName = 'Valued Customer') => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #f8f6f3;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f6f3; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; border: 1px solid #e8e0d4;">
              <!-- Dark Header -->
              <tr>
                <td style="background-color: #0a0a0a; padding: 35px 40px; text-align: center;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 400; letter-spacing: 6px; color: #c9a96e; font-family: Georgia, serif;">
                    AURA ARCHIVE
                  </h1>
                  <p style="margin: 8px 0 0; font-size: 11px; letter-spacing: 3px; color: #6b6b6b; text-transform: uppercase;">
                    Luxury Fashion Archive
                  </p>
                </td>
              </tr>
              <!-- Gold accent line -->
              <tr>
                <td style="background-color: #c9a96e; height: 2px; font-size: 0; line-height: 0;">&nbsp;</td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="background-color: #ffffff; padding: 50px 45px;">
                  <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">
                    Xác thực tài khoản
                  </p>
                  <h2 style="margin: 0 0 25px; font-size: 22px; font-weight: 400; color: #0a0a0a; font-family: Georgia, serif;">
                    Xin chào ${userName},
                  </h2>
                  <p style="margin: 0 0 35px; font-size: 15px; line-height: 1.8; color: #4a4a4a;">
                    Cảm ơn bạn đã tạo tài khoản tại <strong style="color: #0a0a0a;">AURA ARCHIVE</strong>. Vui lòng sử dụng mã xác thực bên dưới để hoàn tất đăng ký. Mã có hiệu lực trong <strong>10 phút</strong>.
                  </p>
                  <!-- OTP Code Box -->
                  <div style="text-align: center; margin: 40px 0;">
                    <div style="display: inline-block; background-color: #0a0a0a; padding: 22px 50px; letter-spacing: 14px; font-size: 34px; font-weight: 700; color: #c9a96e; font-family: 'Courier New', monospace;">
                      ${otpCode}
                    </div>
                  </div>
                  <!-- Divider -->
                  <div style="border-top: 1px solid #e8e0d4; margin: 35px 0;"></div>
                  <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #999; font-style: italic;">
                    Nếu bạn không yêu cầu tạo tài khoản, vui lòng bỏ qua email này. Mã xác thực sẽ tự động hết hạn.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #0a0a0a; padding: 30px 45px; text-align: center;">
                  <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 2px; color: #6b6b6b; text-transform: uppercase;">
                    &copy; ${new Date().getFullYear()} AURA ARCHIVE
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #4a4a4a;">
                    Luxury Fashion &bull; Authenticated &bull; Curated
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

    return sendEmail({
        to: email,
        subject: `${otpCode} — Mã xác thực AURA ARCHIVE`,
        text: `Mã OTP của bạn là: ${otpCode}. Mã này sẽ hết hạn sau 10 phút.`,
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

/**
 * Send order confirmed email
 */
/**
 * Luxury email wrapper helper
 */
const luxuryEmailWrapper = (content, preheaderText = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #f8f6f3;">
  ${preheaderText ? `<div style="display:none;max-height:0;overflow:hidden;">${preheaderText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f6f3; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; border: 1px solid #e8e0d4;">
          <!-- Dark Header -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 35px 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 400; letter-spacing: 6px; color: #c9a96e; font-family: Georgia, serif;">
                AURA ARCHIVE
              </h1>
              <p style="margin: 8px 0 0; font-size: 11px; letter-spacing: 3px; color: #6b6b6b; text-transform: uppercase;">
                Luxury Fashion Archive
              </p>
            </td>
          </tr>
          <!-- Gold accent line -->
          <tr>
            <td style="background-color: #c9a96e; height: 2px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 50px 45px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 30px 45px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 2px; color: #6b6b6b; text-transform: uppercase;">
                &copy; ${new Date().getFullYear()} AURA ARCHIVE
              </p>
              <p style="margin: 0; font-size: 11px; color: #4a4a4a;">
                Luxury Fashion &bull; Authenticated &bull; Curated
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Send order confirmed email
 */
const sendOrderConfirmedEmail = async (order, user) => {
    const content = `
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">
        Xác nhận đơn hàng
      </p>
      <h2 style="margin: 0 0 25px; font-size: 22px; font-weight: 400; color: #0a0a0a; font-family: Georgia, serif;">
        Xin chào ${user.first_name || 'Quý khách'},
      </h2>
      <p style="margin: 0 0 30px; font-size: 15px; line-height: 1.8; color: #4a4a4a;">
        Đơn hàng <strong style="color: #0a0a0a;">#${order.order_number}</strong> của bạn đã được xác nhận và đang được chuẩn bị. Chúng tôi sẽ thông báo khi đơn hàng được giao cho đơn vị vận chuyển.
      </p>
      <!-- Order Badge -->
      <div style="text-align: center; margin: 35px 0;">
        <div style="display: inline-block; background-color: #0a0a0a; padding: 18px 45px;">
          <span style="font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">Đã xác nhận</span>
        </div>
      </div>
      <div style="border-top: 1px solid #e8e0d4; margin: 35px 0;"></div>
      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #999; font-style: italic;">
        Bạn có thể theo dõi trạng thái đơn hàng trong tài khoản của mình.
      </p>`;

    return sendEmail({
        to: user.email,
        subject: `Đơn hàng #${order.order_number} đã được xác nhận — AURA ARCHIVE`,
        text: `Đơn hàng #${order.order_number} đã được xác nhận và đang được xử lý.`,
        html: luxuryEmailWrapper(content),
    });
};

/**
 * Send order delivered email
 */
const sendOrderDeliveredEmail = async (order, user) => {
    const content = `
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">
        Giao hàng thành công
      </p>
      <h2 style="margin: 0 0 25px; font-size: 22px; font-weight: 400; color: #0a0a0a; font-family: Georgia, serif;">
        Xin chào ${user.first_name || 'Quý khách'},
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.8; color: #4a4a4a;">
        Đơn hàng <strong style="color: #0a0a0a;">#${order.order_number}</strong> đã được giao thành công. Cảm ơn bạn đã tin tưởng và mua sắm tại <strong style="color: #0a0a0a;">AURA ARCHIVE</strong>.
      </p>
      <!-- Delivered Badge -->
      <div style="text-align: center; margin: 35px 0;">
        <div style="display: inline-block; background-color: #0a0a0a; padding: 18px 45px;">
          <span style="font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">✦ Đã giao thành công ✦</span>
        </div>
      </div>
      <div style="border-top: 1px solid #e8e0d4; margin: 35px 0;"></div>
      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #999; font-style: italic;">
        Nếu bạn hài lòng với sản phẩm, hãy để lại đánh giá giúp chúng tôi phục vụ tốt hơn nhé!
      </p>`;

    return sendEmail({
        to: user.email,
        subject: `Đơn hàng #${order.order_number} đã giao thành công — AURA ARCHIVE`,
        text: `Đơn hàng #${order.order_number} đã được giao thành công. Cảm ơn bạn!`,
        html: luxuryEmailWrapper(content),
    });
};

/**
 * Send order cancelled email
 */
const sendOrderCancelledEmail = async (order, user, reason = '') => {
    const content = `
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">
        Thông báo hủy đơn
      </p>
      <h2 style="margin: 0 0 25px; font-size: 22px; font-weight: 400; color: #0a0a0a; font-family: Georgia, serif;">
        Xin chào ${user.first_name || 'Quý khách'},
      </h2>
      <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.8; color: #4a4a4a;">
        Đơn hàng <strong style="color: #0a0a0a;">#${order.order_number}</strong> đã bị hủy.${reason ? ` Lý do: <em>${reason}</em>` : ''}
      </p>
      <!-- Cancelled Badge -->
      <div style="text-align: center; margin: 35px 0;">
        <div style="display: inline-block; border: 1px solid #0a0a0a; padding: 18px 45px;">
          <span style="font-size: 12px; letter-spacing: 2px; color: #0a0a0a; text-transform: uppercase;">Đã hủy</span>
        </div>
      </div>
      <div style="border-top: 1px solid #e8e0d4; margin: 35px 0;"></div>
      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #999; font-style: italic;">
        Nếu bạn có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ khách hàng. Chúng tôi luôn sẵn sàng phục vụ bạn.
      </p>`;

    return sendEmail({
        to: user.email,
        subject: `Đơn hàng #${order.order_number} đã bị hủy — AURA ARCHIVE`,
        text: `Đơn hàng #${order.order_number} đã bị hủy.${reason ? ` Lý do: ${reason}` : ''}`,
        html: luxuryEmailWrapper(content),
    });
};

/**
 * Send new order notification email to admin
 */
const sendNewOrderAdminEmail = async (order, user) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const content = `
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">
        Đơn hàng mới
      </p>
      <h2 style="margin: 0 0 30px; font-size: 22px; font-weight: 400; color: #0a0a0a; font-family: Georgia, serif;">
        Đơn hàng #${order.order_number}
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px; width: 130px;">Khách hàng</td>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 15px; color: #0a0a0a;">${user.first_name || ''} ${user.last_name || ''}</td>
        </tr>
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Email</td>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 15px; color: #0a0a0a;">${user.email}</td>
        </tr>
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Tổng tiền</td>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 15px; color: #c9a96e; font-weight: bold;">${parseFloat(order.total_amount).toLocaleString('vi-VN')}₫</td>
        </tr>
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Thanh toán</td>
          <td style="padding: 14px 0; border-bottom: 1px solid #e8e0d4; font-size: 15px; color: #0a0a0a;">${order.payment_method}</td>
        </tr>
        <tr>
          <td style="padding: 14px 0; font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Thời gian</td>
          <td style="padding: 14px 0; font-size: 15px; color: #0a0a0a;">${new Date().toLocaleString('vi-VN')}</td>
        </tr>
      </table>
      <div style="text-align: center;">
        <a href="${process.env.CLIENT_URL}/admin/orders" style="display: inline-block; background-color: #0a0a0a; color: #c9a96e; padding: 14px 40px; text-decoration: none; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif;">
          Xem đơn hàng
        </a>
      </div>`;

    return sendEmail({
        to: adminEmail,
        subject: `[Đơn mới] #${order.order_number} — ${parseFloat(order.total_amount).toLocaleString('vi-VN')}₫`,
        text: `Đơn hàng mới #${order.order_number} từ ${user.email}. Tổng: ${order.total_amount}`,
        html: luxuryEmailWrapper(content),
    });
};

/**
 * Send payment success email
 */
const sendPaymentSuccessEmail = async (order, user) => {
    const content = `
      <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #c9a96e; text-transform: uppercase;">
        Thanh toán thành công
      </p>
      <h2 style="margin: 0 0 25px; font-size: 22px; font-weight: 400; color: #0a0a0a; font-family: Georgia, serif;">
        Xin chào ${user.first_name || 'Quý khách'},
      </h2>
      <p style="margin: 0 0 30px; font-size: 15px; line-height: 1.8; color: #4a4a4a;">
        Thanh toán cho đơn hàng <strong style="color: #0a0a0a;">#${order.order_number}</strong> đã được xử lý thành công.
      </p>
      <!-- Amount Box -->
      <div style="text-align: center; margin: 35px 0;">
        <div style="display: inline-block; background-color: #0a0a0a; padding: 22px 50px;">
          <span style="font-size: 11px; letter-spacing: 2px; color: #6b6b6b; text-transform: uppercase; display: block; margin-bottom: 8px;">Số tiền thanh toán</span>
          <span style="font-size: 28px; color: #c9a96e; font-weight: bold; font-family: Georgia, serif;">${parseFloat(order.total_amount).toLocaleString('vi-VN')}₫</span>
        </div>
      </div>
      <table style="width: 100%; margin: 30px 0;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e8e0d4; font-size: 13px; color: #999;">Phương thức</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e8e0d4; font-size: 15px; color: #0a0a0a; text-align: right;">${order.payment_method}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-size: 13px; color: #999;">Mã đơn hàng</td>
          <td style="padding: 10px 0; font-size: 15px; color: #0a0a0a; text-align: right;">#${order.order_number}</td>
        </tr>
      </table>
      <div style="border-top: 1px solid #e8e0d4; margin: 25px 0;"></div>
      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #999; font-style: italic;">
        Cảm ơn bạn đã mua sắm tại AURA ARCHIVE.
      </p>`;

    return sendEmail({
        to: user.email,
        subject: `Thanh toán thành công — Đơn hàng #${order.order_number} — AURA ARCHIVE`,
        text: `Thanh toán cho đơn hàng #${order.order_number} đã thành công. Số tiền: ${order.total_amount}`,
        html: luxuryEmailWrapper(content),
    });
};

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendContactFormEmail,
    sendOtpEmail,
    sendOrderConfirmedEmail,
    sendOrderDeliveredEmail,
    sendOrderCancelledEmail,
    sendNewOrderAdminEmail,
    sendPaymentSuccessEmail,
};
