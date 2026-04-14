/**
 * Popup Service
 * AURA ARCHIVE - Popup management
 */

const { Popup } = require('../models');
const { Op } = require('sequelize');

/**
 * Get active popups for current page
 */
const getActivePopups = async (pagePath = '*') => {
    const now = new Date();

    const popups = await Popup.findAll({
        where: {
            is_active: true,
            [Op.and]: [
                {
                    [Op.or]: [
                        { starts_at: null },
                        { starts_at: { [Op.lte]: now } },
                    ],
                },
                {
                    [Op.or]: [
                        { ends_at: null },
                        { ends_at: { [Op.gte]: now } },
                    ],
                },
            ],
        },
        order: [['created_at', 'DESC']],
    });

    // Filter by display pages
    return popups.filter(popup => {
        const pages = popup.display_pages || ['*'];
        return pages.includes('*') || pages.includes(pagePath);
    });
};

/**
 * Get all popups (admin)
 */
const getAllPopups = async () => {
    return Popup.findAll({
        order: [['created_at', 'DESC']],
    });
};

/**
 * Create popup
 */
const createPopup = async (data) => {
    return Popup.create(data);
};

/**
 * Update popup
 */
const updatePopup = async (id, data) => {
    const popup = await Popup.findByPk(id);
    if (!popup) throw new Error('Popup not found');
    return popup.update(data);
};

/**
 * Delete popup
 */
const deletePopup = async (id) => {
    const popup = await Popup.findByPk(id);
    if (!popup) throw new Error('Popup not found');
    await popup.destroy();
    return { message: 'Popup deleted' };
};

module.exports = {
    getActivePopups,
    getAllPopups,
    createPopup,
    updatePopup,
    deletePopup,
};
