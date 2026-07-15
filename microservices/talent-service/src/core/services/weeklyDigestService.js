const { Job, Candidate, CandidateProfile, CandidateSkill, Skill, Department, Tenant, Notification } = require('../domain/models');
const { Op } = require('sequelize');
const emailService = require('../../infrastructure/email/emailService');

/**
 * Heurística de cálculo de compatibilidad (Match Score) entre un candidato y una vacante.
 * Retorna un entero entre 30 y 98 representativo de la coincidencia del candidato.
 */
const calculateJobMatchScore = (profile, job) => {
    let score = 55; // Base inicial

    // 1. Comparación por título / headline
    const jobTitle = (job.title || '').toLowerCase();
    const headline = (profile.headline || '').toLowerCase();
    if (jobTitle && headline) {
        if (jobTitle.includes(headline) || headline.includes(jobTitle)) {
            score += 15;
        }
    }

    // 2. Comparación de habilidades (Skills)
    const skills = profile.candidate_skills || [];
    const jobRequirements = (job.requirements || '').toLowerCase();
    const jobDescription = (job.description || '').toLowerCase();
    
    let matchedSkills = 0;
    skills.forEach(s => {
        const skillName = (s.skill_details ? s.skill_details.name : '').toLowerCase();
        if (skillName && (jobRequirements.includes(skillName) || jobDescription.includes(skillName))) {
            matchedSkills++;
        }
    });

    score += Math.min(matchedSkills * 8, 25); // Máximo 25 puntos por habilidades coincidentes

    // 3. Comparación por ubicación
    const candidateLoc = (profile.location || '').toLowerCase();
    const jobLoc = (job.location || 'managua').toLowerCase();
    if (candidateLoc && jobLoc && (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc))) {
        score += 10;
    }

    return Math.min(score, 98);
};

/**
 * Método principal que compila y envía las recomendaciones de vacantes a todos los candidatos.
 */
const runWeeklyDigest = async () => {
    console.log('Iniciando compilación de Digest Semanal de Vacantes...');

    try {
        // 1. Buscar vacantes publicadas en los últimos 7 días
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const openJobs = await Job.findAll({
            where: {
                status: 'published',
                createdAt: {
                    [Op.gte]: sevenDaysAgo
                }
            },
            include: [
                { model: Department, as: 'department', attributes: ['name'] },
                { model: Tenant, as: 'tenant', attributes: ['business_name'] }
            ]
        });

        if (openJobs.length === 0) {
            console.log('No hay vacantes nuevas publicadas en los últimos 7 días. Digest semanal omitido.');
            return;
        }

        // 2. Obtener todos los candidatos con sus perfiles y habilidades
        const candidates = await Candidate.findAll({
            include: [{
                model: CandidateProfile,
                as: 'profile',
                include: [{
                    model: CandidateSkill,
                    as: 'candidate_skills',
                    include: [{ model: Skill, as: 'skill_details' }]
                }]
            }]
        });

        console.log(`Procesando digest para ${candidates.length} candidatos...`);

        for (const candidate of candidates) {
            const profile = candidate.profile;
            if (!profile) continue;

            const recommendations = [];

            for (const job of openJobs) {
                const score = calculateJobMatchScore(profile, job);

                if (score >= 70) {
                    recommendations.push({
                        id: job.id,
                        title: job.title,
                        public_token: job.public_token,
                        company_name: job.tenant ? job.tenant.business_name : 'Compañía',
                        location: job.location || 'Managua',
                        match_score: score
                    });
                }
            }

            if (recommendations.length > 0) {
                // Ordenar por score descendente y tomar las 5 mejores
                recommendations.sort((a, b) => b.match_score - a.match_score);
                const topRecommendations = recommendations.slice(0, 5);

                // Enviar el Digest por Email
                console.log(`Enviando digest semanal a candidato ID: ${candidate.id} (${candidate.email}) con ${topRecommendations.length} vacantes.`);
                await emailService.sendWeeklyDigestEmail(candidate.email, topRecommendations);

                // Registrar Notificación in-app
                const topJob = topRecommendations[0];
                await Notification.create({
                    candidate_id: candidate.id,
                    type: 'new_matching_job',
                    title: 'Nuevas vacantes recomendadas para ti',
                    description: `Tenemos ${topRecommendations.length} nuevas vacantes que coinciden con tu perfil, incluyendo ${topJob.title} en ${topJob.company_name}.`,
                    meta: {
                        job_id: topJob.id
                    }
                });
            }
        }

        console.log('Digest Semanal completado exitosamente.');
    } catch (error) {
        console.error('Error durante la ejecución del Digest Semanal:', error);
        throw error;
    }
};

module.exports = {
    runWeeklyDigest,
    calculateJobMatchScore
};
