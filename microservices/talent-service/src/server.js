const fastify = require('fastify');
const cors = require('@fastify/cors');
const sequelize = require('./infrastructure/database/sequelize');
const path = require('path');
const fs = require('fs');

const buildServer = async () => {
    const app = fastify({
        logger: {
            transport: {
                target: 'pino-pretty'
            }
        }
    });

    // CORS and Security Headers
    const allowedOrigins = ['http://localhost:5173', 'https://applik-ni.com', 'https://www.applik-ni.com', 'https://app.applik-ni.com'];
    await app.register(cors, {
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
                cb(null, true);
                return;
            }
            cb(new Error("Not allowed by CORS"), false);
        },
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'cvs');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // File Uploads
    app.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit
        }
    });

    // Static files for serving CVs
    app.register(require('@fastify/static'), {
        root: path.join(__dirname, '..', 'uploads'),
        prefix: '/uploads/',
    });

    // Ruta de estado
    app.get('/estado', async (request, reply) => {
        return { estado: 'saludable', servicio: 'talent-service' };
    });

    // Rutas de API
    // Añadimos Swagger para auto-documentación
    app.register(require('@fastify/swagger'), {
      openapi: {
        info: {
          title: 'Talent Service API',
          description: 'API central para la gestión, ingesta y parseo de CVs usando Inteligencia Artificial.',
          version: '1.0.0'
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    });

    app.register(require('@fastify/swagger-ui'), {
      routePrefix: '/api/v1/talents/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    app.register(require('./interfaces/http/candidateRoutes'), { prefix: '/api/v1/talents' });
    app.register(require('./interfaces/http/analyticsRoutes'), { prefix: '/api/v1/analytics' });
    app.register(require('./interfaces/http/candidateTrackingRoutes'), { prefix: '/api/v1/talents/me' });

    // Intentar Conexión de Base de Datos
    try {
        await sequelize.authenticate();
        app.log.info('La conexion a la base de datos PostgreSQL se ha establecido con exito.');

        // Migraciones idempotentes de esquema. En producción el sync automático
        // está deshabilitado, por lo que estos cambios se aplican explícitamente
        // en cada arranque (son seguros de repetir).
        try {
            await sequelize.query('ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);');
            await sequelize.query(`CREATE TABLE IF NOT EXISTS application_notes (
                id SERIAL PRIMARY KEY,
                application_id INTEGER NOT NULL,
                author_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );`);
            app.log.info('Migraciones de esquema aplicadas.');
        } catch (migErr) {
            app.log.error('Error aplicando migraciones de esquema: ' + migErr.message);
        }

        // Sincronización - Seguro para Producción
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
            await sequelize.sync({ alter: true });
            app.log.info('Dev Mode: Modelos BD Sincronizados Automáticamente.');
        } else {
            app.log.info('Prod Mode: Sincronización automática deshabilitada.');
        }
    } catch (error) {
        console.error('\n--- DETALLE DEL ERROR DE BASE DE DATOS ---');
        console.error(error.message);
        console.error('------------------------------------------\n');
        app.log.error('No se pudo conectar a la base de datos');
    }

    // Inicializar programador de Cron
    const { initCronJobs } = require('./core/services/cronScheduler');
    initCronJobs();

    return app;
};

module.exports = buildServer;
