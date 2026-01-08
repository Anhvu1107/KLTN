/**
 * SystemPrompt Model
 * AURA ARCHIVE - AI Chatbot Configuration (Admin-editable)
 */

module.exports = (sequelize, DataTypes) => {
    const SystemPrompt = sequelize.define('SystemPrompt', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        key: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Unique identifier like STYLIST_PERSONA, GREETING_MESSAGE',
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'The actual prompt content',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Admin-facing description of what this prompt does',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    }, {
        tableName: 'system_prompts',
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ['key'] },
        ],
    });

    return SystemPrompt;
};
