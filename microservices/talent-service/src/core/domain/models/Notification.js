const { DataTypes } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    candidate_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(
            'application_received',
            'application_reviewed',
            'stage_advanced',
            'application_rejected',
            'new_matching_job'
        ),
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
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    meta: {
        type: DataTypes.JSONB,
        allowNull: true,
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
        {
            fields: ['candidate_id']
        },
        {
            fields: ['createdAt']
        }
    ]
});

module.exports = Notification;
