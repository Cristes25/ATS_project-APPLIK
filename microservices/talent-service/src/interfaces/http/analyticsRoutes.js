const analyticsController = require('./analyticsController');
const tenantInterceptor = require('../middleware/tenantInterceptor');

async function routes(fastify, options) {
    // Interceptor multi-tenant que extrae y valida tenantId/company_id del JWT
    fastify.register(tenantInterceptor);

    // GET /api/v1/analytics/candidates/trend
    fastify.get('/candidates/trend', {
        schema: {
            description: 'Tendencia mensual de candidatos recibidos para el tenant.',
            tags: ['Analytics'],
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    months: { type: 'integer', default: 12 }
                }
            }
        }
    }, analyticsController.getCandidatesTrend);

    // GET /api/v1/analytics/candidates/by-department
    fastify.get('/candidates/by-department', {
        schema: {
            description: 'Distribución de candidatos agrupados por departamento para el tenant.',
            tags: ['Analytics'],
            security: [{ bearerAuth: [] }]
        }
    }, analyticsController.getCandidatesByDepartment);

    // GET /api/v1/analytics/stages/avg-time
    fastify.get('/stages/avg-time', {
        schema: {
            description: 'Tiempo promedio en días que los candidatos permanecen en cada etapa para el tenant.',
            tags: ['Analytics'],
            security: [{ bearerAuth: [] }]
        }
    }, analyticsController.getStageAverageTime);

    // GET /api/v1/analytics/match-quality
    fastify.get('/match-quality', {
        schema: {
            description: 'Distribución de candidatos agrupados por calidad de match para el tenant.',
            tags: ['Analytics'],
            security: [{ bearerAuth: [] }]
        }
    }, analyticsController.getMatchQuality);

    // GET /api/v1/analytics/suggestions
    fastify.get('/suggestions', {
        schema: {
            description: 'Sugerencias automatizadas generadas por IA basadas en los tiempos del proceso.',
            tags: ['Analytics'],
            security: [{ bearerAuth: [] }]
        }
    }, analyticsController.getAiSuggestions);

    // GET /api/v1/analytics/kpis
    fastify.get('/kpis', {
        schema: {
            description: 'KPIs del header: activos, vacantes abiertas, tasa de match y tiempo promedio.',
            tags: ['Analytics'],
            security: [{ bearerAuth: [] }]
        }
    }, analyticsController.getKpis);
}

module.exports = routes;
