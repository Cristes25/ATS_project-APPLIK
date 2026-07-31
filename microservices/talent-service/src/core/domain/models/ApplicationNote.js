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
        // FK a nivel de aplicación hacia applications. Sin references de BD: el
        // sync({alter}) genera un REFERENCES malformado que aborta la creación de
        // la tabla (mismo patrón app-level que el resto de FKs del proyecto).
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    author_id: {
        // FK a nivel de aplicación hacia auth_db.employees. Sin references de BD:
        // employees pertenece a otro servicio y ese FK abortaba el sync del talent,
        // impidiendo que se creara la tabla application_notes.
        type: DataTypes.INTEGER,
        allowNull: false,
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
