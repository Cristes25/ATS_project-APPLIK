require('dotenv').config();
const { sequelize } = require('../microservices/job-service/src/models');
const Job = require('../microservices/job-service/src/models/Job')(sequelize, require('sequelize').DataTypes);
const AiClient = require('../microservices/job-service/src/utils/AiClient');

const aiClient = new AiClient();

async function backfillJobs() {
  try {
    console.log('--- Iniciando Backfill de Vectores para Vacantes Existentes ---');
    await sequelize.authenticate();
    
    // Obtener todas las vacantes
    const jobs = await Job.findAll();
    console.log(`Se encontraron ${jobs.length} vacantes. Procesando...`);

    let successCount = 0;
    let errorCount = 0;

    for (const job of jobs) {
      const jobText = `${job.title}. ${job.description}. Requisitos: ${job.requirements}`;
      console.log(`Generando vector para Job ID ${job.id} (${job.title})...`);
      
      const embedding = await aiClient.getEmbedding(jobText);
      if (embedding) {
        await job.update({ embedding_vector: embedding });
        successCount++;
        console.log(`✅ Éxito para Job ID ${job.id}`);
      } else {
        errorCount++;
        console.log(`❌ Fallo para Job ID ${job.id}`);
      }
    }

    console.log(`--- Resumen ---`);
    console.log(`Actualizados con éxito: ${successCount}`);
    console.log(`Errores: ${errorCount}`);
    
  } catch (error) {
    console.error('Error fatal durante el backfill:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

backfillJobs();
