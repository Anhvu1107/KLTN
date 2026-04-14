/**
 * Popup Controller
 * AURA ARCHIVE - Public popup API handlers
 */

const popupService = require('../services/popup.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/popups
 * Get active popups for the current page path
 */
const getActivePopups = catchAsync(async (req, res) => {
    const pagePath = req.query.path || '*';
    const popups = await popupService.getActivePopups(pagePath);

    res.status(200).json({
        success: true,
        data: { popups },
    });
});

module.exports = {
    getActivePopups,
};
