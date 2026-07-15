const ingestCandidate = require('../../core/useCases/IngestCandidate');
const jobClient = require('../../infrastructure/jobBridge/JobClient');
const { Application, CandidateProfile, Job, Candidate, WorkExperience, Education, CandidateSkill, ApplicationStageHistory, sequelize } = require('../../core/domain/models');

class CandidateController {

    /**
     * POST /api/v1/talents/apply
     * Postulación Externa Directa (RF-12)
     */
    async applyPublic(request, reply) {
        const { rawCvText, s3Url, law787Accepted, jobToken } = request.body;
        
        try {
            if (!jobToken) {
                return reply.code(400).send({ error: 'Es obligatorio proveer un jobToken válido para aplicar.' });
            }

            // Consultar Job-Service cruzado para resolver la metadata
            const jobData = await jobClient.getJobByToken(jobToken);
            const result = await ingestCandidate.execute({
                rawCvText,
                s3Url,
                law787Accepted,
                tenantId: request.tenantId || jobData.tenant_id, // Si no está loggeado, toma el del job
                jobId: jobData.id,
                candidateId: request.user && request.user.role === 'candidate' ? request.user.user_id : null
            });
            return reply.code(201).send(result);
        } catch (error) {
            request.log.error({ err: error }, 'Error aplicando en perfil público:');
            console.error('TRACE COMPLETO:', error);
            if (error.message.includes('Ley 787')) {
                return reply.code(403).send({ error: error.message });
            }
            return reply.code(500).send({ error: error.message || 'Fallo al procesar postulación pública' });
        }
    }

    /**
     * POST /api/v1/talents/upload
     * Carga Manual por Reclutador (RF-13)
     */
    async uploadManual(request, reply) {
        const { rawCvText, s3Url, jobId } = request.body;
        const law787Accepted = true; // Si es reclutador, se asumen firmas físicas previas o B2B

        try {
            if (!jobId) {
                return reply.code(400).send({ error: 'Debes especificar el jobId en la carga manual del CV.' });
            }
            const result = await ingestCandidate.execute({
                rawCvText,
                s3Url,
                law787Accepted,
                tenantId: request.tenantId, // Asegurado por JWT
                jobId: jobId,
                candidateId: null 
            });
            return reply.code(201).send(result);
        } catch (error) {
            request.log.error('Error en carga manual:', error);
            return reply.code(500).send({ error: 'Fallo al procesar carga manual' });
        }
    }

    /**
     * PATCH /api/v1/talents/applications/:id/status
     * Gestiona el Pipeline (RF-16)
     */
    async updatePipelineStatus(request, reply) {
        const { id } = request.params;
        const { newStatus } = request.body; // ej. 'entrevista'

        try {
            const application = await Application.findByPk(id);
            if (!application) {
                return reply.code(404).send({ error: 'Postulación no encontrada' });
            }

            // (En caso extendido, aquí se comprobaría si el request.tenantId es el dueño de esta postulación)
            
            application.status = newStatus;
            await application.save();

            // Registrar el cambio de etapa en el historial
            await ApplicationStageHistory.create({
                application_id: application.id,
                stage: newStatus,
                changed_at: new Date()
            });

            return reply.code(200).send({
                message: 'Estado del pipeline actualizado',
                status: application.status
            });

        } catch (error) {
            request.log.error('Fallo moviendo pipeline:', error);
            return reply.code(500).send({ error: 'Fallo en la Base de Datos.' });
        }
    }

