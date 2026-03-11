/**
 * MoMo Payment Service
 * AURA ARCHIVE - MoMo wallet integration
 *
 * MoMo Test Credentials (Sandbox):
 * Partner Code: MOMO_PARTNER_CODE
 * Access Key: MOMO_ACCESS_KEY
 * Secret Key: MOMO_SECRET_KEY
 */

const crypto = require('crypto');
const axios = require('axios');

// MoMo Configuration - Validate required env vars
const config = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api',
    returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:3000/payment/momo/return',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:5000/api/v1/payments/momo/ipn',
};

// Validate MoMo credentials on startup (production mode)
if (process.env.NODE_ENV === 'production') {
    if (!config.partnerCode || !config.accessKey || !config.secretKey) {
        console.error('[MoMo] CRITICAL: Missing required MoMo credentials in production!');
        console.error('[MoMo] Please set MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY environment variables.');
    }
}

/**
 * Generate HMAC-SHA256 signature
 */
const generateSignature = (rawData) => {
    return crypto.createHmac('sha256', config.secretKey)
        .update(rawData)
        .digest('hex');
};

/**
 * Create MoMo payment URL
 * @param {Object} params - Payment parameters
 * @param {string} params.orderId - Order ID
 * @param {number} params.amount - Amount in VND
 * @param {string} params.orderInfo - Order description
 * @returns {Promise<Object>} - MoMo response with payment URL
 */
const createPaymentUrl = async ({ orderId, amount, orderInfo }) => {
    try {
        const requestId = `${config.partnerCode}-${Date.now()}`;
        const requestType = 'captureWallet'; // For MoMo wallet payment

        // Build raw signature string (order matters!)
        const rawSignature = [
            `accessKey=${config.accessKey}`,
            `amount=${amount}`,
            `extraData=`,
            `ipnUrl=${config.ipnUrl}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${config.partnerCode}`,
            `redirectUrl=${config.returnUrl}`,
            `requestId=${requestId}`,
            `requestType=${requestType}`,
        ].join('&');

        const signature = generateSignature(rawSignature);

        // Request body
        const requestBody = {
            partnerCode: config.partnerCode,
            accessKey: config.accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: config.returnUrl,
            ipnUrl: config.ipnUrl,
            extraData: '',
            requestType,
            signature,
            lang: 'vi',
        };

        // Call MoMo API
        const response = await axios.post(
            `${config.endpoint}/create`,
            requestBody,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000,
            }
        );

        if (response.data.resultCode === 0) {
            return {
                success: true,
                payUrl: response.data.payUrl,
                qrCodeUrl: response.data.qrCodeUrl,
                deeplink: response.data.deeplink,
                requestId,
                orderId,
            };
        } else {
            return {
                success: false,
                message: response.data.message || 'MoMo payment creation failed',
                resultCode: response.data.resultCode,
            };
        }
    } catch (error) {
        console.error('MoMo createPaymentUrl error:', error.message);
        throw new Error('Failed to create MoMo payment');
    }
};

/**
 * Verify MoMo callback/IPN signature
 * @param {Object} data - Callback data from MoMo
 * @returns {boolean} - Whether signature is valid
 */
const verifySignature = (data) => {
    const {
        accessKey,
        amount,
        extraData,
        message,
        orderId,
        orderInfo,
        orderType,
        partnerCode,
        payType,
        requestId,
        responseTime,
        resultCode,
        transId,
        signature,
    } = data;

    const rawSignature = [
        `accessKey=${accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `message=${message}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `orderType=${orderType}`,
        `partnerCode=${partnerCode}`,
        `payType=${payType}`,
        `requestId=${requestId}`,
        `responseTime=${responseTime}`,
        `resultCode=${resultCode}`,
        `transId=${transId}`,
    ].join('&');

    const expectedSignature = generateSignature(rawSignature);
    return signature === expectedSignature;
};

/**
 * Query payment status
 * @param {string} orderId - Order ID to query
 * @param {string} requestId - Original request ID
 * @returns {Promise<Object>} - Payment status
 */
const queryPaymentStatus = async (orderId, requestId) => {
    try {
        const rawSignature = [
            `accessKey=${config.accessKey}`,
            `orderId=${orderId}`,
            `partnerCode=${config.partnerCode}`,
            `requestId=${requestId}`,
        ].join('&');

        const signature = generateSignature(rawSignature);

        const requestBody = {
            partnerCode: config.partnerCode,
            accessKey: config.accessKey,
            requestId,
            orderId,
            signature,
            lang: 'vi',
        };

        const response = await axios.post(
            `${config.endpoint}/query`,
            requestBody,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000,
            }
        );

        return {
            success: response.data.resultCode === 0,
            resultCode: response.data.resultCode,
            message: response.data.message,
            transId: response.data.transId,
            amount: response.data.amount,
            payType: response.data.payType,
        };
    } catch (error) {
        console.error('MoMo queryPaymentStatus error:', error.message);
        throw new Error('Failed to query MoMo payment status');
    }
};

/**
 * Get response message for result code
 */
const getResponseMessage = (resultCode) => {
    const messages = {
        0: 'Giao dịch thành công',
        9000: 'Giao dịch đã được xác nhận',
        8000: 'Giao dịch đang xử lý',
        7000: 'Giao dịch bị từ chối vì số dư không đủ',
        1001: 'Giao dịch thanh toán thất bại do tài khoản không đủ tiền',
        1002: 'Giao dịch bị từ chối bởi nhà phát hành',
        1003: 'Giao dịch bị huỷ',
        1004: 'Số tiền thanh toán vượt quá hạn mức',
        1005: 'URL hoặc QR code đã hết hạn',
        1006: 'Người dùng từ chối xác nhận thanh toán',
        1007: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hoá',
        1016: 'OutOfStock',
        1017: 'Quá số lần thử lại',
        1026: 'Không tìm thấy giao dịch',
        1080: 'Số tiền thanh toán không hợp lệ',
        1081: 'Số tiền hoàn không hợp lệ',
    };
    return messages[resultCode] || 'Lỗi không xác định';
};

module.exports = {
    createPaymentUrl,
    verifySignature,
    queryPaymentStatus,
    getResponseMessage,
    config,
};
