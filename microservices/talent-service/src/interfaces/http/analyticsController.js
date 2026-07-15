const { Op } = require('sequelize');
const { Application, Job, Department, ApplicationStageHistory, sequelize } = require('../../core/domain/models');
const aiClient = require('../../infrastructure/aiBridge/AiClient');

// In-memory cache for AI suggestions to limit Gemini API calls
const suggestionsCache = new Map();

/**
 * GET /api/v1/analytics/candidates/trend
 * Tendencia mensual de candidatos recibidos (últimos N meses).
 */
const getCandidatesTrend = async (request, reply) => {
    const tenantId = request.tenantId;
    const months = parseInt(request.query.months, 10) || 12;

    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months + 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const applications = await Application.findAll({
            include: [{
                model: Job,
                as: 'job',
                where: { tenant_id: tenantId },
                attributes: []
            }],
            where: {
                createdAt: {
                    [Op.gte]: startDate
                }
            },
            attributes: [
                [sequelize.fn('date_trunc', 'month', sequelize.col('Application.createdAt')), 'month_date'],
                [sequelize.fn('count', sequelize.col('Application.id')), 'count']
            ],
            group: [sequelize.fn('date_trunc', 'month', sequelize.col('Application.createdAt'))],
            raw: true
        });

        // Spanish month abbreviation mappings
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const trend = [];

        // Initialize last N months with count 0
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const m = d.getMonth();
            const y = d.getFullYear();
            trend.push({
                mes: monthNames[m],
                candidatos: 0,
                key: `${y}-${String(m + 1).padStart(2, '0')}`
            });
        }

        // Fill real counts from the database
        applications.forEach(app => {
            const appDate = new Date(app.month_date);
            const key = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, '0')}`;
            const trendItem = trend.find(t => t.key === key);
            if (trendItem) {
                trendItem.candidatos = parseInt(app.count, 10);
            }
        });

        const responseData = trend.map(({ mes, candidatos }) => ({ mes, candidatos }));
        return reply.code(200).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error al calcular tendencia mensual de candidatos.' });
    }
};

/**
 * GET /api/v1/analytics/candidates/by-department
 * Distribución de candidatos por departamento.
 */
const getCandidatesByDepartment = async (request, reply) => {
    const tenantId = request.tenantId;

    try {
        const results = await Application.findAll({
            include: [{
                model: Job,
                as: 'job',
                where: { tenant_id: tenantId },
                attributes: [],
                include: [{
                    model: Department,
                    as: 'department',
                    attributes: ['name']
                }]
            }],
            attributes: [
                [sequelize.col('job.department.name'), 'depto'],
                [sequelize.fn('COUNT', sequelize.col('Application.id')), 'candidatos']
            ],
            group: ['job.department.id', 'job.department.name'],
            raw: true
        });

        const responseData = results.map(row => ({
            depto: row.depto || 'Sin Asignar',
            candidatos: parseInt(row.candidatos, 10)
        }));

        return reply.code(200).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error al obtener candidatos por departamento.' });
    }
};

/**
 * GET /api/v1/analytics/stages/avg-time
 * Tiempo promedio en días que un candidato permanece en cada etapa.
 */
const getStageAverageTime = async (request, reply) => {
    const tenantId = request.tenantId;

    try {
        // Query PostgreSQL with LEAD window function to calculate average days per stage
        const results = await sequelize.query(`
            WITH stage_durations AS (
                SELECT
                    h.stage,
                    EXTRACT(EPOCH FROM (
                        LEAD(h.changed_at) OVER (PARTITION BY h.application_id ORDER BY h.changed_at)
                        - h.changed_at
                    )) / 86400.0 AS days_in_stage
                FROM application_stage_history h
                INNER JOIN applications a ON a.id = h.application_id
                INNER JOIN "Jobs" j ON j.id = a.job_id
                WHERE j.tenant_id = :tenantId
            )
            SELECT
                stage,
                COALESCE(ROUND(AVG(days_in_stage)::numeric, 1), 0.0) AS avg_days
            FROM stage_durations
            WHERE days_in_stage IS NOT NULL
            GROUP BY stage
        `, {
            replacements: { tenantId },
            type: sequelize.QueryTypes.SELECT
        });

        const stageMapping = {
            postulado: 'Recibido',
            revisando: 'Analizado',
            entrevista: 'Bajo Entrevista',
            rechazado: 'Rechazado',
            contratado: 'Contratado'
        };

        // Initialize default stages
        const defaultStages = [
            { etapa: 'Recibido', dias: 0 },
            { etapa: 'Analizado', dias: 0 },
            { etapa: 'Bajo Entrevista', dias: 0 }
        ];

        // Overlay database values
        results.forEach(row => {
            const displayStage = stageMapping[row.stage] || row.stage.charAt(0).toUpperCase() + row.stage.slice(1);
            const target = defaultStages.find(s => s.etapa === displayStage);
            if (target) {
                target.dias = parseFloat(row.avg_days);
            } else if (displayStage !== 'Rechazado' && displayStage !== 'Contratado') {
                defaultStages.push({ etapa: displayStage, dias: parseFloat(row.avg_days) });
            }
        });

        return reply.code(200).send(defaultStages);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error al calcular tiempo promedio por etapa.' });
    }
};

/**
 * GET /api/v1/analytics/match-quality
 * Distribución de candidatos por calidad de match (Alto >= 80, Medio 50-79, Bajo < 50).
 */
const getMatchQuality = async (request, reply) => {
    const tenantId = request.tenantId;

    try {
        const results = await Application.findAll({
            include: [{
                model: Job,
                as: 'job',
                where: { tenant_id: tenantId },
                attributes: []
            }],
            attributes: [
                [
                    sequelize.literal(`CASE 
                        WHEN match_score >= 0.80 THEN 'Match Alto'
                        WHEN match_score >= 0.50 AND match_score < 0.80 THEN 'Match Medio'
                        ELSE 'Match Bajo'
                    END`),
                    'name'
                ],
                [sequelize.fn('COUNT', sequelize.col('Application.id')), 'value']
            ],
            group: [
                sequelize.literal(`CASE 
                    WHEN match_score >= 0.80 THEN 'Match Alto'
                    WHEN match_score >= 0.50 AND match_score < 0.80 THEN 'Match Medio'
                    ELSE 'Match Bajo'
                END`)
            ],
            raw: true
        });

        const buckets = { 'Match Alto': 0, 'Match Medio': 0, 'Match Bajo': 0 };
        results.forEach(row => {
            if (buckets[row.name] !== undefined) {
                buckets[row.name] = parseInt(row.value, 10);
            }
        });

        const responseData = Object.keys(buckets).map(name => ({
            name,
            value: buckets[name]
        }));

        return reply.code(200).send(responseData);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error al obtener calidad de match.' });
    }
};

/**
 * GET /api/v1/analytics/suggestions
 * Sugerencias de optimización generadas por IA. Caching de 1 hora.
 */
const getAiSuggestions = async (request, reply) => {
    const tenantId = request.tenantId;
    const cacheKey = `suggestions_${tenantId}`;

    const cached = suggestionsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 3600000)) {
        return reply.code(200).send(cached.data);
    }

    try {
        // 1. Calculate process times
        const stageTimesResults = await sequelize.query(`
            WITH stage_durations AS (
                SELECT
                    h.stage,
                    EXTRACT(EPOCH FROM (
                        LEAD(h.changed_at) OVER (PARTITION BY h.application_id ORDER BY h.changed_at)
                        - h.changed_at
                    )) / 86400.0 AS days_in_stage
                FROM application_stage_history h
                INNER JOIN applications a ON a.id = h.application_id
                INNER JOIN "Jobs" j ON j.id = a.job_id
                WHERE j.tenant_id = :tenantId
            )
            SELECT
                stage,
                COALESCE(ROUND(AVG(days_in_stage)::numeric, 1), 0.0) AS dias
            FROM stage_durations
            WHERE days_in_stage IS NOT NULL
            GROUP BY stage
        `, {
            replacements: { tenantId },
            type: sequelize.QueryTypes.SELECT
        });

        const stageTimes = stageTimesResults.map(r => ({
            etapa: r.stage,
            dias: parseFloat(r.dias)
        }));

        // 2. Invoke Gemini service via AI Bridge
        const suggestions = await aiClient.getSuggestions(stageTimes);

        // 3. Cache and respond
        suggestionsCache.set(cacheKey, {
            timestamp: Date.now(),
            data: suggestions
        });

        return reply.code(200).send(suggestions);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error al obtener sugerencias de la IA.' });
    }
};

/**
 * GET /api/v1/analytics/kpis
 * KPIs del Header: activosAhora, vacantesAbiertas, tasaMatch, tiempoPromedio (en horas).
 */
const getKpis = async (request, reply) => {
    const tenantId = request.tenantId;

    try {
        // 1. Activos ahora
        const activosAhora = await Application.count({
            include: [{
                model: Job,
                as: 'job',
                where: { tenant_id: tenantId }
            }],
            where: {
                status: ['postulado', 'revisando', 'entrevista']
            }
        });

        // 2. Vacantes abiertas
        const vacantesAbiertas = await Job.count({
            where: {
                tenant_id: tenantId,
                status: 'published'
            }
        });

        // 3. Tasa match promedio
        const matchResult = await Application.findOne({
            include: [{
                model: Job,
                as: 'job',
                where: { tenant_id: tenantId },
                attributes: []
            }],
            attributes: [
                [sequelize.fn('AVG', sequelize.col('match_score')), 'avgScore']
            ],
            raw: true
        });

        const tasaMatch = matchResult && matchResult.avgScore
            ? Math.round(parseFloat(matchResult.avgScore) * 100)
            : 82; // Fallback default

        // 4. Tiempo promedio de proceso en horas (de ingreso a última etapa registrada)
        const timeResult = await sequelize.query(`
            SELECT 
                AVG(EXTRACT(EPOCH FROM (
                    COALESCE((
                        SELECT MAX(changed_at) 
                        FROM application_stage_history 
                        WHERE application_id = a.id
                    ), a."createdAt") - a."createdAt"
                )) / 3600.0) AS avg_hours
            FROM applications a
            INNER JOIN "Jobs" j ON j.id = a.job_id
            WHERE j.tenant_id = :tenantId
        `, {
            replacements: { tenantId },
            type: sequelize.QueryTypes.SELECT
        });

        const tiempoPromedioRaw = timeResult && timeResult[0] && timeResult[0].avg_hours
            ? Math.round(parseFloat(timeResult[0].avg_hours))
            : 72; // Fallback default

        const tiempoPromedio = tiempoPromedioRaw > 0 ? tiempoPromedioRaw : 72;

        return reply.code(200).send({
            activosAhora,
            vacantesAbiertas,
            tasaMatch,
            tiempoPromedio
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error al calcular KPIs del header.' });
    }
};

module.exports = {
    getCandidatesTrend,
    getCandidatesByDepartment,
    getStageAverageTime,
    getMatchQuality,
    getAiSuggestions,
    getKpis
};
