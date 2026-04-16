/**
 * Live2D Character Service
 * AURA ARCHIVE – Manage Live2D character presets
 *
 * Custom characters are stored as a JSON array in the SystemPrompt table
 * (key: CUSTOM_LIVE2D_CHARACTERS). Model files are extracted from a ZIP
 * upload to `uploads/live2d/<id>/` and served as static assets.
 */

const path = require('path');
const fs = require('fs');
const { SystemPrompt } = require('../models');

const DB_KEY = 'CUSTOM_LIVE2D_CHARACTERS';
const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const UPLOAD_BASE = path.join(UPLOAD_ROOT, 'live2d');
const CUSTOM_ID_PREFIX = 'custom';

// Ensure base directory exists
if (!fs.existsSync(UPLOAD_BASE)) {
    fs.mkdirSync(UPLOAD_BASE, { recursive: true });
}

/**
 * Read custom characters from DB.
 */
const getCustomCharacters = async () => {
    const row = await SystemPrompt.findOne({ where: { key: DB_KEY } });
    if (!row || !row.content) return [];
    try {
        const parsed = JSON.parse(row.content);
        const characters = Array.isArray(parsed) ? parsed : [];
        return characters.map(character => ({
            ...character,
            isAvailable: isModelUrlAvailable(character.modelUrl),
        }));
    } catch {
        return [];
    }
};

/**
 * Save custom characters to DB.
 */
const saveCustomCharacters = async (characters) => {
    const payload = JSON.stringify(
        characters.map(({ isAvailable: _isAvailable, ...character }) => character)
    );
    const [row, created] = await SystemPrompt.findOrCreate({
        where: { key: DB_KEY },
        defaults: {
            key: DB_KEY,
            name: 'Custom Live2D Characters',
            content: payload,
            description: 'Admin-managed Live2D character presets',
            is_active: true,
            version: 1,
        },
    });
    if (!created) {
        row.content = payload;
        await row.save();
    }
    return characters;
};

const toCharacterSlug = (label = '') =>
    label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'character';

const createCustomCharacterId = (label, characters) => {
    const baseId = `${CUSTOM_ID_PREFIX}-${toCharacterSlug(label)}`;
    const hasConflict = characters.some(character =>
        character.value === baseId || character.value.startsWith(`${baseId}-`)
    );

    return hasConflict
        ? `${baseId}-${Date.now()}`
        : baseId;
};

const resolveUploadPath = (modelUrl = '') => {
    if (typeof modelUrl !== 'string' || !modelUrl.startsWith('/uploads/')) {
        return null;
    }

    const relativePath = modelUrl.replace(/^\/uploads\/+/, '');
    return path.join(UPLOAD_ROOT, relativePath);
};

const isModelUrlAvailable = (modelUrl = '') => {
    if (typeof modelUrl !== 'string' || !modelUrl) {
        return false;
    }

    if (!modelUrl.startsWith('/uploads/')) {
        return true;
    }

    const resolvedPath = resolveUploadPath(modelUrl);
    return Boolean(resolvedPath && fs.existsSync(resolvedPath));
};

/**
 * Extract a ZIP buffer to `uploads/live2d/<characterId>/`.
 * Returns the relative URL to the .model3.json file.
 */
const extractModelZip = async (zipBuffer, characterId) => {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // Sanitise ID to prevent path traversal
    const safeId = characterId.replace(/[^a-z0-9_-]/gi, '');
    const destDir = path.join(UPLOAD_BASE, safeId);

    // Clean previous upload
    if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });

    // Detect common root folder inside ZIP (e.g. "model_name/")
    let commonPrefix = '';
    const files = entries.filter(e => !e.isDirectory).map(e => e.entryName);

    if (files.length > 0) {
        const firstSlash = files[0].indexOf('/');
        if (firstSlash > 0) {
            const candidate = files[0].substring(0, firstSlash + 1);
            if (files.every(f => f.startsWith(candidate))) {
                commonPrefix = candidate;
            }
        }
    }

    let model3JsonRelPath = null;

    for (const entry of entries) {
        if (entry.isDirectory) continue;

        // Skip macOS resource forks and hidden files
        const entryName = entry.entryName;
        if (entryName.includes('__MACOSX') || entryName.includes('.DS_Store')) continue;

        // Strip common prefix
        let relativePath = entryName;
        if (commonPrefix && relativePath.startsWith(commonPrefix)) {
            relativePath = relativePath.substring(commonPrefix.length);
        }
        if (!relativePath) continue;

        const outPath = path.join(destDir, relativePath);
        const outDir = path.dirname(outPath);

        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        fs.writeFileSync(outPath, entry.getData());

        // Detect the .model3.json entry
        if (relativePath.endsWith('.model3.json')) {
            model3JsonRelPath = relativePath;
        }
    }

    if (!model3JsonRelPath) {
        // Clean up on failure
        fs.rmSync(destDir, { recursive: true, force: true });
        throw new Error('ZIP does not contain a .model3.json file');
    }

    // Return a URL usable by the client
    return `/uploads/live2d/${safeId}/${model3JsonRelPath}`;
};

/**
 * Add a new custom character.
 */
const addCharacter = async ({ label, description, tags, zipBuffer }) => {
    const characters = await getCustomCharacters();

    const id = createCustomCharacterId(label, characters);

    const modelUrl = await extractModelZip(zipBuffer, id);

    const newChar = {
        value: id,
        label,
        description: description || '',
        modelUrl,
        tags: tags || [],
        isCustom: true,
        createdAt: new Date().toISOString(),
    };

    characters.push(newChar);
    await saveCustomCharacters(characters);
    return newChar;
};

/**
 * Delete a custom character and its files.
 */
const deleteCharacter = async (characterId) => {
    let characters = await getCustomCharacters();
    const target = characters.find(c => c.value === characterId);
    if (!target) throw new Error('Character not found');

    // Remove files
    const safeId = characterId.replace(/[^a-z0-9_-]/gi, '');
    const dirPath = path.join(UPLOAD_BASE, safeId);
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }

    characters = characters.filter(c => c.value !== characterId);
    await saveCustomCharacters(characters);
    return { deleted: characterId };
};

module.exports = {
    getCustomCharacters,
    addCharacter,
    deleteCharacter,
    isModelUrlAvailable,
};
