/**
 * Address Service
 * AURA ARCHIVE - Business logic for user addresses
 */

const { Address } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Get all addresses for a user
 */
const getUserAddresses = async (userId) => {
    const addresses = await Address.findAll({
        where: { user_id: userId },
        order: [['is_default', 'DESC'], ['created_at', 'DESC']],
    });

    return addresses;
};

/**
 * Get address by ID
 */
const getAddressById = async (userId, addressId) => {
    const address = await Address.findOne({
        where: {
            id: addressId,
            user_id: userId,
        },
    });

    if (!address) {
        throw new AppError('Address not found', 404);
    }

    return address;
};

/**
 * Get default address
 */
const getDefaultAddress = async (userId) => {
    const address = await Address.findOne({
        where: {
            user_id: userId,
            is_default: true,
        },
    });

    return address;
};

/**
 * Create new address
 */
const createAddress = async (userId, data) => {
    const {
        label,
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        district,
        ward,
        postal_code,
        country,
        is_default,
    } = data;

    // If this is the first address or set as default, unset other defaults
    if (is_default) {
        await Address.update(
            { is_default: false },
            { where: { user_id: userId } }
        );
    }

    // Check if user has any addresses
    const existingCount = await Address.count({ where: { user_id: userId } });
    const shouldBeDefault = is_default || existingCount === 0;

    const address = await Address.create({
        user_id: userId,
        label,
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        district,
        ward,
        postal_code,
        country: country || 'Vietnam',
        is_default: shouldBeDefault,
    });

    return address;
};

/**
 * Update address
 */
const updateAddress = async (userId, addressId, data) => {
    const address = await getAddressById(userId, addressId);

    const {
        label,
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        district,
        ward,
        postal_code,
        country,
        is_default,
    } = data;

    // If setting as default, unset other defaults
    if (is_default && !address.is_default) {
        await Address.update(
            { is_default: false },
            { where: { user_id: userId } }
        );
    }

    await address.update({
        label: label !== undefined ? label : address.label,
        full_name: full_name || address.full_name,
        phone: phone || address.phone,
        address_line1: address_line1 || address.address_line1,
        address_line2: address_line2 !== undefined ? address_line2 : address.address_line2,
        city: city || address.city,
        district: district !== undefined ? district : address.district,
        ward: ward !== undefined ? ward : address.ward,
        postal_code: postal_code !== undefined ? postal_code : address.postal_code,
        country: country || address.country,
        is_default: is_default !== undefined ? is_default : address.is_default,
    });

    return address;
};

/**
 * Delete address
 */
const deleteAddress = async (userId, addressId) => {
    const address = await getAddressById(userId, addressId);
    const wasDefault = address.is_default;

    await address.destroy();

    // If deleted was default, set another as default
    if (wasDefault) {
        const nextAddress = await Address.findOne({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
        });
        if (nextAddress) {
            await nextAddress.update({ is_default: true });
        }
    }

    return { message: 'Address deleted successfully' };
};

/**
 * Set address as default
 */
const setDefaultAddress = async (userId, addressId) => {
    const address = await getAddressById(userId, addressId);

    // Unset all defaults
    await Address.update(
        { is_default: false },
        { where: { user_id: userId } }
    );

    // Set this as default
    await address.update({ is_default: true });

    return address;
};

module.exports = {
    getUserAddresses,
    getAddressById,
    getDefaultAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
};
