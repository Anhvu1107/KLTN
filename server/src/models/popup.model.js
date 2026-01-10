/**
 * Popup Model
 * AURA ARCHIVE - Marketing popup management
 */

module.exports = (sequelize, DataTypes) => {
    const Popup = sequelize.define('Popup', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: 'Internal name for admin',
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'HTML content or text',
        },
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        button_text: {
            type: DataTypes.STRING(100),
            defaultValue: 'Xem ngay',
        },
        button_link: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        position: {
            type: DataTypes.ENUM('center', 'bottom-left', 'bottom-right', 'top'),
            defaultValue: 'center',
        },
        trigger_type: {
            type: DataTypes.ENUM('immediate', 'delay', 'scroll', 'exit'),
            defaultValue: 'delay',
            comment: 'When to show popup',
        },
        trigger_value: {
            type: DataTypes.INTEGER,
            defaultValue: 3,
            comment: 'Seconds for delay, percentage for scroll',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        starts_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        ends_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        show_once: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Show only once per visitor',
        },
        display_pages: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: ['*'],
            comment: 'Pages to show on (* for all)',
        },
    }, {
        tableName: 'popups',
        timestamps: true,
        underscored: true,
    });

    return Popup;
};
