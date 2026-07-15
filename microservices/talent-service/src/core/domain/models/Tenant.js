const { DataTypes } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

const Tenant = sequelize.define('Tenant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    business_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subscription_plan: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    RUC: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    active_subscription: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'Tenants',
    timestamps: true,
});

module.exports = Tenant;
