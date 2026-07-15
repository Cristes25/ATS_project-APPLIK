const { Notification } = require('../../core/domain/models');

/**
 * GET /api/v1/talents/me/notifications
 * Obtiene la lista de notificaciones del candidato autenticado.
 */
const getNotifications = async (request, reply) => {
    const candidateId = request.candidateId;
    const { limit = 50 } = request.query;

    const limitVal = parseInt(limit, 10);
    const effectiveLimit = isNaN(limitVal) ? 50 : limitVal;

    try {
        const notifications = await Notification.findAll({
            where: { candidate_id: candidateId },
            limit: effectiveLimit,
            order: [['createdAt', 'DESC']]
        });

        const responseData = notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            description: n.description,
            read: n.read,
            created_at: n.createdAt,
            meta: n.meta || {}
        }));

        return reply.code(200).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al obtener notificaciones.' });
    }
};

/**
 * POST /api/v1/talents/me/notifications/read-all
 * Marca todas las notificaciones del candidato como leídas.
 */
const markAllRead = async (request, reply) => {
    const candidateId = request.candidateId;

    try {
        const [updatedCount] = await Notification.update(
            { read: true },
            {
                where: {
                    candidate_id: candidateId,
                    read: false
                }
            }
        );

        return reply.code(200).send({ updated: updatedCount });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al marcar todas las notificaciones como leídas.' });
    }
};

/**
 * PATCH /api/v1/talents/me/notifications/:id/read
 * Marca una notificación individual como leída.
 */
const markRead = async (request, reply) => {
    const candidateId = request.candidateId;
    const { id } = request.params;

    try {
        const notification = await Notification.findOne({
            where: { id, candidate_id: candidateId }
        });

        if (!notification) {
            return reply.code(404).send({ error: 'Notificación no encontrada o no pertenece al candidato.' });
        }

        await notification.update({ read: true });
        return reply.code(200).send({ success: true });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al marcar la notificación como leída.' });
    }
};

module.exports = {
    getNotifications,
    markAllRead,
    markRead
};
