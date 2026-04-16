/**
 * Live2D Character Routes
 * AURA ARCHIVE – Admin-managed Live2D character CRUD + ZIP upload
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../../middlewares/auth.middleware');
const { adminOnly } = require('../../middlewares/admin.middleware');
const live2dService = require('../../services/live2d.service');

// Multer – accept ZIP up to 50 MB in memory
const uploadZip = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/zip',
            'application/x-zip-compressed',
            'application/x-zip',
            'application/octet-stream',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'), false);
        }
    },
}).single('model');

/**
 * GET /api/v1/live2d/characters
 * List custom characters (public – needed by the mascot widget).
 */
router.get('/characters', async (req, res) => {
    try {
        const characters = await live2dService.getCustomCharacters();
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
            'Surrogate-Control': 'no-store',
        });
        res.json({ success: true, characters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/v1/live2d/characters
 * Upload a new Live2D character (admin only).
 * Expects multipart/form-data with fields: label, description, tags (comma-separated), model (ZIP file).
 */
router.post('/characters', protect, adminOnly, (req, res) => {
    uploadZip(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'ZIP file is required' });
            }
            if (!req.body.label) {
                return res.status(400).json({ success: false, message: 'Character label is required' });
            }

            const tags = req.body.tags
                ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            const character = await live2dService.addCharacter({
                label: req.body.label,
                description: req.body.description || '',
                tags,
                zipBuffer: req.file.buffer,
            });

            res.status(201).json({ success: true, character });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    });
});

/**
 * DELETE /api/v1/live2d/characters/:id
 * Delete a custom character and its files (admin only).
 */
router.delete('/characters/:id', protect, adminOnly, async (req, res) => {
    try {
        const result = await live2dService.deleteCharacter(req.params.id);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
});

module.exports = router;
