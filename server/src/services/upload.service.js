/**
 * Upload Service
 * AURA ARCHIVE - Handle file uploads via Cloudinary
 *
 * Images are uploaded to Cloudinary and full HTTPS URLs are stored in the DB.
 * Multer with memoryStorage is used only to parse multipart form data;
 * no files are written to the local filesystem.
 */

const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');

// ---------------------------------------------------------------------------
// Cloudinary configuration
// ---------------------------------------------------------------------------

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ---------------------------------------------------------------------------
// Magic-bytes validation (runs on the in-memory buffer)
// ---------------------------------------------------------------------------

const validateMagicBytes = (buffer) => {
    if (!buffer || buffer.length < 4) return false;

    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'image/jpeg';
    }
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'image/png';
    }
    // WebP (RIFF....WEBP)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        if (buffer.length >= 12 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'image/webp';
        }
    }

    return false;
};

// ---------------------------------------------------------------------------
// Multer – memory storage (no files on disk)
// ---------------------------------------------------------------------------

const memoryStorage = multer.memoryStorage();

const imageFileFilter = (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'), false);
    }
};

/** Multer instance for product images */
const uploadProductImages = multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_FILE_SIZE, files: 5 },
    fileFilter: imageFileFilter,
});

/** Multer instance for avatar upload */
const uploadAvatar = multer({
    storage: memoryStorage,
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: imageFileFilter,
});

/** Multer instance for banner upload */
const uploadBanner = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: imageFileFilter,
});

// ---------------------------------------------------------------------------
// Cloudinary helpers
// ---------------------------------------------------------------------------

/**
 * Upload a single buffer to Cloudinary.
 * @param {Buffer} buffer   – File buffer from multer memoryStorage
 * @param {string} folder   – Cloudinary folder, e.g. "aura/products"
 * @returns {Promise<string>} – Secure URL of the uploaded image
 */
const uploadToCloudinary = (buffer, folder = 'aura/products') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            },
        );
        stream.end(buffer);
    });
};

/**
 * Validate buffer magic bytes, then upload to Cloudinary.
 * @param {object} file   – multer file object (with .buffer)
 * @param {string} folder – Cloudinary folder
 * @returns {Promise<{valid: boolean, url: string|null}>}
 */
const validateAndUpload = async (file, folder = 'aura/products') => {
    const detectedType = validateMagicBytes(file.buffer);
    if (!detectedType) {
        return { valid: false, url: null };
    }
    const url = await uploadToCloudinary(file.buffer, folder);
    return { valid: true, url };
};

/**
 * Process an array of multer file objects – validate & upload each one.
 * @param {Array} files  – multer files
 * @param {string} folder
 * @returns {Promise<string[]>} – Array of Cloudinary URLs
 */
const processUploadedFiles = async (files, folder = 'aura/products') => {
    if (!files || files.length === 0) return [];

    const results = await Promise.all(
        files.map(async (file) => {
            const { valid, url } = await validateAndUpload(file, folder);
            if (!valid) {
                console.warn(`Rejected file (magic-bytes mismatch): ${file.originalname}`);
                return null;
            }
            return url;
        }),
    );

    return results.filter(Boolean);
};

/**
 * Delete an image from Cloudinary by its public URL.
 * Extracts the public_id from the URL automatically.
 * @param {string} url – Full Cloudinary URL
 * @returns {Promise<boolean>}
 */
const deleteFile = async (url) => {
    try {
        if (!url || !url.includes('cloudinary.com')) return false;

        // Extract public_id from URL
        // URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/filename.ext
        const parts = url.split('/upload/');
        if (parts.length < 2) return false;

        // Remove version prefix (v1234/) and file extension
        const afterUpload = parts[1].replace(/^v\d+\//, '');
        const publicId = afterUpload.replace(/\.[^.]+$/, '');

        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === 'ok';
    } catch (error) {
        console.error('Failed to delete file from Cloudinary:', error.message);
        return false;
    }
};

// Keep for backward compatibility (old local paths)
const getFileUrl = (filename) => `/uploads/products/${filename}`;

module.exports = {
    uploadProductImages,
    uploadAvatar,
    uploadBanner,
    validateMagicBytes,
    validateAndUpload,
    deleteFile,
    getFileUrl,
    processUploadedFiles,
    ALLOWED_TYPES,
    MAX_FILE_SIZE,
};
