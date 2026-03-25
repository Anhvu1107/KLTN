/**
 * Quick email test script
 * Run: node test-email.js
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const run = async () => {
    console.log('=== Email Configuration ===');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || '(not set)');
    console.log('SMTP_PORT:', process.env.SMTP_PORT || '(not set)');
    console.log('SMTP_USER:', process.env.SMTP_USER || '(not set)');
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***set***' : '(not set)');
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '***set***' : '(not set)');
    console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? '***set***' : '(not set)');
    console.log('');

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    console.log('Testing SMTP connection...');
    try {
        await transporter.verify();
        console.log('✓ SMTP connection OK!');
    } catch (err) {
        console.error('✗ SMTP connection FAILED:', err.message);
        console.error('  Code:', err.code);
        return;
    }

    console.log('\nSending test email...');
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `AURA ARCHIVE <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // send to self
            subject: 'Test Email - AURA ARCHIVE',
            text: 'If you see this, email is working!',
            html: '<h1>✓ Email is working!</h1><p>Sent at: ' + new Date().toISOString() + '</p>',
        });
        console.log('✓ Email sent! MessageID:', info.messageId);
    } catch (err) {
        console.error('✗ Send FAILED:', err.message);
    }
};

run();
