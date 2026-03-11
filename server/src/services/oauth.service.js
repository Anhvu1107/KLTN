/**
 * OAuth Service
 * AURA ARCHIVE - Google and Facebook OAuth integration
 */

const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const generateToken = require('../utils/generateToken');

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google token and get user info
 */
const verifyGoogleToken = async (idToken) => {
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    return {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        avatar: payload.picture || null,
        emailVerified: payload.email_verified,
    };
};

/**
 * Login or register with Google
 */
const googleAuth = async (idToken) => {
    const googleUser = await verifyGoogleToken(idToken);

    // Check if user exists by google_id or email
    let user = await User.findOne({
        where: { email: googleUser.email },
    });

    if (user) {
        // Update google_id if not set
        if (!user.google_id) {
            await user.update({
                google_id: googleUser.googleId,
                avatar: user.avatar || googleUser.avatar,
            });
        }
    } else {
        // Create new user
        user = await User.create({
            email: googleUser.email,
            google_id: googleUser.googleId,
            first_name: googleUser.firstName,
            last_name: googleUser.lastName,
            avatar: googleUser.avatar,
            is_verified: googleUser.emailVerified,
            password: null, // No password for OAuth users
        });
    }

    const token = generateToken(user.id);

    return {
        user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
            role: user.role,
        },
        token,
    };
};

/**
 * Verify Facebook token and get user info
 */
const verifyFacebookToken = async (accessToken) => {
    const response = await fetch(
        `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)&access_token=${accessToken}`
    );

    if (!response.ok) {
        throw new Error('Invalid Facebook token');
    }

    const data = await response.json();

    return {
        facebookId: data.id,
        email: data.email,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        avatar: data.picture?.data?.url || null,
    };
};

/**
 * Login or register with Facebook
 */
const facebookAuth = async (accessToken) => {
    const fbUser = await verifyFacebookToken(accessToken);

    if (!fbUser.email) {
        throw new Error('Email permission required');
    }

    // Check if user exists by facebook_id or email
    let user = await User.findOne({
        where: { email: fbUser.email },
    });

    if (user) {
        // Update facebook_id if not set
        if (!user.facebook_id) {
            await user.update({
                facebook_id: fbUser.facebookId,
                avatar: user.avatar || fbUser.avatar,
            });
        }
    } else {
        // Create new user
        user = await User.create({
            email: fbUser.email,
            facebook_id: fbUser.facebookId,
            first_name: fbUser.firstName,
            last_name: fbUser.lastName,
            avatar: fbUser.avatar,
            is_verified: true,
            password: null,
        });
    }

    const token = generateToken(user.id);

    return {
        user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
            role: user.role,
        },
        token,
    };
};

module.exports = {
    googleAuth,
    facebookAuth,
    verifyGoogleToken,
    verifyFacebookToken,
};
