const { Sequelize } = require('sequelize');
const pgvector = require('pgvector/sequelize');
require('dotenv').config();

pgvector.registerType(Sequelize);

const sequelize = new Sequelize(process.env.JOB_DB_NAME, process.env.JOB_DB_UNAME, process.env.JOB_DB_PASSWORD, {
  host: process.env.JOB_DB_HOST,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize;
