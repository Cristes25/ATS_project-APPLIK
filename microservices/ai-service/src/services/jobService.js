const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

/**
 * Extrae el contenido de texto de una URL dada para obtener información sobre la cultura de la empresa.
 * @param {string} url La URL de la página de cultura/acerca de la empresa.
 * @returns {Promise<string>} El contenido de texto extraído de la página.
 */
const scrapeCompanyCulture = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        $('script, style, noscript, svg').remove();
        const textContent = $('body').text();
        const cleanedText = textContent.replace(/\s\s+/g, ' ').trim();

        if (!cleanedText) {
            throw new Error('No se pudo extraer texto significativo de la URL proporcionada.');
        }

        return cleanedText;
    } catch (error) {
        console.error(`Error scraping URL ${url}:`, error.message);
        throw new Error(`No se pudo obtener o analizar el contenido de la URL proporcionada. Por favor, verifique si la URL es correcta y pública.`)
    }
};

/**
 * Genera una descripción de trabajo usando IA, alineada con la cultura de la empresa y requisitos predefinidos.
 * @param {string} jobTitle El título del trabajo (por ejemplo, "Ingeniero de Software Senior").
 * @param {string} companyCultureText El texto extraído que representa la cultura de la empresa.
 * @param {string} requirements Los requisitos y responsabilidades definidos por el reclutador.
 * @returns {Promise<string>} El texto de la descripción del trabajo generado.
 */
const generateDescription = async (jobTitle, companyCultureText, requirements) => {
    const prompt = `
        Eres un experto en recursos humanos. Tu tarea es generar ÚNICAMENTE el texto de una descripción de trabajo profesional.

        REGLAS ESTRICTAS:
        - NO escribas frases introductorias como "Claro", "Aquí tienes", "Por supuesto", "A continuación" o similares.
        - NO expliques lo que vas a hacer. Comienza DIRECTAMENTE con el título o la primera sección.
        - Responde SOLO con el contenido de la descripción del trabajo, en formato Markdown.

        Puesto: "${jobTitle}"

        **Requisitos y Responsabilidades (¡BASA EL PUESTO ESTRICTAMENTE EN ESTOS!):**
        "${requirements || 'No especificado, infiere según el puesto.'}"

        **Cultura y valores de la empresa (úsalos para alinear el tono y los valores del puesto):**
        "${companyCultureText}"

        **Estructura requerida:**
        1. Título atractivo del puesto y tagline de la empresa.
        2. Sobre la empresa (máx. 2 párrafos, basado en la cultura extraída).
        3. Sobre el rol y responsabilidades (basado EXCLUSIVAMENTE en los requisitos provistos).
        4. Requisitos para el puesto (basado EXCLUSIVAMENTE en los requisitos provistos, no inventes calificaciones adicionales ni separes en soft/hard skills si no viene indicado).
        5. Párrafo final de cierre que invite a postularse.

        IMPORTANTE: Empieza directamente con el título del puesto. Sin introducciones.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error llamando a la API de Gemini para la generación de descripciones de trabajo:', error);
        throw new Error('Error al generar la descripción del trabajo debido a un error interno de IA.');
    }
};

module.exports = {
    scrapeCompanyCulture,
    generateDescription
};
