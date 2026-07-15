const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '2525', 10),
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
    }
});

const sendEmail = async (options) => {
    try {
        await transport.sendMail({
            from: `APPLIK <${process.env.EMAIL_FROM || 'support@applik.ni'}>`,
            ...options
        });
        console.log(`Email enviado con éxito a: ${options.to} | Asunto: ${options.subject}`);
        return { success: true };
    } catch (error) {
        console.error(`Error enviando email a ${options.to}:`, error);
        return { success: false, error };
    }
};

/**
 * Envía confirmación de aplicación recibida
 */
const sendApplicationReceivedEmail = async (email, jobTitle, companyName) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const applicationsUrl = `${frontendUrl}/aplicaciones`;
    return sendEmail({
        to: email,
        subject: `Recibimos tu aplicación a ${jobTitle} en ${companyName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1E293B;">
                <h2 style="color: #4F46E5; margin-bottom: 24px;">¡Hola!</h2>
                <p>Hemos recibido tu postulación para la vacante de <strong>${jobTitle}</strong> en <strong>${companyName}</strong>.</p>
                <p>El próximo paso será la revisión de tu perfil y CV por parte de su equipo de recursos humanos.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${applicationsUrl}"
                       style="background-color: #4F46E5; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Ver mis aplicaciones
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                <p style="color: #64748B; font-size: 13px;">Este es un correo automático de APPLIK, por favor no respondas directamente a este mensaje.</p>
            </div>
        `
    });
};

/**
 * Envía notificación de avance de etapa en el pipeline
 */
const sendStageAdvancedEmail = async (email, jobTitle, companyName, newStage) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const applicationsUrl = `${frontendUrl}/aplicaciones`;
    
    const stageNames = {
        analizado: 'Analizado',
        revisando: 'Analizado',
        seleccionado: 'Seleccionado',
        bajo_entrevista: 'Bajo Entrevista',
        entrevista: 'Bajo Entrevista',
        oferta_enviada: 'Oferta Enviada',
        contratado: 'Contratado'
    };

    const stageName = stageNames[newStage] || newStage;

    return sendEmail({
        to: email,
        subject: `Avanzaste a la etapa de ${stageName} en ${companyName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1E293B;">
                <h2 style="color: #10B981; margin-bottom: 24px;">¡Buenas noticias!</h2>
                <p>Tu postulación para <strong>${jobTitle}</strong> en <strong>${companyName}</strong> ha avanzado a la etapa de: <strong>${stageName}</strong>.</p>
                <p>El equipo de reclutamiento se pondrá en contacto contigo pronto para indicarte los siguientes pasos del proceso.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${applicationsUrl}"
                       style="background-color: #10B981; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Seguir mi postulación
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                <p style="color: #64748B; font-size: 13px;">Este es un correo automático de APPLIK, por favor no respondas directamente a este mensaje.</p>
            </div>
        `
    });
};

/**
 * Envía notificación de rechazo respetuoso
 */
const sendApplicationRejectedEmail = async (email, jobTitle, companyName) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const jobsUrl = `${frontendUrl}/trabajos`;
    return sendEmail({
        to: email,
        subject: `Resultado de tu aplicación a ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1E293B;">
                <h2 style="color: #4B5563; margin-bottom: 24px;">Agradecemos tu interés</h2>
                <p>Queremos agradecerte por haber participado en el proceso de selección para la vacante de <strong>${jobTitle}</strong> en <strong>${companyName}</strong>.</p>
                <p>Lamentablemente, en esta ocasión hemos decidido continuar con otros candidatos que se ajustan más estrechamente a los requerimientos actuales de la posición.</p>
                <p>Te invitamos a seguir postulándote a otras ofertas de trabajo en nuestra plataforma que se adapten a tu perfil.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${jobsUrl}"
                       style="background-color: #4B5563; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Ver otras vacantes
                    </a>
                </div>
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                <p style="color: #64748B; font-size: 13px;">Este es un correo automático de APPLIK, por favor no respondas directamente a este mensaje.</p>
            </div>
        `
    });
};

/**
 * Envía el digest semanal de vacantes recomendadas
 */
const sendWeeklyDigestEmail = async (email, jobsList) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const count = jobsList.length;
    
    let jobsHtml = '';
    for (const job of jobsList) {
        const directUrl = `${frontendUrl}/trabajo/${job.public_token}`;
        jobsHtml += `
            <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background-color: #F8FAFC;">
                <h4 style="margin: 0 0 4px 0; color: #4F46E5; font-size: 16px;">${job.title}</h4>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #334155;"><strong>${job.company_name}</strong> - ${job.location}</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #059669;"><strong>${job.match_score}% de coincidencia</strong></p>
                <a href="${directUrl}" style="font-size: 13px; color: #4F46E5; text-decoration: underline; font-weight: bold;">Ver vacante →</a>
            </div>
        `;
    }

    return sendEmail({
        to: email,
        subject: `${count} vacantes recomendadas para ti esta semana`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1E293B;">
                <h2 style="color: #4F46E5; margin-bottom: 24px;">Tus recomendaciones de la semana</h2>
                <p>Hola. Hemos seleccionado las mejores oportunidades de trabajo de esta semana que coinciden con tu perfil profesional:</p>
                
                <div style="margin: 24px 0;">
                    ${jobsHtml}
                </div>
                
                <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
                <p style="color: #94A3B8; font-size: 11px; text-align: center;">
                    Para configurar la frecuencia de estos correos o cancelarlos, ve a la sección de tu <a href="${frontendUrl}/perfil" style="color: #4F46E5;">Perfil</a>.
                </p>
            </div>
        `
    });
};

module.exports = {
    sendApplicationReceivedEmail,
    sendStageAdvancedEmail,
    sendApplicationRejectedEmail,
    sendWeeklyDigestEmail
};
