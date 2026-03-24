/**
 * Product Search Service
 * AURA ARCHIVE - Fetch real products from internal Express API for AI recommendations
 * 
 * Ported from Python ai_service/app/services/product_search.py
 * Instead of HTTP calls to external service, uses internal axios calls to self.
 */

const axios = require('axios');

const BACKEND_API = `http://localhost:${process.env.PORT || 5000}/api/v1`;

// Bilingual color mapping: English → Vietnamese equivalents
const COLOR_TRANSLATIONS = {
    black: ['đen', 'den'],
    white: ['trắng', 'trang'],
    grey: ['xám', 'xam'],
    blue: ['xanh dương', 'xanh biển', 'xanh duong'],
    navy: ['xanh navy', 'xanh đậm', 'xanh dam'],
    green: ['xanh lá', 'xanh la'],
    olive: ['xanh rêu', 'xanh reu'],
    red: ['đỏ', 'do'],
    burgundy: ['đỏ đô', 'đỏ rượu', 'do do'],
    cream: ['kem', 'be'],
    brown: ['nâu', 'nau'],
    pink: ['hồng', 'hong'],
    yellow: ['vàng', 'vang'],
    purple: ['tím', 'tim'],
    orange: ['cam'],
};

function colorMatches(variantColor, searchColor) {
    if (!variantColor || !searchColor) return false;
    const variantLower = variantColor.toLowerCase().trim();
    const searchLower = searchColor.toLowerCase().trim();

    // Direct match
    if (searchLower.includes(variantLower) || variantLower.includes(searchLower)) return true;

    // Check Vietnamese translations
    const viNames = COLOR_TRANSLATIONS[searchLower] || [];
    for (const vi of viNames) {
        if (vi.includes(variantLower) || variantLower.includes(vi)) return true;
    }

    // Reverse check
    for (const [en, viList] of Object.entries(COLOR_TRANSLATIONS)) {
        if (viList.includes(searchLower) || viList.some(v => searchLower.includes(v))) {
            if (en.includes(variantLower) || variantLower.includes(en)) return true;
        }
    }

    return false;
}

async function searchProducts({
    search = null,
    category = null,
    brand = null,
    color = null,
    minPrice = null,
    maxPrice = null,
    limit = 5,
    sort = 'newest',
} = {}) {
    const params = { limit, sort };

    if (search && category && search.toLowerCase() === category.toLowerCase()) {
        // Category alone is sufficient
    } else if (search && category && brand) {
        params.search = brand;
    } else if (search) {
        params.search = search;
    }
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;

    try {
        const response = await axios.get(`${BACKEND_API}/products`, {
            params,
            timeout: 10000,
        });

        if (response.status === 200) {
            let products = response.data?.data?.products || [];

            // Post-filter by color (bilingual matching)
            if (color && products.length > 0) {
                const filtered = products.filter(p => {
                    const variants = Array.isArray(p.variants) ? p.variants : [];
                    return variants.some(v => colorMatches(v.color || '', color));
                });
                if (filtered.length > 0) return filtered;
            }

            return products;
        }
        console.log(`[ProductSearch] API returned ${response.status}`);
        return [];
    } catch (e) {
        console.log(`[ProductSearch] Error fetching products: ${e.message}`);
        return [];
    }
}

async function getProductBySlug(slug) {
    try {
        const response = await axios.get(`${BACKEND_API}/products/${slug}`, { timeout: 10000 });
        if (response.status === 200) {
            return response.data?.data?.product || null;
        }
        return null;
    } catch (e) {
        console.log(`[ProductSearch] Error fetching product: ${e.message}`);
        return null;
    }
}

async function getInventorySummary() {
    try {
        const response = await axios.get(`${BACKEND_API}/products/inventory-summary`, { timeout: 10000 });
        if (response.status === 200) {
            return response.data?.data?.summary || {};
        }
        console.log(`[ProductSearch] Inventory API returned ${response.status}`);
        return {};
    } catch (e) {
        console.log(`[ProductSearch] Error fetching inventory summary: ${e.message}`);
        return {};
    }
}

