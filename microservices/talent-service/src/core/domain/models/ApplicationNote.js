const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../infrastructure/database/sequelize');

class ApplicationNote extends Model {}

ApplicationNote.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'applications',
            key: 'id'
        }
    },
    author_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'employees',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'ApplicationNote',
    tableName: 'application_notes',
    timestamps: true, // created_at and updated_at
    underscored: true
});

module.exports = ApplicationNote;
