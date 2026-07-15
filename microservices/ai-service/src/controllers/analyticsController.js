const asyncHandler = require('express-async-handler');
const analyticsService = require('../services/analyticsService');

/**
 * @desc Generar sugerencias automatizadas basadas en los tiempos promedio de las etapas.
 * @route POST /api/v1/analytics/suggestions
 * @access Private (Internal microservice communication)
 */
const generateSuggestions = asyncHandler(async (req, res) => {
    const { stageTimes } = req.body;
    
    // stageTimes can be empty, analyticsService handles fallback
    const suggestions = await analyticsService.generateSuggestions(stageTimes || []);
    
    res.status(200).json({
        success: true,
        suggestions
    });
});

module.exports = {
    generateSuggestions
};