function buildProductContextForAi(products) {
    if (!products || products.length === 0) {
        return 'No products found matching the criteria.';
    }

    const lines = [`Found ${products.length} matching products:\n`];

    products.forEach((p, i) => {
        const name = p.name || 'Unknown';
        const brand = p.brand || '';
        const slug = p.slug || '';
        const basePrice = p.base_price || 0;
        const salePrice = p.sale_price;
        const category = p.category || '';
        const condition = p.condition_text || '';
        const description = (p.description || '').substring(0, 150);

        const variants = Array.isArray(p.variants) ? p.variants : [];
        const variantParts = [];
        let hasAvailable = false;

        for (const v of variants) {
            if (v && typeof v === 'object') {
                const parts = [];
                if (v.size) parts.push(`Size ${v.size}`);
                if (v.color) parts.push(v.color);
                if (v.material) parts.push(v.material);
                const status = v.status || '';
                if (status === 'AVAILABLE') { parts.push('Con hang'); hasAvailable = true; }
                else if (status === 'SOLD') parts.push('Da ban');
                else if (status === 'RESERVED') parts.push('Dang giu');
                variantParts.push(parts.join(', '));
            }
        }

        const variantStr = variantParts.join(' | ');
        const availability = hasAvailable ? 'CON HANG' : 'HET HANG';

        let priceStr = `${Math.floor(parseFloat(basePrice)).toLocaleString('vi-VN')}₫`;
        if (salePrice) priceStr += ` (sale: ${Math.floor(parseFloat(salePrice)).toLocaleString('vi-VN')}₫)`;

        lines.push(
            `${i + 1}. ${name} — ${brand}\n` +
            `   Category: ${category}, Condition: ${condition}\n` +
            `   Tinh trang: ${availability}\n` +
            `   Price: ${priceStr}\n` +
            `   Variant: ${variantStr}\n` +
            `   Link: [Xem chi tiết](/shop/${slug})\n` +
            `   Description: ${description}...\n`
        );
    });

    return lines.join('\n');
}

function buildInventoryContextForAi(summary) {
    if (!summary || Object.keys(summary).length === 0) {
        return 'Không thể lấy thông tin kho hàng lúc này.';
    }

    const total = summary.total_products || 0;
    const available = summary.total_available || 0;
    const sold = summary.total_sold || 0;
    const reserved = summary.total_reserved || 0;
    const categories = summary.categories || [];
    const brands = summary.top_brands || [];
    const priceRange = summary.price_range || {};

    const lines = [
        'TỔNG QUAN KHO HÀNG AURA ARCHIVE:',
        `  Tổng sản phẩm: ${total}`,
        `  Còn hàng (AVAILABLE): ${available} variant`,
        `  Đã bán (SOLD): ${sold} variant`,
        `  Đang giữ (RESERVED): ${reserved} variant`,
    ];

    if (priceRange.min && priceRange.max) {
        lines.push(`  Tầm giá: ${Math.floor(parseFloat(priceRange.min)).toLocaleString('vi-VN')}₫ – ${Math.floor(parseFloat(priceRange.max)).toLocaleString('vi-VN')}₫`);
    }

    if (categories.length > 0) {
        lines.push('\n  PHÂN LOẠI THEO CATEGORY:');
        for (const cat of categories) {
            lines.push(`    • ${cat.category || 'N/A'}: ${cat.product_count || 0} sản phẩm`);
        }
    }

    if (brands.length > 0) {
        lines.push('\n  TOP BRANDS:');
        for (const b of brands) {
            lines.push(`    • ${b.brand || 'N/A'}: ${b.product_count || 0} sản phẩm`);
        }
    }

    return lines.join('\n');
}

module.exports = {
    searchProducts,
    getProductBySlug,
    getInventorySummary,
    buildProductContextForAi,
    buildInventoryContextForAi,
    colorMatches,
};
