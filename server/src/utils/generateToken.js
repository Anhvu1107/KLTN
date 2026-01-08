/**
 * Token Generation Utilities
 * AURA ARCHIVE - JWT and random token generation
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload (user data)
 * @returns {string} - Signed JWT token
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Generate random token (for password reset, email verification, etc.)
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} - Hex-encoded random token
 */
const generateRandomToken = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a token (for secure storage)
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    generateAccessToken,
    verifyAccessToken,
    generateRandomToken,
    hashToken,
};
