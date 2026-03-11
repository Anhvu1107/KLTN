/**
 * Email Service
 * AURA ARCHIVE - Send email notifications
 */

const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmation = async (order, user) => {
    const transporter = createTransporter();

    const itemsHtml = order.items?.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
                ${item.product?.name || 'Product'} - ${item.variant?.size || ''} / ${item.variant?.color || ''}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                $${parseFloat(item.price).toFixed(2)}
            </td>
        </tr>
    `).join('') || '';

    const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="text-align: center; color: #1a1a1a; font-size: 28px; font-weight: normal; margin-bottom: 30px;">
                AURA ARCHIVE
            </h1>
            
            <div style="text-align: center; margin-bottom: 40px;">
                <p style="font-size: 18px; color: #1a1a1a;">Thank you for your order!</p>
                <p style="color: #666;">Order #${order.order_number || order.id.slice(0, 8).toUpperCase()}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 12px; border-bottom: 2px solid #1a1a1a;">Item</th>
                        <th style="text-align: right; padding: 12px; border-bottom: 2px solid #1a1a1a;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 12px; font-weight: bold;">Total</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">
                            $${parseFloat(order.total_amount).toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px;">
                    If you have any questions, please contact us at support@aura-archive.com
                </p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"AURA ARCHIVE" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `Order Confirmation #${order.order_number || order.id.slice(0, 8).toUpperCase()}`,
            html,
        });
        console.log(`✓ Order confirmation email sent to ${user.email}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to send order confirmation:', error.message);
        return false;
    }
};

/**
 * Send shipping update email
 */
const sendShippingUpdate = async (order, user, trackingNumber) => {
    const transporter = createTransporter();

    const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="text-align: center; color: #1a1a1a; font-size: 28px; margin-bottom: 30px;">
                AURA ARCHIVE
            </h1>
            
            <div style="text-align: center; margin-bottom: 40px;">
                <p style="font-size: 24px; color: #1a1a1a;">Your order is on its way!</p>
                <p style="color: #666;">Order #${order.order_number || order.id.slice(0, 8).toUpperCase()}</p>
            </div>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; text-align: center; margin-bottom: 30px;">
                <p style="margin: 0; color: #166534; font-size: 16px;">
                    📦 Your package has been shipped!
                </p>
                ${trackingNumber ? `<p style="margin-top: 15px;">Tracking: <strong>${trackingNumber}</strong></p>` : ''}
            </div>

            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px;">Track your order in your account</p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"AURA ARCHIVE" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: `Your order has shipped! #${order.order_number || order.id.slice(0, 8).toUpperCase()}`,
            html,
        });
        console.log(`✓ Shipping update email sent to ${user.email}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to send shipping update:', error.message);
        return false;
    }
};

module.exports = {
    sendOrderConfirmation,
    sendShippingUpdate,
};
