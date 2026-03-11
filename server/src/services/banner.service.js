/**
 * Banner Service
 * AURA ARCHIVE - Banner management
 */

const { Banner } = require('../models');
const { Op } = require('sequelize');

/**
 * Get active banners for homepage
 */
const getActiveBanners = async () => {
    const now = new Date();

    const banners = await Banner.findAll({
        where: {
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
        },
        order: [['position', 'ASC']],
    });

    return banners;
};

/**
 * Get all banners (admin)
 */
const getAllBanners = async () => {
    const banners = await Banner.findAll({
        order: [['position', 'ASC'], ['created_at', 'DESC']],
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
