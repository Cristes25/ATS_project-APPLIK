const candidateTrackingController = require('./candidateTrackingController');
const notificationController = require('./notificationController');
const candidateAuthInterceptor = require('../middleware/candidateAuthInterceptor');

async function routes(fastify, options) {
    // Interceptor que extrae y valida la sesión del aplicante (candidato)
    fastify.register(candidateAuthInterceptor);

    // GET /api/v1/talents/me/applications
    fastify.get('/applications', {
        schema: {
            description: 'Obtener la lista de postulaciones del candidato autenticado.',
            tags: ['Candidate Tracking'],
            security: [{ bearerAuth: [] }]
        }
    }, candidateTrackingController.getApplications);

    // GET /api/v1/talents/me/bookmarks
    fastify.get('/bookmarks', {
        schema: {
            description: 'Obtener la lista de vacantes guardadas por el candidato.',
            tags: ['Candidate Bookmarks'],
            security: [{ bearerAuth: [] }]
        }
    }, candidateTrackingController.getBookmarks);

    // POST /api/v1/talents/me/bookmarks
    fastify.post('/bookmarks', {
        schema: {
            description: 'Guardar una vacante como favorita.',
            tags: ['Candidate Bookmarks'],
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['job_id'],
                properties: {
                    job_id: { type: 'integer' }
                }
            }
        }
    }, candidateTrackingController.createBookmark);

    // DELETE /api/v1/talents/me/bookmarks/:id
    fastify.delete('/bookmarks/:id', {
        schema: {
            description: 'Quitar una vacante de las guardadas.',
            tags: ['Candidate Bookmarks'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, candidateTrackingController.deleteBookmark);

    // GET /api/v1/talents/me/notifications
    fastify.get('/notifications', {
        schema: {
            description: 'Listar notificaciones del candidato.',
            tags: ['Candidate Notifications'],
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', default: 50 }
                }
            }
        }
    }, notificationController.getNotifications);

    // POST /api/v1/talents/me/notifications/read-all
    fastify.post('/notifications/read-all', {
        schema: {
            description: 'Marcar todas las notificaciones como leídas.',
            tags: ['Candidate Notifications'],
            security: [{ bearerAuth: [] }]
        }
    }, notificationController.markAllRead);

    // PATCH /api/v1/talents/me/notifications/:id/read
    fastify.patch('/notifications/:id/read', {
        schema: {
            description: 'Marcar una notificación como leída.',
            tags: ['Candidate Notifications'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string', format: 'uuid' }
                }
            }
        }
    }, notificationController.markRead);

    // POST /api/v1/talents/me/notifications/trigger-digest (Solo para pruebas en ambiente de desarrollo)
    if (process.env.NODE_ENV !== 'production') {
        fastify.post('/notifications/trigger-digest', {
            schema: {
                description: 'Disparar manualmente el Digest Semanal en ambiente de desarrollo.',
                tags: ['Candidate Notifications'],
                security: [{ bearerAuth: [] }]
            }
        }, async (request, reply) => {
            const weeklyDigestService = require('../../core/services/weeklyDigestService');
            await weeklyDigestService.runWeeklyDigest();
            return reply.code(200).send({ success: true, message: 'Digest semanal disparado exitosamente.' });
        });
    }
}

module.exports = routes;
