/**
 * ChatSession Model
 * AURA ARCHIVE - Manages chat session metadata for admin chat management
 */

module.exports = (sequelize, DataTypes) => {
    const ChatSession = sequelize.define('ChatSession', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        session_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Links to ChatLog.session_id',
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Blue=unread, Green=read',
        },
        is_ai_paused: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Admin paused AI auto-reply',
        },
        admin_joined: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Admin has joined the room',
        },
        admin_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        customer_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        customer_email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        customer_phone: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        customer_address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        customer_year: {
            type: DataTypes.STRING(10),
            allowNull: true,
        },
        last_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Preview of last message',
        },
        last_activity: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        message_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM('active', 'closed'),
            defaultValue: 'active',
            comment: 'Session status: active (ongoing), closed (ended by admin)',
        },
    }, {
        tableName: 'chat_sessions',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['session_id'], unique: true },
            { fields: ['user_id'] },
            { fields: ['is_read'] },
            { fields: ['last_activity'] },
            { fields: ['status'] },
        ],
    });

    ChatSession.associate = (models) => {
        ChatSession.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
        });
    };

    return ChatSession;
};
