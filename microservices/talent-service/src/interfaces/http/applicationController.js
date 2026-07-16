const { Application, ApplicationStageHistory, sequelize } = require('../../core/domain/models');

/**
 * PATCH /api/v1/talents/applications/:id/stage
 * Cambia la etapa de una aplicación y registra el historial.
 */
const updateStage = async (request, reply) => {
    const { id } = request.params;
    const { stage } = request.body;

    const labelToEnum = {
        'Recibido': 'postulado',
        'Analizado': 'revisando',
        'Bajo Entrevista': 'entrevista',
        'Seleccionado': 'seleccionado',
        'Oferta Enviada': 'oferta_enviada',
        'Contratado': 'contratado',
        'Rechazado': 'rechazado',
        'recibido': 'postulado',
        'analizado': 'revisando',
        'bajo entrevista': 'entrevista',
        'seleccionado': 'seleccionado',
        'oferta enviada': 'oferta_enviada',
        'contratado': 'contratado',
        'rechazado': 'rechazado'
    };

    const targetStage = labelToEnum[stage] || stage;

    try {
        const application = await Application.findByPk(id);
        if (!application) {
            return reply.code(404).send({ error: 'Aplicación no encontrada.' });
        }

        const oldStatus = application.status;

        // Registra el cambio en el historial
        const historyEntry = await ApplicationStageHistory.create({
            application_id: application.id,
            stage: targetStage,
            changed_at: new Date(),
        });

        // Actualiza el status en la tabla principal también
        await application.update({ status: targetStage });

        // Disparar notificaciones / emails automáticos basados en la matriz de transiciones
        const notificationService = require('../../core/services/notificationService');
        if (oldStatus === 'postulado' && targetStage === 'revisando') {
            notificationService.triggerNotification(application.id, 'application_reviewed');
        } else if (targetStage === 'rechazado') {
            notificationService.triggerNotification(application.id, 'application_rejected');
        } else if (['seleccionado', 'entrevista', 'oferta_enviada', 'contratado'].includes(targetStage)) {
            notificationService.triggerNotification(application.id, 'stage_advanced', { newStage: targetStage });
        }

        return reply.code(200).send({
            application_id: application.id,
            stage: historyEntry.stage,
            changed_at: historyEntry.changed_at,
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al actualizar la etapa.' });
    }
};

/**
 * GET /api/v1/talents/applications/:id/history
 * Devuelve el historial completo de etapas de una aplicación.
 */
const getHistory = async (request, reply) => {
    const { id } = request.params;

    try {
        const application = await Application.findByPk(id);
        if (!application) {
            return reply.code(404).send({ error: 'Aplicación no encontrada.' });
        }

        const history = await ApplicationStageHistory.findAll({
            where: { application_id: id },
            order: [['changed_at', 'ASC']],
            attributes: ['stage', 'changed_at'],
        });

        return reply.code(200).send({ history });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al obtener el historial.' });
    }
};

/**
 * GET /api/v1/talents/jobs/:jobId/stage-analytics
 * Calcula el promedio de días que los candidatos permanecen en cada etapa para un job.
 */
const getStageAnalytics = async (request, reply) => {
    const { jobId } = request.params;

    try {
        // Query SQL para calcular el promedio de días por etapa
        // Usamos LEAD() para calcular diferencia entre etapa actual y la siguiente
        const [results] = await sequelize.query(`
            WITH stage_durations AS (
                SELECT
                    h.stage,
                    EXTRACT(EPOCH FROM (
                        LEAD(h.changed_at) OVER (PARTITION BY h.application_id ORDER BY h.changed_at)
                        - h.changed_at
                    )) / 86400.0 AS days_in_stage
                FROM application_stage_history h
                INNER JOIN applications a ON a.id = h.application_id
                WHERE a.job_id = :jobId
            )
            SELECT
                stage,
                ROUND(AVG(days_in_stage)::numeric, 1) AS avg_days
            FROM stage_durations
            WHERE days_in_stage IS NOT NULL
            GROUP BY stage
            ORDER BY AVG(days_in_stage) DESC
        `, {
            replacements: { jobId },
            type: sequelize.QueryTypes.SELECT,
        });

        return reply.code(200).send({ analytics: results });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error interno al calcular analytics.' });
    }
};

module.exports = { updateStage, getHistory, getStageAnalytics };
