/**
 * Abandoned Cart Service
 * AURA ARCHIVE - Track and recover abandoned carts
 */

const { AbandonedCart, User } = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Save abandoned cart
 */
const saveAbandonedCart = async (data) => {
    const recoveryToken = crypto.randomBytes(32).toString('hex');

    const cart = await AbandonedCart.create({
        ...data,
        recovery_token: recoveryToken,
    });

    return cart;
};

/**
 * Get abandoned carts for admin
 */
const getAbandonedCarts = async (page = 1, limit = 20, status = null) => {
    const where = {};
    if (status) where.status = status;

    const offset = (page - 1) * limit;

    const { rows: carts, count: total } = await AbandonedCart.findAndCountAll({
        where,
        include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] }],
        order: [['created_at', 'DESC']],
        limit,
        offset,
    });

    return {
        carts,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
};

/**
 * Get cart by recovery token
 */
const getCartByToken = async (token) => {
    return AbandonedCart.findOne({
        where: { recovery_token: token, status: 'active' },
    });
};

/**
 * Mark cart as recovered
 */
const markAsRecovered = async (id) => {
    const cart = await AbandonedCart.findByPk(id);
    if (!cart) throw new Error('Cart not found');

    return cart.update({
        status: 'recovered',
        recovered_at: new Date(),
    });
};

/**
 * Update reminder sent
 */
const updateReminderSent = async (id) => {
    const cart = await AbandonedCart.findByPk(id);
    if (!cart) throw new Error('Cart not found');

    return cart.update({
        reminder_sent_at: new Date(),
        reminder_count: cart.reminder_count + 1,
    });
};

/**
 * Get carts needing reminder (not sent in last 24h, active)
 */
const getCartsNeedingReminder = async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return AbandonedCart.findAll({
        where: {
            status: 'active',
            created_at: { [Op.lt]: oneHourAgo }, // At least 1 hour old
            reminder_count: { [Op.lt]: 3 }, // Max 3 reminders
            [Op.or]: [
                { reminder_sent_at: null },
                { reminder_sent_at: { [Op.lt]: oneDayAgo } },
            ],
        },
        include: [{ model: User, as: 'user' }],
    });
};

/**
 * Add admin note
 */
const addNote = async (id, note) => {
    const cart = await AbandonedCart.findByPk(id);
    if (!cart) throw new Error('Cart not found');

    return cart.update({ notes: note });
};

module.exports = {
    saveAbandonedCart,
    getAbandonedCarts,
    getCartByToken,
    markAsRecovered,
    updateReminderSent,
    getCartsNeedingReminder,
    addNote,
};
