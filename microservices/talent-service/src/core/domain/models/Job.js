const { DataTypes } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

const Job = sequelize.define('Job', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    department_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    requirements: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    salary_min: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    salary_max: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'NIO',
    },
    status: {
        type: DataTypes.ENUM('draft', 'published', 'paused', 'closed'),
        allowNull: false,
        defaultValue: 'draft',
    },
    closes_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    public_token: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
    }
}, {
    timestamps: true,
});

module.exports = Job;
