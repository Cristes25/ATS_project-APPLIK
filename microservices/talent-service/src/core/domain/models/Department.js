const { DataTypes } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'Departments',
    timestamps: true,
});

module.exports = Department;
