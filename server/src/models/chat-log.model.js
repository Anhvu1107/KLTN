/**
 * ChatLog Model
 * AURA ARCHIVE - Conversation history between users and AI Stylist
 */

module.exports = (sequelize, DataTypes) => {
    const ChatLog = sequelize.define('ChatLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        session_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Groups messages in the same conversation',
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: 'Null for guest users',
        },
        role: {
            type: DataTypes.ENUM('USER', 'ASSISTANT', 'SYSTEM'),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Additional context like product recommendations, etc.',
        },
        tokens_used: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        tableName: 'chat_logs',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['session_id'] },
            { fields: ['user_id'] },
            { fields: ['created_at'] },
        ],
    });

    ChatLog.associate = (models) => {
        ChatLog.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    };

    return ChatLog;
};
