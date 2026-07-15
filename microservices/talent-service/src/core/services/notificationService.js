const { Notification, EmailLog, Candidate, CandidateProfile, Job, Tenant, Application } = require('../domain/models');
const emailService = require('../../infrastructure/email/emailService');

/**
 * Servicio unificado para registrar notificaciones in-app y enviar correos automáticos.
 * Garantiza idempotencia de envío de correos utilizando logs persistidos en la base de datos (email_logs).
 */
const triggerNotification = async (applicationId, eventType, optData = {}) => {
    console.log(`Disparando evento de notificación '${eventType}' para la aplicación ID: ${applicationId}`);

    try {
        // 1. Obtener la postulación con los datos de Job, Tenant y CandidateProfile
        const application = await Application.findByPk(applicationId, {
            include: [
                {
                    model: Job,
                    as: 'job',
                    include: [{ model: Tenant, as: 'tenant', attributes: ['business_name'] }]
                },
                {
                    model: CandidateProfile,
                    include: [{ model: Candidate, as: 'candidate', attributes: ['id', 'email', 'first_name', 'last_name'] }]
                }
            ]
        });

        if (!application) {
            console.error(`Notificación cancelada: Aplicación con ID ${applicationId} no encontrada.`);
            return;
        }

        const candidateProfile = application.CandidateProfile;
        if (!candidateProfile || !candidateProfile.candidate_id) {
            console.log(`Aplicación ${applicationId} no vinculada a una cuenta de candidato. Ignorando notificaciones.`);
            return;
        }

        const candidateId = candidateProfile.candidate_id;
        const candidate = candidateProfile.candidate;
        const candidateEmail = candidate ? candidate.email : null;

        const job = application.job || {};
        const jobTitle = job.title || 'Vacante';
        const companyName = job.tenant ? job.tenant.business_name : 'Compañía';

        let title = '';
        let description = '';
        let sendImmediateEmail = false;
        let emailPromise = null;

        switch (eventType) {
            case 'application_received':
                title = 'Tu aplicación fue recibida';
                description = `Recibimos tu postulación para la vacante de ${jobTitle} en ${companyName}.`;
                sendImmediateEmail = true;
                if (candidateEmail) {
                    emailPromise = emailService.sendApplicationReceivedEmail(candidateEmail, jobTitle, companyName);
                }
                break;

            case 'application_reviewed':
                title = 'Tu aplicación fue revisada';
                description = `${companyName} revisó tu aplicación para ${jobTitle}.`;
                sendImmediateEmail = false;
                break;

            case 'stage_advanced':
                const stageNames = {
                    seleccionado: 'Seleccionado',
                    bajo_entrevista: 'Bajo Entrevista',
                    entrevista: 'Bajo Entrevista',
                    oferta_enviada: 'Oferta Enviada',
                    contratado: 'Contratado'
                };
                const friendlyStage = stageNames[optData.newStage] || optData.newStage;
                title = '¡Avanzaste de etapa!';
                description = `Tu postulación para ${jobTitle} en ${companyName} avanzó a la etapa de ${friendlyStage}.`;
                sendImmediateEmail = true;
                if (candidateEmail) {
                    emailPromise = emailService.sendStageAdvancedEmail(candidateEmail, jobTitle, companyName, optData.newStage);
                }
                break;

            case 'application_rejected':
                title = 'Resultado de tu aplicación';
                description = `El proceso para la vacante de ${jobTitle} en ${companyName} ha finalizado.`;
                sendImmediateEmail = true;
                if (candidateEmail) {
                    emailPromise = emailService.sendApplicationRejectedEmail(candidateEmail, jobTitle, companyName);
                }
                break;

            default:
                console.error(`Tipo de evento de notificación no soportado: ${eventType}`);
                return;
        }

        // 2. Crear Registro de Notificación In-App en base de datos
        const notification = await Notification.create({
            candidate_id: candidateId,
            type: eventType,
            title,
            description,
            meta: {
                job_id: job.id,
                application_id: application.id
            }
        });
        console.log(`Notificación in-app (${eventType}) creada con ID: ${notification.id} para candidato ID: ${candidateId}`);

        // 3. Enviar y registrar el correo electrónico correspondiente
        if (sendImmediateEmail && candidateEmail && emailPromise) {
            const referenceId = String(application.id);

            // Evitar envíos duplicados mediante validación de log único
            const existingLog = await EmailLog.findOne({
                where: {
                    candidate_id: candidateId,
                    event_type: eventType,
                    reference_id: referenceId
                }
            });

            if (existingLog) {
                console.log(`Email de tipo '${eventType}' ya había sido enviado para aplicación ${referenceId}. Omitiendo duplicado.`);
                return;
            }

            // Despachar email asíncronamente
            emailPromise.then(async (res) => {
                await EmailLog.create({
                    candidate_id: candidateId,
                    event_type: eventType,
                    reference_id: referenceId,
                    status: res.success ? 'sent' : 'failed'
                });
            }).catch(async (err) => {
                console.error(`Fallo crítico al despachar correo a ${candidateEmail}:`, err);
                await EmailLog.create({
                    candidate_id: candidateId,
                    event_type: eventType,
                    reference_id: referenceId,
                    status: 'failed'
                });
            });
        }
    } catch (error) {
        console.error('Error general dentro de triggerNotification:', error);
    }
};

module.exports = {
    triggerNotification
};
