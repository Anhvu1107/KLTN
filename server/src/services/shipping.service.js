/**
 * Shipping Service
 * AURA ARCHIVE - Calculate shipping fee based on location
 */

// Base shipping rates (VND)
const SHIPPING_RATES = {
    // Inner city (Ho Chi Minh, Hanoi)
    inner: {
        fee: 25000,
        estimatedDays: '1-2',
    },
    // Suburban districts
    suburban: {
        fee: 30000,
        estimatedDays: '2-3',
    },
    // Other cities
    other: {
        fee: 35000,
        estimatedDays: '3-5',
    },
    // Remote areas
    remote: {
        fee: 45000,
        estimatedDays: '5-7',
    },
};

// Inner city districts
const INNER_DISTRICTS = {
    'Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 10', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình'],
    'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân'],
};

// Major cities
const MAJOR_CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Bình Dương', 'Đồng Nai'];

// Remote provinces
const REMOTE_PROVINCES = ['Lai Châu', 'Điện Biên', 'Hà Giang', 'Cao Bằng', 'Lào Cai', 'Kon Tum', 'Gia Lai'];

/**
 * Calculate shipping fee based on destination
 */
const calculateShippingFee = (province, district) => {
    // Check remote areas first
    if (REMOTE_PROVINCES.includes(province)) {
        return SHIPPING_RATES.remote;
    }

    // Check inner city
    if (INNER_DISTRICTS[province]?.includes(district)) {
        return SHIPPING_RATES.inner;
    }

    // Check major cities
    if (MAJOR_CITIES.includes(province)) {
        return SHIPPING_RATES.suburban;
    }

    // Default to other areas
    return SHIPPING_RATES.other;
};

/**
 * Get free shipping threshold
 * Orders above this amount get free shipping
 */
const getFreeShippingThreshold = () => {
    return 2000000; // 2,000,000 VND
};

/**
 * Check if order qualifies for free shipping
 */
const isFreeShipping = (orderAmountVND) => {
    return orderAmountVND >= getFreeShippingThreshold();
};

/**
 * Get shipping options
 */
const getShippingOptions = (province, district, orderAmountVND = 0) => {
    const baseShipping = calculateShippingFee(province, district);
    const freeShippingEligible = isFreeShipping(orderAmountVND);

    return {
        standard: {
            name: 'Giao hàng tiêu chuẩn',
            fee: freeShippingEligible ? 0 : baseShipping.fee,
            originalFee: baseShipping.fee,
            estimatedDays: baseShipping.estimatedDays,
            isFree: freeShippingEligible,
        },
        express: {
            name: 'Giao hàng nhanh',
            fee: baseShipping.fee + 20000,
            estimatedDays: '1-2',
            isFree: false,
        },
    };
};

module.exports = {
    calculateShippingFee,
    getShippingOptions,
    getFreeShippingThreshold,
    isFreeShipping,
    SHIPPING_RATES,
};
