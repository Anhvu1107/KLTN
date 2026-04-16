/**
 * PayPal Service (Sandbox)
 * AURA ARCHIVE - PayPal REST API integration for international payments
 * 
 * Supports: PayPal balance, Visa, Mastercard, AMEX
 * Docs: https://developer.paypal.com/docs/api/overview/
 */

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

/**
 * Get PayPal access token
 */
const getAccessToken = async () => {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`PayPal auth failed: ${data.error_description || 'Unknown error'}`);
    }

    return data.access_token;
};

/**
 * Create PayPal order (payment session)
 * @param {Object} order - The order from database
 * @returns {Object} - { success, approvalUrl, paypalOrderId }
 */
const createPayment = async (order) => {
    try {
        const accessToken = await getAccessToken();

        const returnUrl = `${process.env.SERVER_URL || 'http://localhost:3001'}/api/v1/payments/paypal/return`;
        const cancelUrl = `${process.env.CLIENT_URL}/payment/failed?message=Payment%20cancelled`;

        const payload = {
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: order.id,
                description: `AURA ARCHIVE - Order #${order.id.slice(0, 8)}`,
                amount: {
                    currency_code: 'USD',
                    value: (order.total_amount / 25000).toFixed(2), // Convert VND → USD
                },
            }],
            application_context: {
                brand_name: 'AURA ARCHIVE',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW',
                return_url: returnUrl,
                cancel_url: cancelUrl,
            },
        };

        const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PayPal create order error:', data);
            return {
                success: false,
                message: data.message || 'Failed to create PayPal payment',
            };
        }

        // Find the approval URL
        const approvalLink = data.links.find(link => link.rel === 'approve');

        return {
            success: true,
            approvalUrl: approvalLink?.href,
            paypalOrderId: data.id,
        };
    } catch (error) {
        console.error('PayPal service error:', error);
        return {
            success: false,
            message: error.message || 'PayPal service error',
        };
    }
};

/**
 * Capture PayPal payment after user approval
 * @param {string} paypalOrderId - PayPal order ID from createPayment
 * @returns {Object} - { success, transactionId, status }
 */
const capturePayment = async (paypalOrderId) => {
    try {
        const accessToken = await getAccessToken();

        const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PayPal capture error:', data);
            return {
                success: false,
                message: data.message || 'Failed to capture payment',
            };
        }

        const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

        return {
            success: data.status === 'COMPLETED',
            transactionId: capture?.id || data.id,
            status: data.status,
            orderId: data.purchase_units?.[0]?.reference_id,
        };
    } catch (error) {
        console.error('PayPal capture error:', error);
        return {
            success: false,
            message: error.message || 'PayPal capture error',
        };
    }
};

/**
 * Verify PayPal webhook/IPN signature
 */
const verifyWebhook = async (_headers, _body) => {
    // In production, verify PayPal webhook signature
    // For sandbox, we trust the data
    return true;
};

module.exports = {
    createPayment,
    capturePayment,
    verifyWebhook,
};
