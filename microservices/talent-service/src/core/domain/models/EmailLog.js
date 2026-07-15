const { DataTypes } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

const EmailLog = sequelize.define('EmailLog', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    candidate_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    event_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    reference_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sent_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.ENUM('sent', 'failed', 'bounced'),
        defaultValue: 'sent',
    }
}, {
    tableName: 'email_logs',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['candidate_id', 'event_type', 'reference_id']
        }
    ]
});

module.exports = EmailLog;
