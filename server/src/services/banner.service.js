/**
 * Banner Service
 * AURA ARCHIVE - Banner management with section filtering
 */

const { Banner } = require('../models');
const { Op } = require('sequelize');

let bannerSchemaPromise = null;

const getBannerSchema = async () => {
    if (!bannerSchemaPromise) {
        bannerSchemaPromise = Banner.sequelize.getQueryInterface()
            .describeTable(Banner.getTableName())
            .then((columns) => {
                const attributes = Object.entries(Banner.rawAttributes)
                    .filter(([attributeName, attribute]) => {
                        const columnName = attribute.field || attribute.fieldName || attributeName;
                        return Boolean(columns[columnName]);
                    })
                    .map(([attributeName]) => attributeName);

                const writableFields = attributes.filter((attributeName) => !['id', 'createdAt', 'updatedAt'].includes(attributeName));

                return {
                    attributes,
                    hasPosition: Boolean(columns.position),
                    hasSection: Boolean(columns.section),
                    writableFields,
                };
            })
            .catch((error) => {
                bannerSchemaPromise = null;
                throw error;
            });
    }

    return bannerSchemaPromise;
};

const normalizeBanner = (banner, schema) => {
    const plainBanner = banner?.get ? banner.get({ plain: true }) : banner;

    if (!plainBanner) {
        return plainBanner;
    }

    return {
        ...plainBanner,
        position: schema.hasPosition ? plainBanner.position ?? 0 : 0,
        section: schema.hasSection ? plainBanner.section ?? 'general' : 'general',
    };
};

const sanitizeBannerData = (data, schema) => {
    return Object.fromEntries(
        Object.entries(data).filter(([key, value]) => schema.writableFields.includes(key) && value !== undefined)
    );
};

const buildBannerOrder = (schema, { includeCreatedAt = false } = {}) => {
    const order = [];

    if (schema.hasSection) {
        order.push(['section', 'ASC']);
    }

    if (schema.hasPosition) {
        order.push(['position', 'ASC']);
    }

    if (includeCreatedAt) {
        order.push(['createdAt', 'DESC']);
    }

    return order;
};

const findBannerById = async (id, schema) => {
    return Banner.findOne({
        where: { id },
        attributes: schema.attributes,
    });
};

/**
 * Get active banners, optionally filtered by section
 */
const getActiveBanners = async (section = null) => {
    const schema = await getBannerSchema();
    const now = new Date();

    const where = {
        is_active: true,
        [Op.or]: [
            { starts_at: null, ends_at: null },
            {
                starts_at: { [Op.lte]: now },
                [Op.or]: [
                    { ends_at: null },
                    { ends_at: { [Op.gte]: now } },
                ],
            },
        ],
    };

    if (section && schema.hasSection) {
        where.section = section;
    }

    const banners = await Banner.findAll({
        attributes: schema.attributes,
        where,
        order: buildBannerOrder(schema),
    });

    return banners.map((banner) => normalizeBanner(banner, schema));
};

/**
 * Get all banners (admin)
 */
const getAllBanners = async () => {
    const schema = await getBannerSchema();
    const banners = await Banner.findAll({
        attributes: schema.attributes,
        order: buildBannerOrder(schema, { includeCreatedAt: true }),
    });
    return banners.map((banner) => normalizeBanner(banner, schema));
};

/**
 * Get banner by ID
 */
const getBannerById = async (id) => {
    const schema = await getBannerSchema();
    const banner = await findBannerById(id, schema);

    if (!banner) {
        throw new Error('Banner not found');
    }

    return normalizeBanner(banner, schema);
};

/**
 * Create banner
 */
const createBanner = async (data) => {
    const schema = await getBannerSchema();
    const sanitizedData = sanitizeBannerData(data, schema);

    const banner = await Banner.create(sanitizedData, {
        fields: schema.writableFields,
    });

    return getBannerById(banner.id);
};

/**
 * Update banner
 */
const updateBanner = async (id, data) => {
    const schema = await getBannerSchema();
    const banner = await findBannerById(id, schema);

    if (!banner) {
        throw new Error('Banner not found');
    }

    const sanitizedData = sanitizeBannerData(data, schema);

    await banner.update(sanitizedData, {
        fields: Object.keys(sanitizedData),
    });

    return getBannerById(id);
};

/**
 * Delete banner
 */
const deleteBanner = async (id) => {
    const deletedCount = await Banner.destroy({
        where: { id },
    });

    if (!deletedCount) {
        throw new Error('Banner not found');
    }

    return { message: 'Banner deleted' };
};

module.exports = {
    getActiveBanners,
    getAllBanners,
    getBannerById,
    createBanner,
    updateBanner,
    deleteBanner,
};
