const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-pro',
    generationConfig: { responseMimeType: "application/json" }
});

/**
 * Procesar texto de CV crudo y extraer datos estructurados usando IA.
 * Esta función se mantiene para la ingesta directa de CV si es necesario.
 */
const processAndStoreCv = async (cvText) => {
    const prompt = `
        Analiza el siguiente texto de CV y extrae la información.
        Devuelve SOLO un JSON con esta estructura exacta (sin markdown):
        {
          "personal_info": { "name": "", "location": "", "phone": "", "email": "" },
          "summary": "",
          "work_experience": [
            { "company_name": "", "job_title": "", "description": "",
              "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "is_current": false }
          ],
          "education": [
            { "institution": "", "degree": "", "field_of_study": "",
              "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "is_current": false }
          ],
          "skills": [ { "name": "", "level": "basico|intermedio|avanzado" } ]
        }

        Texto del CV:
        "${cvText}"
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawTextResponse = response.text();
        const start = rawTextResponse.indexOf('{');
        const end = rawTextResponse.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
             throw new Error('JSON structure not found in AI response');
        }
        
        const jsonStr = rawTextResponse.substring(start, end + 1);
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Error procesando CV con Gemini:', error);
        throw new Error('Error al procesar CV debido a un error interno de IA.');
    }
};

module.exports = {
    processAndStoreCv
};
