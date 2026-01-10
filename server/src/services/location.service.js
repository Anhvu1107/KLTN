/**
 * Location Service
 * AURA ARCHIVE - Vietnam provinces, districts, wards data
 */

// Vietnam location data (simplified)
const VIETNAM_LOCATIONS = {
    'Hà Nội': {
        districts: ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Thanh Xuân', 'Cầu Giấy', 'Hoàng Mai', 'Long Biên', 'Tây Hồ', 'Bắc Từ Liêm', 'Nam Từ Liêm', 'Hà Đông'],
    },
    'Hồ Chí Minh': {
        districts: ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Tân Phú', 'Thủ Đức'],
    },
    'Đà Nẵng': {
        districts: ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'],
    },
    'Hải Phòng': {
        districts: ['Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Kiến An', 'Hải An', 'Đồ Sơn', 'Dương Kinh'],
    },
    'Cần Thơ': {
        districts: ['Ninh Kiều', 'Cái Răng', 'Bình Thủy', 'Ô Môn', 'Thốt Nốt', 'Phong Điền', 'Cờ Đỏ', 'Vĩnh Thạnh', 'Thới Lai'],
    },
    'Bình Dương': {
        districts: ['Thủ Dầu Một', 'Thuận An', 'Dĩ An', 'Bến Cát', 'Tân Uyên', 'Bàu Bàng', 'Phú Giáo', 'Dầu Tiếng', 'Bắc Tân Uyên'],
    },
    'Đồng Nai': {
        districts: ['Biên Hòa', 'Long Khánh', 'Long Thành', 'Nhơn Trạch', 'Trảng Bom', 'Thống Nhất', 'Cẩm Mỹ', 'Vĩnh Cửu', 'Xuân Lộc', 'Định Quán', 'Tân Phú'],
    },
    'Khánh Hòa': {
        districts: ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Diên Khánh', 'Vạn Ninh', 'Khánh Vĩnh', 'Khánh Sơn', 'Trường Sa', 'Cam Lâm'],
    },
    'Thừa Thiên Huế': {
        districts: ['TP Huế', 'Phong Điền', 'Quảng Điền', 'Phú Vang', 'Hương Thủy', 'Hương Trà', 'A Lưới', 'Nam Đông', 'Phú Lộc'],
    },
    'Quảng Ninh': {
        districts: ['Hạ Long', 'Móng Cái', 'Cẩm Phả', 'Uông Bí', 'Đông Triều', 'Quảng Yên', 'Vân Đồn', 'Hoành Bồ', 'Tiên Yên', 'Đầm Hà', 'Hải Hà', 'Ba Chẽ', 'Bình Liêu', 'Cô Tô'],
    },
};

/**
 * Get all provinces
 */
const getProvinces = () => {
    return Object.keys(VIETNAM_LOCATIONS);
};

/**
 * Get districts by province
 */
const getDistricts = (province) => {
    return VIETNAM_LOCATIONS[province]?.districts || [];
};

/**
 * Search locations
 */
const searchLocations = (query) => {
    const results = [];
    const q = query.toLowerCase();

    for (const [province, data] of Object.entries(VIETNAM_LOCATIONS)) {
        if (province.toLowerCase().includes(q)) {
            results.push({ type: 'province', name: province });
        }
        for (const district of data.districts) {
            if (district.toLowerCase().includes(q)) {
                results.push({ type: 'district', name: district, province });
            }
        }
    }

    return results.slice(0, 10);
};

module.exports = {
    getProvinces,
    getDistricts,
    searchLocations,
    VIETNAM_LOCATIONS,
};
