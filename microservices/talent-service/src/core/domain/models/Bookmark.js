const { DataTypes } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

const Bookmark = sequelize.define('Bookmark', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    candidate_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    job_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    tableName: 'bookmarks',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['candidate_id', 'job_id']
        }
    ]
});

module.exports = Bookmark;
