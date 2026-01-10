/**
 * Location Controller
 * AURA ARCHIVE - Vietnam location API
 */

const locationService = require('../services/location.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/locations/provinces
 */
const getProvinces = catchAsync(async (req, res) => {
    const provinces = locationService.getProvinces();

    res.status(200).json({
        success: true,
        data: { provinces },
    });
});

/**
 * GET /api/v1/locations/districts/:province
 */
const getDistricts = catchAsync(async (req, res) => {
    const districts = locationService.getDistricts(req.params.province);

    res.status(200).json({
        success: true,
        data: { districts },
    });
});

/**
 * GET /api/v1/locations/search
 */
const searchLocations = catchAsync(async (req, res) => {
    const { q } = req.query;
    const results = locationService.searchLocations(q || '');

    res.status(200).json({
        success: true,
        data: { results },
    });
});

module.exports = {
    getProvinces,
    getDistricts,
    searchLocations,
};
