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
const avatarDir = path.join(uploadDir, 'avatars');
const bannerDir = path.join(uploadDir, 'banners');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
}
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}
if (!fs.existsSync(bannerDir)) {
    fs.mkdirSync(bannerDir, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes for image formats (file signature validation)
const MAGIC_BYTES = {
    jpeg: [0xFF, 0xD8, 0xFF],           // JPEG
    png: [0x89, 0x50, 0x4E, 0x47],       // PNG
    webp: [0x52, 0x49, 0x46, 0x46],      // RIFF (WebP container)
};

/**
 * Validate file by checking magic bytes (file signature)
 * This prevents malicious files disguised as images
 */
const validateMagicBytes = (buffer) => {
    if (!buffer || buffer.length < 4) return false;

    // Check JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }

    // Check PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image/png';
    }

    // Check WebP (RIFF....WEBP)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        // Also check for WEBP marker at offset 8
        if (buffer.length >= 12 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'image/webp';
        }
    }

    return false;
};

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
 * File filter - only allow images (checks mimetype)
 * Note: Magic bytes are validated after upload in validateUploadedFile()
 */
const imageFileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'), false);
    }
};

/**
 * Validate uploaded file by checking magic bytes
 * Call this AFTER multer processes the file
 * @param {string} filePath - Path to uploaded file
 * @returns {object} - { valid: boolean, detectedType: string | null }
 */
const validateUploadedFile = (filePath) => {
    try {
        const buffer = Buffer.alloc(12);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 12, 0);
        fs.closeSync(fd);

        const detectedType = validateMagicBytes(buffer);

        if (!detectedType) {
            // Delete invalid file
            fs.unlinkSync(filePath);
            return { valid: false, detectedType: null };
        }

        return { valid: true, detectedType };
    } catch (error) {
        console.error('File validation error:', error.message);
        return { valid: false, detectedType: null };
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

/**
 * Storage configuration for avatar images
 */
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${uuidv4()}${ext}`);
    },
});

/**
 * Multer instance for avatar upload
 */
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
        files: 1,
    },
    fileFilter: imageFileFilter,
});

/**
 * Storage configuration for banner images
 */
const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bannerDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `banner-${uuidv4()}${ext}`);
    },
});

/**
 * Multer instance for banner upload
 */
const uploadBanner = multer({
    storage: bannerStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB for high-res banners
        files: 1,
    },
    fileFilter: imageFileFilter,
});

module.exports = {
    uploadProductImages,
    uploadAvatar,
    uploadBanner,
    validateUploadedFile,
    deleteFile,
    getFileUrl,
    processUploadedFiles,
    ALLOWED_TYPES,
    MAX_FILE_SIZE,
    MAGIC_BYTES,
};
