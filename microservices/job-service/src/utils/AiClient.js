const axios = require('axios');

class AiClient {
    constructor() {
        this.client = axios.create({
            baseURL: process.env.AI_SERVICE_URL || process.env.AI_API_URL || 'http://localhost:3000/api/v1',
            timeout: 30000,
        });
    }

    /**
     * Llama al motor de embeddings para convertir texto descriptivo de la vacante en vectores.
     */
    async getEmbedding(text) {
        try {
            const response = await this.client.post('/embedding-engine', { text });
            return response.data.embedding; // Array de floats (768 dimensiones)
        } catch (error) {
            console.error('[AI Bridge Job-Service] Fallo al obtener Embedding:', error.message);
            return null; // Fallback manejable
        }
    }
}

module.exports = new AiClient();
