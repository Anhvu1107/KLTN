/**
 * Product Search Service
 * AURA ARCHIVE - Fetch real products directly from product services for AI recommendations
 *
 * Uses internal business logic instead of HTTP calls to reduce latency for AI/voice flows.
 */

const productService = require('../product.service');
const { CATEGORY_ALIASES, normalizeForMatching } = require('./intent-classifier');

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

const GENERIC_SEARCH_PHRASES = [
    'gioi thieu',
    'goi y',
    'de xuat',
    'dua dai',
    'dua 1 cai',
    'dua mot cai',
    'chon dum',
    'chon giup',
    'mau nao',
    'co mau nao',
    'bat ky',
    'any',
    'whatever',
];

function escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholePhrase(text, phrase) {
    const normalizedText = normalizeForMatching(text);
    const normalizedPhrase = normalizeForMatching(phrase);

    if (!normalizedText || !normalizedPhrase) return false;

    return new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizedPhrase)}(?=$|[^a-z0-9])`, 'i')
        .test(normalizedText);
}

function isCategoryOnlySearch(searchText, categoryText) {
    const normalizedSearch = normalizeForMatching(searchText);
    const normalizedCategory = normalizeForMatching(categoryText);

    if (!normalizedSearch) return true;
    if (normalizedSearch === normalizedCategory) return true;

    const aliases = CATEGORY_ALIASES[categoryText] || [];
    if (aliases.some((alias) => normalizeForMatching(alias) === normalizedSearch)) {
        return true;
    }

    return GENERIC_SEARCH_PHRASES.some((phrase) => containsWholePhrase(normalizedSearch, phrase));
}

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
    size = null,
    minPrice = null,
    maxPrice = null,
    limit = 5,
    sort = 'newest',
} = {}) {
    const searchText = typeof search === 'string' ? search.trim() : '';
    const brandText = typeof brand === 'string' ? brand.trim() : '';
    const categoryText = typeof category === 'string' ? category.trim() : '';
    const shouldIgnoreSearch = categoryText && isCategoryOnlySearch(searchText, categoryText);
    const effectiveSearchText = shouldIgnoreSearch ? '' : searchText;
    const query = {};

    if (effectiveSearchText && categoryText && effectiveSearchText.toLowerCase() === categoryText.toLowerCase()) {
        // Category alone is sufficient.
    } else if (effectiveSearchText && categoryText && brandText) {
        query.search = brandText;
    } else if (effectiveSearchText) {
        query.search = effectiveSearchText;
    }

    if (categoryText) query.category = categoryText;
    if (brandText) query.brand = brandText;
    if (minPrice) query.minPrice = minPrice;
    if (maxPrice) query.maxPrice = maxPrice;
    query.limit = Math.max(limit * 3, 12);
    query.sort = sort;
    query.status = 'AVAILABLE';

    try {
        const result = await productService.getProducts(query);
        let products = Array.isArray(result?.products) ? result.products : [];

        products = products.filter((product) => {
            const variants = Array.isArray(product?.variants) ? product.variants : [];
            return variants.some((variant) => variant?.status === 'AVAILABLE');
        });

        // Post-filter by color (bilingual matching)
        if (color && products.length > 0) {
            const filtered = products.filter(p => {
                const variants = Array.isArray(p.variants) ? p.variants : [];
                return variants.some(v => v?.status === 'AVAILABLE' && colorMatches(v.color || '', color));
            });
            if (filtered.length > 0) {
                products = filtered;
            }
        }

        // Post-filter by size
        const sizeText = typeof size === 'string' ? size.trim().toUpperCase() : '';
        if (sizeText && products.length > 0) {
            // Debug: log all available sizes
            const allSizes = products.flatMap(p => {
                const variants = Array.isArray(p.variants) ? p.variants : [];
                return variants
                    .filter(v => v?.status === 'AVAILABLE')
                    .map(v => `${p.name}: "${v.size}"`);
            });
            console.log(`[ProductSearch] Size filter: looking for "${sizeText}", available sizes:`, allSizes.slice(0, 15));

            const filtered = products.filter(p => {
                const variants = Array.isArray(p.variants) ? p.variants : [];
                return variants.some(v =>
                    v?.status === 'AVAILABLE'
                    && v.size
                    && v.size.trim().toUpperCase() === sizeText
                );
            });
            console.log(`[ProductSearch] Size filter result: ${filtered.length}/${products.length} products match size "${sizeText}"`);
            if (filtered.length > 0) {
                products = filtered;
            }
        }

        const ranked = products
            .map((product) => ({
                product,
                score: scoreProduct(product, {
                    search: effectiveSearchText,
                    brand: brandText,
                    category: categoryText,
                    color,
                    size: sizeText,
                    minPrice,
                    maxPrice,
                }),
            }))
            .sort((left, right) => right.score - left.score)
            .map((entry) => entry.product)
            .slice(0, limit);

        return ranked;
    } catch (e) {
        console.log(`[ProductSearch] Error fetching products: ${e.message}`);
        return [];
    }
}

async function getProductBySlug(slug) {
    try {
        return await productService.getProductByIdOrSlug(slug);
    } catch (e) {
        console.log(`[ProductSearch] Error fetching product: ${e.message}`);
        return null;
    }
}

async function getInventorySummary() {
    try {
        return await productService.getInventorySummary();
    } catch (e) {
        console.log(`[ProductSearch] Error fetching inventory summary: ${e.message}`);
        return {};
    }
}

function scoreProduct(product, criteria = {}) {
    let score = 0;
    const name = (product?.name || '').toLowerCase();
    const brand = (product?.brand || '').toLowerCase();
    const category = (product?.category || '').toLowerCase();
    const description = (product?.description || '').toLowerCase();
    const search = (criteria.search || '').toLowerCase();
    const wantedBrand = (criteria.brand || '').toLowerCase();
    const wantedCategory = (criteria.category || '').toLowerCase();
    const variants = Array.isArray(product?.variants) ? product.variants : [];

    if (wantedBrand && brand.includes(wantedBrand)) score += 10;
    if (wantedCategory && category === wantedCategory.toLowerCase()) score += 8;

    if (search) {
        if (name.includes(search)) score += 8;
        if (brand.includes(search)) score += 6;
        if (description.includes(search)) score += 3;
    }

    const availableVariants = variants.filter((variant) => variant?.status === 'AVAILABLE');
    score += Math.min(availableVariants.length, 3) * 2;

    if (criteria.color && availableVariants.some((variant) => colorMatches(variant?.color || '', criteria.color))) {
        score += 4;
    }

    if (criteria.size) {
        const sizeUpper = criteria.size.toUpperCase();
        if (availableVariants.some((variant) => variant?.size && variant.size.toUpperCase() === sizeUpper)) {
            score += 6;
        }
    }

    if (criteria.minPrice || criteria.maxPrice) {
        const price = parseFloat(product?.sale_price || product?.base_price || 0);
        if (!criteria.minPrice || price >= criteria.minPrice) score += 2;
        if (!criteria.maxPrice || price <= criteria.maxPrice) score += 2;
    }

    if (product?.sale_price) score += 1;
    if ((product?.condition_text || '').includes('10/10')) score += 2;
    if ((product?.condition_text || '').includes('9/10')) score += 1;

    return score;
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
