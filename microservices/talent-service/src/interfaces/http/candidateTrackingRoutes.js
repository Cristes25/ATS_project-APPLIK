const candidateTrackingController = require('./candidateTrackingController');
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
}

module.exports = routes;
