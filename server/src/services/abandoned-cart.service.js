/**
 * Abandoned Cart Service
 * AURA ARCHIVE - Track and recover abandoned carts
 */

const { AbandonedCart, User } = require('../models');
const crypto = require('crypto');
const { Op } = require('sequelize');

const ACTIVE_CART_STATUSES = ['active', 'recovered'];

const findLatestCartForUser = async (userId, statuses = ACTIVE_CART_STATUSES) => {
    if (!userId) {
        return null;
    }

    return AbandonedCart.findOne({
        where: {
            user_id: userId,
            status: { [Op.in]: statuses },
        },
        order: [['updated_at', 'DESC']],
    });
};

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
 * Create or update the latest trackable cart for a user
 */
const upsertAbandonedCart = async (data) => {
    const existingCart = await findLatestCartForUser(data.user_id, ['active']);

    if (existingCart) {
        return existingCart.update({
            email: data.email || existingCart.email,
            phone: data.phone || existingCart.phone,
            items: data.items,
            total_amount: data.total_amount,
            notes: data.notes ?? existingCart.notes,
        });
    }

    return saveAbandonedCart(data);
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
        order: [['updated_at', 'DESC']],
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
 * Mark the latest active cart for a user as recovered
 */
const markLatestCartAsRecovered = async (userId) => {
    const cart = await findLatestCartForUser(userId, ['active']);

    if (!cart) {
        return null;
    }

    return cart.update({
        status: 'recovered',
        recovered_at: new Date(),
    });
};

/**
 * Mark the latest tracked cart for a user as converted after checkout
 */
const markLatestCartAsConverted = async (userId) => {
    const cart = await findLatestCartForUser(userId, ACTIVE_CART_STATUSES);

    if (!cart) {
        return null;
    }

    return cart.update({
        status: 'converted',
        recovered_at: cart.recovered_at || new Date(),
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
    upsertAbandonedCart,
    getAbandonedCarts,
    getCartByToken,
    markAsRecovered,
    markLatestCartAsRecovered,
    markLatestCartAsConverted,
    updateReminderSent,
    getCartsNeedingReminder,
    addNote,
};
