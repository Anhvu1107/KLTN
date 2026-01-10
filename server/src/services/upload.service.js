/**
 * Upload Service
 * AURA ARCHIVE - Handle file uploads with multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const productImagesDir = path.join(uploadDir, 'products');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Storage configuration for product images
 */
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `product-${uniqueSuffix}${ext}`);
    },
});

/**
 * File filter - only allow images
 */
const imageFileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'), false);
    }
};

/**
 * Multer instance for product images
 */
const uploadProductImages = multer({
    storage: productStorage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5, // Max 5 images per upload
    },
    fileFilter: imageFileFilter,
});

/**
 * Delete a file from uploads directory
 * @param {string} filename - Name of file to delete
 * @returns {boolean} - Success status
 */
const deleteFile = (filename) => {
    try {
        const filePath = path.join(productImagesDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to delete file:', error.message);
        return false;
    }
};

/**
 * Get the public URL for an uploaded file
 * @param {string} filename - Name of the file
 * @returns {string} - Public URL
 */
const getFileUrl = (filename) => {
    return `/uploads/products/${filename}`;
};

/**
 * Process uploaded files and return URLs
 * @param {Array} files - Array of multer file objects
 * @returns {Array} - Array of file URLs
 */
const processUploadedFiles = (files) => {
    if (!files || files.length === 0) return [];
    return files.map(file => getFileUrl(file.filename));
};

module.exports = {
    uploadProductImages,
    deleteFile,
    getFileUrl,
    processUploadedFiles,
    ALLOWED_TYPES,
    MAX_FILE_SIZE,
};
