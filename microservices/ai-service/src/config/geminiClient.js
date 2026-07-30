const {GoogleGenerativeAI} = require('@google/generative-ai');
const {GEMINI_API_KEY}= process.env
//VERIFICA SI LA API KEY ESTA EN EL ENVIROMENT FILE 
if (!process.env.GEMINI_API_KEY){
    throw new Error ('GEMINI_API_KEY no definido ')

}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Modelo centralizado para generación de texto (cumpliendo principio DRY)
const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
genAI.defaultTextModel = genAI.getGenerativeModel({ model: modelName });

module.exports = genAI;
