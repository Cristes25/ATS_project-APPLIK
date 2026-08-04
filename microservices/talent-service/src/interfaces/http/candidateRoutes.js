const candidateController = require('./CandidateController');
const applicationController = require('./applicationController');
const tenantInterceptor = require('../middleware/tenantInterceptor');

async function routes(fastify, options) {
    // Registramos el interceptor de Privacidad
    fastify.register(tenantInterceptor);

    // POST /api/v1/talents/public/apply (Público, no requiere Auth, Requiere jobToken)
    // El body es multipart/form-data: no lleva schema JSON (Fastify no puede
    // validar multipart como JSON). Los campos se validan dentro del handler.
    fastify.post('/public/apply', {
        schema: {
            description: 'Postulación pública a una vacante mediante token seguro (multipart/form-data).',
            tags: ['Talent'],
        }
    }, candidateController.applyPublic.bind(candidateController));

    // POST /api/v1/talents/upload (Manual por Reclutador, requiere JWT y jobId)
    fastify.post('/upload', {
        schema: {
            description: 'Carga manual de un CV hacia un JobID específico (Requiere Token Reclutador).',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['rawCvText', 'jobId'],
                properties: {
                    rawCvText: { type: 'string', minLength: 20 },
                    s3Url: { type: 'string', nullable: true },
                    jobId: { type: 'integer' }
                }
            }
        }
    }, candidateController.uploadManual.bind(candidateController));

    // PATCH /api/v1/talents/applications/:id/status (pipeline simple)
    fastify.patch('/applications/:id/status', {
        schema: {
            description: 'Actualizar la etapa del candidato en el pipeline.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['newStatus'],
                properties: {
                    newStatus: {
                        type: 'string',
                        enum: [
                            'postulado', 'revisando', 'entrevista', 'seleccionado', 'oferta_enviada', 'contratado', 'rechazado',
                            'Recibido', 'Analizado', 'Bajo Entrevista', 'Seleccionado', 'Oferta Enviada', 'Contratado', 'Rechazado',
                            'recibido', 'analizado', 'bajo entrevista', 'oferta enviada'
                        ]
                    }
                }
            }
        }
    }, candidateController.updatePipelineStatus.bind(candidateController));

    // GET /api/v1/talents/applications (Requiere JWT)
    fastify.get('/applications', {
        schema: {
            description: 'Obtener la lista de postulaciones filtradas por tenant_id (Reclutador).',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                required: ['tenant_id'],
                properties: {
                    tenant_id: { type: 'integer' }
                }
            }
        }
    }, candidateController.getApplications.bind(candidateController));

    // GET /api/v1/talents/applications/:id (Requiere JWT)
    fastify.get('/applications/:id', {
        schema: {
            description: 'Obtener los detalles completos de una postulación.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer' } }
            }
        }
    }, candidateController.getApplicationDetails.bind(candidateController));

    // ─── NOTAS DE POSTULACIÓN ─────────────────────────────────────────────────

    // GET /api/v1/talents/applications/:id/notes (Requiere JWT)
    fastify.get('/applications/:id/notes', {
        schema: {
            description: 'Obtener las notas dejadas en una postulación.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: { type: 'object', properties: { id: { type: 'integer' } } }
        }
    }, candidateController.getNotes.bind(candidateController));

    // POST /api/v1/talents/applications/:id/notes (Requiere JWT)
    fastify.post('/applications/:id/notes', {
        schema: {
            description: 'Añadir una nota a la postulación.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: { type: 'object', properties: { id: { type: 'integer' } } },
            body: {
                type: 'object',
                required: ['texto'],
                properties: { texto: { type: 'string' } }
            }
        }
    }, candidateController.addNote.bind(candidateController));

    // ─── HISTORIAL DE ETAPAS ──────────────────────────────────────────────────

    // PATCH /api/v1/talents/applications/:id/stage
    fastify.patch('/applications/:id/stage', {
        schema: {
            description: 'Cambiar etapa de una aplicación y registrar en historial.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: { type: 'object', properties: { id: { type: 'integer' } } },
            body: {
                type: 'object',
                required: ['stage'],
                properties: { stage: { type: 'string' } }
            }
        }
    }, applicationController.updateStage);

    // GET /api/v1/talents/applications/:id/history
    fastify.get('/applications/:id/history', {
        schema: {
            description: 'Obtener historial completo de etapas de una aplicación.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: { type: 'object', properties: { id: { type: 'integer' } } }
        }
    }, applicationController.getHistory);

    // GET /api/v1/talents/jobs/:jobId/stage-analytics
    fastify.get('/jobs/:jobId/stage-analytics', {
        schema: {
            description: 'Analytics de cuello de botella: promedio de días por etapa.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: { type: 'object', properties: { jobId: { type: 'integer' } } }
        }
    }, applicationController.getStageAnalytics);

    // DELETE /api/v1/talents/applications/:id — el reclutador elimina una postulación
    fastify.delete('/applications/:id', {
        schema: {
            description: 'Eliminar una postulación del pipeline del reclutador.',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer' } }
            }
        }
    }, candidateController.deleteApplication.bind(candidateController));

    // DELETE /api/v1/talents/candidates/:candidateId (Cumplimiento Ley 787)
    fastify.delete('/candidates/:candidateId', {
        schema: {
            description: 'Eliminar todos los datos de perfil y postulaciones de un candidato (Ley 787).',
            tags: ['Talent'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['candidateId'],
                properties: {
                    candidateId: { type: 'integer' }
                }
            }
        }
    }, candidateController.deleteCandidateData.bind(candidateController));
}

module.exports = routes;
