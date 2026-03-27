/**
 * Voice Controller
 * AURA ARCHIVE - Handle HTTP requests for real-time voice AI
 */

const voiceService = require('../services/voice.service');
const catchAsync = require('../utils/catchAsync');

/**
 * GET /api/v1/chat/voice-token
 * Get voice session config (API key + model + system prompt + tools)
 * Client uses this to connect directly to Gemini Live API via WebSocket
 */
const getVoiceToken = catchAsync(async (req, res) => {
    const config = await voiceService.getVoiceConfig();

    res.status(200).json({
        success: true,
        data: {
            apiKey: config.apiKey,
            model: config.model,
            systemPrompt: config.systemPrompt,
            tools: config.tools,
        },
    });
});

/**
 * POST /api/v1/chat/voice-tool-call
 * Execute a tool call from the frontend during a voice session
 */
const handleToolCall = catchAsync(async (req, res) => {
    const { toolName, args } = req.body;

    if (!toolName) {
        return res.status(400).json({
            success: false,
            message: 'toolName is required',
        });
    }

    const result = await voiceService.executeToolCall(toolName, args || {});

    res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    getVoiceToken,
    handleToolCall,
};
