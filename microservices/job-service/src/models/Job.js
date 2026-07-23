const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const JOB_STATUSES = ['draft', 'published', 'paused', 'closed'];

const Job = sequelize.define('Job', {
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // App-level reference to auth_db.employees
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contract_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  experience_level: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  salary_min: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  salary_max: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'NIO',
  },
  status: {
    type: DataTypes.ENUM(...JOB_STATUSES),
    allowNull: false,
    defaultValue: 'draft',
  },
  closes_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // RF-12: unique token for public application link
  public_token: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true,
  },
  embedding_vector: {
    type: DataTypes.VECTOR(768),
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Job;
