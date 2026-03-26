/**
 * Banner Service
 * AURA ARCHIVE - Banner management with section filtering
 */

const { Banner } = require('../models');
const { Op } = require('sequelize');

/**
 * Get active banners, optionally filtered by section
 */
const getActiveBanners = async (section = null) => {
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

    if (section) {
        where.section = section;
    }

    const banners = await Banner.findAll({
        where,
        order: [['section', 'ASC'], ['position', 'ASC']],
    });

    return banners;
};

/**
 * Get all banners (admin)
 */
const getAllBanners = async () => {
    const banners = await Banner.findAll({
        order: [['section', 'ASC'], ['position', 'ASC'], ['created_at', 'DESC']],
    });
    return banners;
};

/**
 * Get banner by ID
 */
const getBannerById = async (id) => {
    const banner = await Banner.findByPk(id);
    if (!banner) {
        throw new Error('Banner not found');
    }
    return banner;
};

/**
 * Create banner
 */
const createBanner = async (data) => {
    const banner = await Banner.create(data);
    return banner;
};

/**
 * Update banner
 */
const updateBanner = async (id, data) => {
    const banner = await getBannerById(id);
    await banner.update(data);
    return banner;
};

/**
 * Delete banner
 */
const deleteBanner = async (id) => {
    const banner = await getBannerById(id);
    await banner.destroy();
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
