const DEFAULT_PRODUCT_SIZE_GROUPS = Object.freeze({
    default: ['One Size', 'Free Size'],
    Tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Outerwear: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Dresses: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Pants: ['26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
    Shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    Bags: ['Mini', 'Small', 'Medium', 'Large', 'One Size'],
    Accessories: ['One Size', 'Free Size'],
    Jewelry: ['One Size', 'Free Size'],
    Watches: ['One Size'],
});

const sanitizeSizeList = (sizes) => {
    if (!Array.isArray(sizes)) return [];

    const uniqueSizes = [];

    for (const size of sizes) {
        if (typeof size !== 'string') continue;
        const normalized = size.trim();
        if (!normalized || uniqueSizes.includes(normalized)) continue;
        uniqueSizes.push(normalized);
    }

    return uniqueSizes;
};

const cloneSizeGroups = (groups = DEFAULT_PRODUCT_SIZE_GROUPS) => {
    return Object.entries(groups).reduce((acc, [key, sizes]) => {
        acc[key] = sanitizeSizeList(sizes);
        return acc;
    }, {});
};

const normalizeSizeGroups = (rawGroups, categories = []) => {
    const normalizedGroups = cloneSizeGroups();

    if (rawGroups && typeof rawGroups === 'object' && !Array.isArray(rawGroups)) {
        for (const [key, sizes] of Object.entries(rawGroups)) {
            if (typeof key !== 'string') continue;
            const normalizedKey = key.trim();
            if (!normalizedKey) continue;
            normalizedGroups[normalizedKey] = sanitizeSizeList(sizes);
        }
    }

    for (const category of categories) {
        const categoryKey = typeof category === 'string' ? category : category?.value;
        if (!categoryKey || typeof categoryKey !== 'string') continue;

        if (!Object.prototype.hasOwnProperty.call(normalizedGroups, categoryKey)) {
            normalizedGroups[categoryKey] = cloneSizeGroups()[categoryKey] || [...(normalizedGroups.default || DEFAULT_PRODUCT_SIZE_GROUPS.default)];
        }
    }

    if (!Object.prototype.hasOwnProperty.call(normalizedGroups, 'default')) {
        normalizedGroups.default = [...DEFAULT_PRODUCT_SIZE_GROUPS.default];
    }

    return normalizedGroups;
};

const flattenSizeGroups = (groups) => {
    const flattened = [];
    const normalizedGroups = normalizeSizeGroups(groups);

    for (const sizes of Object.values(normalizedGroups)) {
        for (const size of sizes) {
            if (!flattened.includes(size)) {
                flattened.push(size);
            }
        }
    }

    return flattened;
};

const applyLegacySizesFallback = (groups, legacySizes = []) => {
    const normalizedLegacySizes = sanitizeSizeList(legacySizes);

    if (!normalizedLegacySizes.length) {
        return normalizeSizeGroups(groups);
    }

    const normalizedGroups = normalizeSizeGroups(groups);
    normalizedGroups.default = [...normalizedLegacySizes];

    for (const categoryKey of ['Tops', 'Outerwear', 'Dresses']) {
        normalizedGroups[categoryKey] = [...normalizedLegacySizes];
    }

    return normalizedGroups;
};

const getSizesForCategory = (groups, category) => {
    const normalizedGroups = normalizeSizeGroups(groups);

    if (category && Object.prototype.hasOwnProperty.call(normalizedGroups, category)) {
        return [...normalizedGroups[category]];
    }

    return [...(normalizedGroups.default || DEFAULT_PRODUCT_SIZE_GROUPS.default)];
};

const getDefaultSizeForCategory = (category, groups) => {
    const sizes = getSizesForCategory(groups, category);
    return sizes[0] || 'One Size';
};

module.exports = {
    DEFAULT_PRODUCT_SIZE_GROUPS,
    sanitizeSizeList,
    cloneSizeGroups,
    normalizeSizeGroups,
    flattenSizeGroups,
    applyLegacySizesFallback,
    getSizesForCategory,
    getDefaultSizeForCategory,
};
