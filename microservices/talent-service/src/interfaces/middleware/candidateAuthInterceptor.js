const fp = require('fastify-plugin');
const jwt = require('jsonwebtoken');

/**
 * Middleware para extraer y validar el candidate_id (del JWT con rol aplicante).
 * Protege los recursos y endpoints de seguimiento de candidatos.
 */
module.exports = fp(async function (fastify, opts) {
    fastify.decorateRequest('candidateId', null);
    fastify.decorateRequest('user', null);

    fastify.addHook('preValidation', async (request, reply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                return reply.code(401).send({ error: 'Token Authorization requerido.' });
            }

            const token = authHeader.replace('Bearer ', '');

            // Decodificamos validando contra el mismo JWT_SECRET que usa auth-service
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');

            if (decoded.role !== 'aplicante') {
                return reply.code(403).send({ error: 'Autorización Denegada: rol de aplicante requerido.' });
            }

            request.candidateId = decoded.user_id;
            request.user = decoded;
        } catch (err) {
            request.log.error('Fallo en la autenticación del Candidato:', err);
            return reply.code(401).send({ error: 'Autorización Denegada o Expirada.' });
        }
    });
});
