/**
 * VNPay Payment Service
 * AURA ARCHIVE - VNPay payment gateway integration
 */

const crypto = require('crypto');
const querystring = require('qs');
const AppError = require('../utils/AppError');

const normalizeParamValue = (value) => {
    if (Array.isArray(value)) return normalizeParamValue(value[0]);
    if (value === undefined || value === null) return '';
    return String(value);
};

const getEnvValue = (name) => normalizeParamValue(process.env[name]).trim();

// VNPay Config - credentials must stay in environment variables.
const serverBaseUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;

const VNPAY_CONFIG = {
    vnp_TmnCode: getEnvValue('VNPAY_TMN_CODE'),
    vnp_HashSecret: getEnvValue('VNPAY_HASH_SECRET'),
    vnp_Url: getEnvValue('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnp_ReturnUrl: getEnvValue('VNPAY_RETURN_URL') || `${serverBaseUrl}/api/v1/payments/vnpay/return`,
    vnp_IpnUrl: getEnvValue('VNPAY_IPN_URL') || `${serverBaseUrl}/api/v1/payments/vnpay/ipn`,
};

// Validate VNPay credentials on startup (production mode).
if (process.env.NODE_ENV === 'production') {
    if (!VNPAY_CONFIG.vnp_TmnCode || !VNPAY_CONFIG.vnp_HashSecret) {
        console.error('[VNPay] CRITICAL: Missing required VNPay credentials in production!');
        console.error('[VNPay] Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET environment variables.');
    }
}

const sortObject = (obj) => {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        const value = normalizeParamValue(obj[key]);
        if (value) {
            sorted[encodeURIComponent(key)] = encodeURIComponent(value).replace(/%20/g, '+');
        }
    }
    return sorted;
};

const formatVNPayDate = (date = new Date()) => {
    const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return vietnamTime.toISOString().replace(/\D/g, '').slice(0, 14);
};

const assertConfigured = () => {
    if (!VNPAY_CONFIG.vnp_TmnCode || !VNPAY_CONFIG.vnp_HashSecret) {
        throw new AppError('VNPay sandbox is not configured. Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET.', 503);
    }
};

const normalizeBankCode = (bankCode) => {
    const normalized = normalizeParamValue(bankCode).trim().toUpperCase();
    if (!normalized) return '';
    if (normalized === 'QRONLY') return 'VNPAYQR';
    if (!/^[A-Z0-9]{3,20}$/.test(normalized)) {
        throw new AppError('Invalid VNPay bank code.', 400);
    }
    return normalized;
};

/**
 * Create VNPay payment URL.
 */
const createPaymentUrl = (order, ipAddr, options = {}) => {
    assertConfigured();

    const date = new Date();
    const createDate = formatVNPayDate(date);
    const expireDate = formatVNPayDate(new Date(date.getTime() + (15 * 60 * 1000)));
    const orderId = normalizeParamValue(order.id || date.getTime());
    const bankCode = normalizeBankCode(options.bankCode);
    const orderAmount = Number(order.total_amount);

    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
        throw new AppError('Invalid VNPay order amount.', 400);
    }

    // VNPay requires amount in VND * 100. Prices are already stored in VND.
    const amountVND = Math.round(orderAmount * 100);

    let vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNPAY_CONFIG.vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `Thanh toan don hang ${order.order_number || orderId.slice(0, 8)}`,
        vnp_OrderType: 'other',
        vnp_Amount: amountVND,
        vnp_ReturnUrl: VNPAY_CONFIG.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
    };

    if (bankCode) {
        vnpParams.vnp_BankCode = bankCode;
    }

    vnpParams = sortObject(vnpParams);

    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnpParams.vnp_SecureHash = signed;

    return `${VNPAY_CONFIG.vnp_Url}?${querystring.stringify(vnpParams, { encode: false })}`;
};

/**
 * Verify VNPay return/IPN data.
 */
const verifyReturnUrl = (query) => {
    assertConfigured();

    const vnpParams = Object.entries(query || {}).reduce((acc, [key, value]) => {
        if (key.startsWith('vnp_')) {
            acc[key] = normalizeParamValue(value);
        }
        return acc;
    }, {});

    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const responseCode = vnpParams.vnp_ResponseCode;
    const transactionStatus = vnpParams.vnp_TransactionStatus;
    const isValid = Boolean(secureHash) && secureHash === signed;

    return {
        isValid,
        success: isValid && responseCode === '00' && transactionStatus === '00',
        orderId: vnpParams.vnp_TxnRef,
        transactionNo: vnpParams.vnp_TransactionNo,
        bankCode: vnpParams.vnp_BankCode,
        amount: Number(vnpParams.vnp_Amount || 0) / 100,
        responseCode,
        transactionStatus,
        message: getResponseMessage(responseCode),
    };
};

const getResponseMessage = (code) => {
    const messages = {
        '00': 'Giao dich thanh cong',
        '07': 'Giao dich bi nghi ngo, vui long lien he VNPAY',
        '09': 'The hoac tai khoan chua dang ky Internet Banking',
        '10': 'Xac thuc thong tin the hoac tai khoan khong dung qua 3 lan',
        '11': 'Da het han cho thanh toan',
        '12': 'The hoac tai khoan bi khoa',
        '13': 'Sai mat khau OTP',
        '24': 'Khach hang huy giao dich',
        '51': 'Tai khoan khong du so du',
        '65': 'Tai khoan da vuot qua han muc giao dich trong ngay',
        '75': 'Ngan hang thanh toan dang bao tri',
        '79': 'Nhap sai mat khau thanh toan qua so lan quy dinh',
        '99': 'Loi khong xac dinh',
    };

    return messages[code] || 'Loi khong xac dinh';
};

module.exports = {
    createPaymentUrl,
    verifyReturnUrl,
    getResponseMessage,
    assertConfigured,
    formatVNPayDate,
    VNPAY_CONFIG,
};
