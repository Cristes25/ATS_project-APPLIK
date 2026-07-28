require('dotenv').config();
const { sequelize } = require('./models');

const fastify = require('fastify')({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// PLUGINS
const allowedOrigins = ['http://localhost:5173', 'https://applik-ni.com', 'https://www.applik-ni.com', 'https://app.applik-ni.com'];
fastify.register(require('@fastify/cors'), {
  origin: (origin, cb) => {
    // Permite peticiones sin origen (ej. curl o postman durante pruebas backend)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      cb(null, true);
      return;
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET
});

fastify.register(require('./plugins/authDecorator'));

// RUTAS
fastify.register(require('./routes/jobRoutes'), { prefix: '/api/v1' });

const args = process.argv.slice(2);
const isProd = process.env.NODE_ENV === 'production';

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la DB establecida correctamente.');

    const isDev = process.env.NODE_ENV !== 'production';
    await sequelize.sync({ alter: isDev });
    console.log(isDev ? 'Dev/E2E Mode: Base de datos actualizada con alter.' : 'Prod Mode: Alter desactivado.');

    const port = process.env.PORT || 3003;
    await fastify.listen({ port, host: '0.0.0.0' });

    console.log(`Job Service activo en el puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
