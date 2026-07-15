const express = require('express');
const router = express.Router();

const embeddingController = require('../controllers/embeddingController');
const analyticsController = require('../controllers/analyticsController');

// Ruta para el motor de embedding 
router.post('/embedding-engine', embeddingController.createEmbedding);

// Ruta para sugerencias de analíticas
router.post('/analytics/suggestions', analyticsController.generateSuggestions);


module.exports = router;