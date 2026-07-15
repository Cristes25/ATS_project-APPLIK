const { Application, Job, Department, Tenant, Bookmark, CandidateProfile } = require('../../core/domain/models');

/**
 * GET /api/v1/talents/me/applications
 * Recupera la lista de postulaciones del candidato autenticado.
 */
const getApplications = async (request, reply) => {
    const candidateId = request.candidateId;

    try {
        const applications = await Application.findAll({
            include: [
                {
                    model: CandidateProfile,
                    where: { candidate_id: candidateId },
                    attributes: [] // Solo filtramos por el perfil, no ocupamos sus campos en el root
                },
                {
                    model: Job,
                    as: 'job',
                    include: [
                        {
                            model: Department,
                            as: 'department',
                            attributes: ['name']
                        },
                        {
                            model: Tenant,
                            as: 'tenant',
                            attributes: ['business_name']
                        }
                    ]
                }
            ],
            order: [['applied_at', 'DESC']]
        });

        // Mapeamos los estados internos de la BD a los estados legibles del frontend
        const stageMapping = {
            postulado: 'recibido',
            revisando: 'analizado',
            entrevista: 'bajo_entrevista',
            rechazado: 'rechazado',
            contratado: 'contratado'
        };

        const responseData = applications.map(app => {
            const job = app.job || {};
            const departmentName = job.department ? job.department.name : 'General';
            const companyName = job.tenant ? job.tenant.business_name : 'Compañía';

            return {
                id: app.id,
                job: {
                    id: job.id,
                    title: job.title,
                    department_name: departmentName,
                    location: job.location || 'Managua' // Por defecto Managua si no tiene ubicación
                },
                company_name: companyName,
                stage: stageMapping[app.status] || app.status || 'recibido',
                applied_at: app.applied_at
            };
        });

        return reply.code(200).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno del servidor al recuperar las postulaciones.' });
    }
};

/**
 * GET /api/v1/talents/me/bookmarks
 * Recupera la lista de vacantes guardadas por el candidato.
 */
const getBookmarks = async (request, reply) => {
    const candidateId = request.candidateId;

    try {
        const bookmarks = await Bookmark.findAll({
            where: { candidate_id: candidateId },
            include: [{
                model: Job,
                as: 'job',
                include: [
                    {
                        model: Department,
                        as: 'department',
                        attributes: ['name']
                    },
                    {
                        model: Tenant,
                        as: 'tenant',
                        attributes: ['business_name']
                    }
                ]
            }],
            order: [['createdAt', 'DESC']]
        });

        const responseData = bookmarks.map(b => {
            const job = b.job || {};
            const departmentName = job.department ? job.department.name : 'General';
            const companyName = job.tenant ? job.tenant.business_name : 'Compañía';

            return {
                id: b.id,
                job: {
                    id: job.id,
                    title: job.title,
                    department_name: departmentName,
                    location: job.location || 'Managua'
                },
                company_name: companyName,
                category: b.category || departmentName || 'Tecnología',
                saved_at: b.createdAt
            };
        });

        return reply.code(200).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno del servidor al recuperar las vacantes guardadas.' });
    }
};

/**
 * POST /api/v1/talents/me/bookmarks
 * Guarda una vacante favorita para el candidato.
 */
const createBookmark = async (request, reply) => {
    const candidateId = request.candidateId;
    const { job_id } = request.body;

    if (!job_id) {
        return reply.code(400).send({ error: 'El parámetro job_id es requerido en el cuerpo de la solicitud.' });
    }

    try {
        // Verificar si la vacante existe
        const job = await Job.findByPk(job_id, {
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['name']
                },
                {
                    model: Tenant,
                    as: 'tenant',
                    attributes: ['business_name']
                }
            ]
        });

        if (!job) {
            return reply.code(404).send({ error: 'La vacante especificada no existe.' });
        }

        // Verificar si ya está guardada para evitar duplicados (Constraint única)
        const existing = await Bookmark.findOne({
            where: { candidate_id: candidateId, job_id }
        });

        if (existing) {
            return reply.code(409).send({ error: 'Esta vacante ya se encuentra guardada.' });
        }

        const category = job.department ? job.department.name : 'Tecnología';

        // Crear el marcador
        const bookmark = await Bookmark.create({
            candidate_id: candidateId,
            job_id,
            category
        });

        const departmentName = job.department ? job.department.name : 'General';
        const companyName = job.tenant ? job.tenant.business_name : 'Compañía';

        const responseData = {
            id: bookmark.id,
            job: {
                id: job.id,
                title: job.title,
                department_name: departmentName,
                location: job.location || 'Managua'
            },
            company_name: companyName,
            category: bookmark.category,
            saved_at: bookmark.createdAt
        };

        return reply.code(201).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al guardar la vacante.' });
    }
};

/**
 * DELETE /api/v1/talents/me/bookmarks/:id
 * Quita una vacante de las guardadas.
 */
const deleteBookmark = async (request, reply) => {
    const candidateId = request.candidateId;
    const { id } = request.params;

    try {
        const bookmark = await Bookmark.findOne({
            where: { id, candidate_id: candidateId }
        });

        if (!bookmark) {
            return reply.code(404).send({ error: 'Marcador no encontrado o no pertenece al candidato.' });
        }

        await bookmark.destroy();
        return reply.code(204).send(); // 204 No Content
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al eliminar el marcador.' });
    }
};

module.exports = {
    getApplications,
    getBookmarks,
    createBookmark,
    deleteBookmark
};
