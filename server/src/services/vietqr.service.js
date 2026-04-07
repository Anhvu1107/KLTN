/**
 * VietQR Service
 * AURA ARCHIVE - Generate VietQR code for bank transfer
 */

// Bank info
const BANK_CONFIG = {
    bankId: process.env.VIETQR_BANK_ID || '970422', // MB Bank
    accountNo: process.env.VIETQR_ACCOUNT_NO || '0123456789',
    accountName: process.env.VIETQR_ACCOUNT_NAME || 'AURA ARCHIVE',
    template: 'compact2',
};

/**
 * Generate VietQR URL for an order
 * Uses VietQR API to generate QR code image
 */
const generateQRUrl = (order) => {
    const amountVND = Math.round(order.total_amount); // Prices are already in VND
    const description = `AURA ${order.order_number || order.id.slice(0, 8).toUpperCase()}`;

    // VietQR URL format
    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${amountVND}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;

    return {
        qrUrl,
        bankId: BANK_CONFIG.bankId,
        accountNo: BANK_CONFIG.accountNo,
        accountName: BANK_CONFIG.accountName,
        amount: amountVND,
        description,
    };
};

/**
 * Get bank name from bank ID
 */
const getBankName = (bankId) => {
    const banks = {
        '970422': 'MB Bank',
        '970415': 'VietinBank',
        '970436': 'Vietcombank',
        '970418': 'BIDV',
        '970405': 'Agribank',
        '970407': 'Techcombank',
        '970423': 'TPBank',
        '970432': 'VPBank',
        '970416': 'ACB',
        '970403': 'Sacombank',
    };
    return banks[bankId] || 'Bank';
};

module.exports = {
    generateQRUrl,
    getBankName,
    BANK_CONFIG,
};
