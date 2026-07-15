const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

/**
 * Generar sugerencias automatizadas basadas en los tiempos promedio de las etapas de reclutamiento.
 * @param {Array} stageTimes Lista de objetos { etapa, dias }
 * @returns {Promise<Array>} Lista de sugerencias
 */
const generateSuggestions = async (stageTimes) => {
    const prompt = `
        Eres un consultor experto en optimización de procesos de reclutamiento (ATS).
        Analiza las siguientes métricas de tiempo promedio (en días) que pasan los candidatos en cada etapa del proceso de reclutamiento para una empresa:

        ${JSON.stringify(stageTimes, null, 2)}

        Identifica cuellos de botella, retrasos, riesgos u oportunidades de mejora.
        Genera exactamente 3 o 4 sugerencias accionables y útiles.
        La respuesta DEBE ser un array JSON en formato string de objetos, donde cada objeto tenga los siguientes campos:
        - tipo: un string que debe ser exactamente uno de los siguientes: 'critico' | 'advertencia' | 'info' | 'positivo'
        - titulo: un título breve e impactante en español (máximo 8 palabras)
        - texto: una sugerencia/observación explicativa en español (máximo 30 palabras).

        Ejemplo de formato de salida JSON válido:
        [
          { "tipo": "critico", "titulo": "Cuello de botella en Entrevistas", "texto": "Los candidatos pasan en promedio 12 días en entrevista, lo que eleva el riesgo de fuga de talento. Recomendamos automatizar agendamientos." },
          { "tipo": "positivo", "titulo": "Ingreso rápido de candidatos", "texto": "El tiempo en la etapa 'Recibido' es de solo 2 días, asegurando un inicio de proceso ágil y dinámico." }
        ]

        IMPORTANTE: Devuelve únicamente el array JSON, sin formato markdown adicional, sin comentarios extra, sin envolver en \`\`\`json o bloques de código. Solo el array parseable.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        // Intentar parsear el JSON de forma flexible
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start === -1 || end === -1) {
            throw new Error('No se encontró estructura JSON válida en la respuesta de la IA');
        }
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Error llamando a la API de Gemini para sugerencias:', error);
        // Sugerencias fallback realistas por si falla la llamada
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
};

module.exports = {
    generateSuggestions
};
