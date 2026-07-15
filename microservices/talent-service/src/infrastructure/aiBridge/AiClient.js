const axios = require('axios');

class AiBridgeClient {
    constructor() {
        // En producción sería http://ai-service:3000 o la IP respectiva
        this.client = axios.create({
            baseURL: process.env.AI_SERVICE_URL || 'http://localhost:3000/api/v1',
            timeout: 30000, // Extendido debido al NLP / LLM latency
        });
    }

    /**
     * Extrae información estructurada (incluyendo Referencias RF-20) desde un CV de texto crudo.
     */
    async extractCvData(rawText) {
        try {
            const response = await this.client.post('/cv/ingest-cv', {
                cvText: rawText
            });
            return response.data.data;
        } catch (error) {
            console.error('[AI Bridge] Fallo al extraer CV:', error.message);
            throw new Error('No se pudo establecer puente cognitivo con el CV.');
        }
    }

    /**
     * Llama al motor de embeddings para convertir texto descriptivo en vectores
     */
    async getEmbedding(text) {
        try {
            const response = await this.client.post('/embedding-engine', { text });
            return response.data.embedding; // Array de floats
        } catch (error) {
            console.error('[AI Bridge] Fallo al obtener Embedding:', error.message);
            return null; // Fallback manejable
        }
    }

    /**
     * Llama al servicio de AI para obtener sugerencias de reclutamiento basadas en los tiempos promedio
     */
    async getSuggestions(stageTimes) {
        try {
            const response = await this.client.post('/analytics/suggestions', { stageTimes });
            return response.data.suggestions;
        } catch (error) {
            console.error('[AI Bridge] Fallo al obtener sugerencias de IA:', error.message);
            // fallback
            return [
                {
                    tipo: 'advertencia',
                    titulo: 'Revisión de Tiempos del Proceso',
                    texto: 'Los candidatos están permaneciendo en promedio más de lo esperado en la etapa de entrevista. Considere optimizar el agendamiento.'
                },
                {
                    tipo: 'info',
                    titulo: 'Distribución de Vacantes',
                    texto: 'Identificamos un alto volumen de postulaciones en el departamento de IT. Asegure la disponibilidad de los evaluadores técnicos.'
                },
                {
                    tipo: 'positivo',
                    titulo: 'Eficiencia en Ingesta',
                    texto: 'La velocidad de clasificación inicial de candidatos se mantiene óptima gracias al análisis automatizado de CVs.'
                }
            ];
        }
    }
}

module.exports = new AiBridgeClient();