    /**
     * GET /api/v1/talents/applications?tenant_id=X
     * Lista postulaciones/candidatos por tenant_id
     */
    async getApplications(request, reply) {
        const { tenant_id } = request.query;

        if (!tenant_id) {
            return reply.code(400).send({ error: 'El parámetro tenant_id es requerido.' });
        }

        const tenantIdInt = parseInt(tenant_id, 10);
        if (isNaN(tenantIdInt)) {
            return reply.code(400).send({ error: 'El parámetro tenant_id debe ser un número entero.' });
        }

        // Ley 787: Aislamiento por Tenant
        if (request.tenantId && request.tenantId !== tenantIdInt) {
            return reply.code(403).send({ error: 'Acceso denegado: no puedes consultar datos de otro tenant.' });
        }

        try {
            const applications = await Application.findAll({
                include: [
                    {
                        model: Job,
                        as: 'job',
                        where: { tenant_id: tenantIdInt },
                        attributes: ['title']
                    },
                    {
                        model: CandidateProfile,
                        attributes: ['linkedin_url'],
                        include: [
                            {
                                model: Candidate,
                                as: 'candidate',
                                attributes: ['first_name', 'last_name', 'email']
                            }
                        ]
                    }
                ],
                order: [['applied_at', 'DESC']]
            });

            const mapped = applications.map(app => {
                const profile = app.CandidateProfile || {};
                const candidate = profile.candidate || null;

                const candidateName = candidate 
                    ? `${candidate.first_name} ${candidate.last_name}` 
                    : 'Candidato Ingestado';

                const email = candidate 
                    ? candidate.email 
                    : (profile.linkedin_url || '');

                const scorePercent = app.match_score 
                    ? Math.round(parseFloat(app.match_score) * 100) 
                    : 0;

                return {
                    application_id: app.id,
                    'candidate name': candidateName,
                    candidate_name: candidateName,
                    email: email,
                    'job title': app.job ? app.job.title : 'Vacante Desconocida',
                    job_title: app.job ? app.job.title : 'Vacante Desconocida',
                    stage: app.status,
                    match_score: scorePercent,
                    applied_at: app.applied_at
                };
            });

            return reply.code(200).send(mapped);
        } catch (error) {
            request.log.error({ err: error }, 'Fallo al listar postulaciones por tenant:');
            return reply.code(500).send({ error: 'Error interno del servidor al recuperar postulaciones.' });
        }
    }

    /**
     * DELETE /api/v1/talents/candidates/:candidateId
     * Elimina todos los datos de perfil y postulaciones de un candidato (Derecho al olvido — Ley 787)
     */
    async deleteCandidateData(request, reply) {
        const { candidateId } = request.params;
        const candidateIdInt = parseInt(candidateId, 10);

        if (isNaN(candidateIdInt)) {
            return reply.code(400).send({ error: 'ID de candidato inválido.' });
        }

        // Obtener el token del header para validar autorización
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({ error: 'Token de autorización requerido.' });
        }

        try {
            const jwt = require('jsonwebtoken');
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'applik_super_secret_jwt_key_2026');

            // Verificar que el usuario que borra sea el mismo candidato
            if (decoded.role !== 'aplicante' || decoded.user_id !== candidateIdInt) {
                return reply.code(403).send({ error: 'Acceso denegado: no puedes eliminar los datos de otro usuario.' });
            }
        } catch (authError) {
            request.log.error('Fallo de autenticación en deleteCandidateData:', authError);
            return reply.code(401).send({ error: 'Token de autorización no válido o expirado.' });
        }

        const transaction = await sequelize.transaction();

        try {
            // 1. Buscar perfil de candidato
            const profile = await CandidateProfile.findOne({
                where: { candidate_id: candidateIdInt }
            });

            if (!profile) {
                await transaction.commit();
                return reply.code(404).send({ success: false, message: 'Perfil de candidato no encontrado.' });
            }

            // 2. Eliminar en cascada
            
            // Buscar aplicaciones asociadas a este perfil
            const applications = await Application.findAll({
                where: { profile_id: profile.id }
            });

            const applicationIds = applications.map(app => app.id);

            if (applicationIds.length > 0) {
                // Eliminar historial de etapas
                await ApplicationStageHistory.destroy({
                    where: { application_id: applicationIds },
                    transaction
                });

                // Eliminar postulaciones
                await Application.destroy({
                    where: { id: applicationIds },
                    transaction
                });
            }

            // Eliminar experiencias laborales
            await WorkExperience.destroy({
                where: { profile_id: profile.id },
                transaction
            });

            // Eliminar educaciones
            await Education.destroy({
                where: { profile_id: profile.id },
                transaction
            });

            // Eliminar habilidades asociadas
            await CandidateSkill.destroy({
                where: { profile_id: profile.id },
                transaction
            });

            // Eliminar perfil raíz
            await profile.destroy({ transaction });

            await transaction.commit();
            return reply.code(200).send({
                success: true,
                message: 'Perfil de candidato y postulaciones eliminadas con éxito en cumplimiento de la Ley 787.'
            });
        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            request.log.error('Fallo eliminando datos del candidato:', error);
            return reply.code(500).send({ error: 'Error interno al procesar eliminación.' });
        }
    }
}

module.exports = new CandidateController();
