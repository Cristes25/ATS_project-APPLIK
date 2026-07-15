const cron = require('node-cron');
const weeklyDigestService = require('./weeklyDigestService');

/**
 * Registra e inicializa todas las tareas programadas en segundo plano.
 */
const initCronJobs = () => {
    console.log('Inicializando programador de tareas (Cron)...');

    // Programar Digest Semanal de vacantes: Lunes 9:00 AM (America/Managua)
    cron.schedule('0 9 * * 1', () => {
        console.log('[Cron] Iniciando ejecución programada del Digest Semanal de Vacantes...');
        weeklyDigestService.runWeeklyDigest().catch(err => {
            console.error('[Cron] Fallo en la ejecución del Digest Semanal:', err);
        });
    }, {
        scheduled: true,
        timezone: "America/Managua"
    });

    console.log('[Cron] Digest Semanal programado para los Lunes a las 9:00 AM (Hora Nicaragua).');
};

module.exports = {
    initCronJobs
};
