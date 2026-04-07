/**
 * VNPay Payment Service
 * AURA ARCHIVE - VNPay payment gateway integration
 */

const crypto = require('crypto');
const querystring = require('qs');

// VNPay Config - NO hardcoded credentials for security
const VNPAY_CONFIG = {
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_HashSecret: process.env.VNPAY_HASH_SECRET,
    vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/vnpay-return',
};

// Validate VNPay credentials on startup (production mode)
if (process.env.NODE_ENV === 'production') {
    if (!VNPAY_CONFIG.vnp_TmnCode || !VNPAY_CONFIG.vnp_HashSecret) {
        console.error('[VNPay] CRITICAL: Missing required VNPay credentials in production!');
        console.error('[VNPay] Please set VNPAY_TMN_CODE and VNPAY_HASH_SECRET environment variables.');
    }
}
/**
 * Sort object by keys
 */
const sortObject = (obj) => {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
};

/**
 * Create VNPay payment URL
 */
const createPaymentUrl = (order, ipAddr) => {
    const date = new Date();
    const createDate = date.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const orderId = date.getTime().toString();

    // VNPay requires amount in VND * 100
    const amountVND = Math.round(order.total_amount * 100); // VNPay requires amount * 100, prices already in VND

    let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: VNPAY_CONFIG.vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: order.id || orderId,
        vnp_OrderInfo: `Thanh toan don hang ${order.order_number || order.id.slice(0, 8)}`,
        vnp_OrderType: 'fashion',
        vnp_Amount: amountVND,
        vnp_ReturnUrl: VNPAY_CONFIG.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    const paymentUrl = VNPAY_CONFIG.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

    return paymentUrl;
};

/**
 * Verify VNPay return data
 */
const verifyReturnUrl = (query) => {
    const secureHash = query['vnp_SecureHash'];

    delete query['vnp_SecureHash'];
    delete query['vnp_SecureHashType'];

    const sortedParams = sortObject(query);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];

    return {
        isValid,
        success: isValid && responseCode === '00' && transactionStatus === '00',
        orderId: query['vnp_TxnRef'],
        transactionNo: query['vnp_TransactionNo'],
        bankCode: query['vnp_BankCode'],
        amount: parseInt(query['vnp_Amount']) / 100,
        responseCode,
        message: getResponseMessage(responseCode),
    };
};

/**
 * Get response message from VNPay response code
 */
const getResponseMessage = (code) => {
    const messages = {
        '00': 'Giao dịch thành công',
        '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên hệ VNPay)',
        '09': 'Thẻ/Tài khoản chưa đăng ký Internet Banking',
        '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
        '11': 'Đã hết hạn chờ thanh toán',
        '12': 'Thẻ/Tài khoản bị khóa',
        '13': 'Sai mật khẩu OTP',
        '24': 'Khách hàng hủy giao dịch',
        '51': 'Tài khoản không đủ số dư',
        '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
        '75': 'Ngân hàng thanh toán đang bảo trì',
        '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
        '99': 'Lỗi không xác định',
    };
    return messages[code] || 'Lỗi không xác định';
};

module.exports = {
    createPaymentUrl,
    verifyReturnUrl,
    getResponseMessage,
    VNPAY_CONFIG,
};
