const aiClient = require('../../infrastructure/aiBridge/AiClient');
const { CandidateProfile, WorkExperience, Education, Skill, CandidateSkill, Application, ApplicationStageHistory } = require('../domain/models');
const sequelize = require('../../infrastructure/database/sequelize');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IngestCandidateUseCase {

    /**
     * Aplica el flujo complejo de Postulación pública o manual (RF-12, RF-13).
     * Requiere el texto del CV que ya fue parseado en una capa anterior (como S3 / Multer).
     */
    async execute({ rawCvText, s3Url, law787Accepted, tenantId, candidateId = null, jobId }) {
        if (law787Accepted !== true) {
            throw new Error('La política de privacidad y tratamiento de datos (Ley 787) no fue aceptada.');
        }

        const transaction = await sequelize.transaction();

        try {
            // 1. Invocamos asíncronamente al AI Bridge (Integración de microservicios)
            let extractedData;
            try {
                extractedData = await aiClient.extractCvData(rawCvText);
            } catch {
                extractedData = null;
            }

            if (!extractedData || !extractedData.personal_info) {
                extractedData = {
                    personal_info: { name: 'Candidato', location: '', phone: '', email: '' },
                    summary: 'CV recibido — análisis pendiente',
                    work_experiences: [],
                    educations: [],
                    skills: []
                };
            }

            // 1.5 Alternativa Local a S3 (Cero Costos)
            // Se guardará una URL local haciendo referencia a un directorio estático
            const localResumeUrl = s3Url ? s3Url : `/uploads/cv_dummies/candidato_${Date.now()}.pdf`;

            // 2. Mock del App-level Auth ID
            // Comentado para usar el candidateId dinámico:
            // const mockCandidateId = Math.floor(Math.random() * 1000000);

            // 2.5 Generar Vector Semántico del Perfil
            let embeddingVector = null;
            try {
                embeddingVector = await aiClient.getEmbedding(rawCvText);
            } catch (err) {
                console.error('[IngestCandidate] Error obteniendo embedding:', err.message);
                embeddingVector = null;
            }

            // 3. Buscar o Crear el Perfil Raíz
            let profile;
            if (candidateId) {
                profile = await CandidateProfile.findOne({ where: { candidate_id: candidateId }, transaction });
            }

            if (profile) {
                // Actualizar perfil existente
                await profile.update({
                    resume_url: localResumeUrl,
                    headline: extractedData.summary || 'Candidato CV Recibido',
                    location: extractedData.personal_info.location || '',
                    phone: extractedData.personal_info.phone || '',
                    linkedin_url: extractedData.personal_info.email || '',
                    embedding_vector: embeddingVector,
                    law_787_accepted: true
                }, { transaction });

                // Destruir data vieja para insertar el CV actualizado
                await WorkExperience.destroy({ where: { profile_id: profile.id }, transaction });
                await Education.destroy({ where: { profile_id: profile.id }, transaction });
                await CandidateSkill.destroy({ where: { profile_id: profile.id }, transaction });
            } else {
                // Crear nuevo perfil
                profile = await CandidateProfile.create({
                    candidate_id: candidateId,
                    resume_url: localResumeUrl,
                    headline: extractedData.summary || 'Candidato CV Recibido',
                    location: extractedData.personal_info.location || '',
                    phone: extractedData.personal_info.phone || '',
                    linkedin_url: extractedData.personal_info.email || '',
                    embedding_vector: embeddingVector,
                    law_787_accepted: true
                }, { transaction });
            }

            // 4. Procesar Experiencia Laboral
            if (extractedData.work_experience && extractedData.work_experience.length > 0) {
                const workExps = extractedData.work_experience.map(exp => ({
                    profile_id: profile.id,
                    company_name: exp.company_name || 'Desconocido',
                    job_title: exp.job_title || 'Colaborador',
                    description: exp.description || '',
                    start_date: (exp.start_date && !isNaN(new Date(exp.start_date))) ? new Date(exp.start_date) : new Date(),
                    end_date: (exp.end_date && !isNaN(new Date(exp.end_date))) ? new Date(exp.end_date) : null,
                    is_current: exp.is_current || false
                }));
                await WorkExperience.bulkCreate(workExps, { transaction });
            }

            // 5. Procesar Educaciones
            if (extractedData.education && extractedData.education.length > 0) {
                const educationsMapeadas = extractedData.education.map(edu => ({
                    profile_id: profile.id,
                    institution: edu.institution || 'No especificada',
                    degree: edu.degree || 'General',
                    field_of_study: edu.field_of_study || '',
                    start_date: (edu.start_date && !isNaN(new Date(edu.start_date))) ? new Date(edu.start_date) : new Date(),
                    end_date: (edu.end_date && !isNaN(new Date(edu.end_date))) ? new Date(edu.end_date) : null,
                    is_current: edu.is_current || false
                }));
                await Education.bulkCreate(educationsMapeadas, { transaction });
            }

            // 6. Procesar Habilidades (Skills) M:N
            if (extractedData.skills && extractedData.skills.length > 0) {
                const candidateSkillsToCreate = [];

                for (const skillItem of extractedData.skills) {
                    // Buscar o crear la habilidad en el catálogo general
                    const skillName = typeof skillItem === 'string' ? skillItem : (skillItem.name || 'Habilidad Desconocida');
                    const [skillObj] = await Skill.findOrCreate({
                        where: { name: skillName },
                        defaults: { type: 'tecnica' }, // Default fallback
                        transaction
                    });

                    // Añadir al pivot table
                    candidateSkillsToCreate.push({
                        profile_id: profile.id,
                        skill_id: skillObj.id,
                        level: skillItem.level || 'basico'
                    });
                }

                if (candidateSkillsToCreate.length > 0) {
                    await CandidateSkill.bulkCreate(candidateSkillsToCreate, { transaction });
                }
            }

            // 7. Cálculo NATIVO del Match Score (pgvector)
            let application = null;
            if (jobId) {
                let matchScore = null;
                
                if (embeddingVector) {
                    try {
                        // Calcula Similitud Coseno usando operador nativo <=>
                        // Raw Similarity será ~0.7 a 0.95 en un modelo Gemini para contextos laborales.
                        const [results] = await sequelize.query(`
                            SELECT 1 - (cp.embedding_vector <=> j.embedding_vector) AS raw_similarity
                            FROM candidate_profiles cp, jobs j
                            WHERE cp.id = :profileId AND j.id = :jobId
                        `, {
                            replacements: { profileId: profile.id, jobId },
                            transaction
                        });

                        if (results && results.length > 0 && results[0].raw_similarity !== null) {
                            const rawSim = parseFloat(results[0].raw_similarity);
                            
                            // Calibrar para estirar a un rango 0-100 para la UI
                            let calibrated = (rawSim - 0.65) / (0.95 - 0.65);
                            calibrated = Math.max(0, Math.min(1, calibrated)); // limitar a 0.0 - 1.0
                            matchScore = Math.round(calibrated * 100);
                        }
                    } catch (e) {
                        console.error('[IngestCandidate] Error en pgvector:', e.message);
                    }
                }

                application = await Application.create({
                    profile_id: profile.id,
                    job_id: jobId,
                    status: 'postulado',
                    match_score: matchScore,
                }, { transaction });

                // Registrar el estado inicial en el historial
                await ApplicationStageHistory.create({
                    application_id: application.id,
                    stage: 'postulado',
                    changed_at: new Date()
                }, { transaction });
            }

            await transaction.commit();

            if (application) {
                const notificationService = require('../services/notificationService');
                notificationService.triggerNotification(application.id, 'application_received').catch(err => {
                    console.error('Error al disparar notificación de aplicación recibida:', err);
                });
            }

            return {
                status: 'success',
                message: 'Candidato ingestando y analizado con éxito',
                profile_id: profile.id,
                application_id: application ? application.id : null,
                extracted_name: extractedData.personal_info.name
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new IngestCandidateUseCase();
