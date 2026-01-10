/**
 * Contact Controller
 * AURA ARCHIVE - Handle contact form submissions
 */

const { sendContactFormEmail } = require('../utils/sendEmail');
const AppError = require('../utils/AppError');

/**
 * Submit contact form
 * POST /api/v1/contact
 */
const submitContactForm = async (req, res, next) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            throw new AppError('Name, email and message are required', 400);
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new AppError('Invalid email format', 400);
        }

        // Send email to admin
        try {
            await sendContactFormEmail({
                name,
                email,
                phone: phone || null,
                subject: subject || 'Contact Form Submission',
                message,
            });
        } catch (emailError) {
            console.error('Failed to send contact email:', emailError.message);
            // Don't throw - we'll still save the contact but log the error
        }

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon.',
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitContactForm,
};
