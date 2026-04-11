/**
 * Ensure legacy coupon tables have the newer columns expected by the app.
 * This keeps older databases working even when no formal migrations exist.
 */

const normalizeTableName = (table) => {
    if (typeof table === 'string') {
        return table.replace(/^public\./i, '').replace(/"/g, '');
    }

    if (table && typeof table === 'object') {
        return table.tableName || table.table_name || '';
    }

    return '';
};

const escapeSqlString = (value) => value.replace(/'/g, "''");

const ensureEnumType = async (sequelize, typeName, values) => {
    const enumValues = values
        .map((value) => `'${escapeSqlString(value)}'`)
        .join(', ');

    await sequelize.query(`
        DO $$
        BEGIN
            CREATE TYPE "${typeName}" AS ENUM (${enumValues});
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    `);
};

const ensureEnumValues = async (sequelize, typeName, values) => {
    for (const value of values) {
        await sequelize.query(`
            ALTER TYPE "${typeName}"
            ADD VALUE IF NOT EXISTS '${escapeSqlString(value)}';
        `);
    }
};

const addColumnIfMissing = async (sequelize, tableName, columnName, columnType, defaultValueSql, notNull = false) => {
    await sequelize.query(`
        ALTER TABLE "${tableName}"
        ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType}
        ${defaultValueSql ? `DEFAULT ${defaultValueSql}` : ''}
        ${notNull ? 'NOT NULL' : ''};
    `);
};

const ensureCouponSchema = async (db, logger = console) => {
    const { sequelize, Coupon, CouponAssignment, CouponUsage } = db;
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    const normalizedTables = new Set(tables.map(normalizeTableName));

    if (normalizedTables.has('coupons')) {
        await ensureEnumType(sequelize, 'enum_coupons_applies_to', [
            'ALL',
            'SPECIFIC_PRODUCTS',
            'SPECIFIC_CATEGORIES',
        ]);
        await ensureEnumValues(sequelize, 'enum_coupons_applies_to', [
            'ALL',
            'SPECIFIC_PRODUCTS',
            'SPECIFIC_CATEGORIES',
        ]);
        await ensureEnumType(sequelize, 'enum_coupons_visibility', [
            'PUBLIC',
            'PRIVATE',
            'PERSONAL',
        ]);
        await ensureEnumValues(sequelize, 'enum_coupons_visibility', [
            'PUBLIC',
            'PRIVATE',
            'PERSONAL',
        ]);
        await ensureEnumType(sequelize, 'enum_coupons_type', [
            'PERCENTAGE',
            'FIXED_AMOUNT',
            'FREE_SHIPPING',
        ]);
        await ensureEnumValues(sequelize, 'enum_coupons_type', [
            'PERCENTAGE',
            'FIXED_AMOUNT',
            'FREE_SHIPPING',
        ]);

        await addColumnIfMissing(
            sequelize,
            'coupons',
            'applies_to',
            '"enum_coupons_applies_to"',
            `'ALL'`,
            true
        );
        await addColumnIfMissing(
            sequelize,
            'coupons',
            'product_ids',
            'JSONB',
            `'[]'::jsonb`,
            true
        );
        await addColumnIfMissing(
            sequelize,
            'coupons',
            'category_ids',
            'JSONB',
            `'[]'::jsonb`,
            true
        );
        await addColumnIfMissing(
            sequelize,
            'coupons',
            'visibility',
            '"enum_coupons_visibility"',
            `'PUBLIC'`,
            true
        );

        await sequelize.query(`
            UPDATE "coupons"
            SET
                "applies_to" = COALESCE("applies_to", 'ALL'),
                "product_ids" = COALESCE("product_ids", '[]'::jsonb),
                "category_ids" = COALESCE("category_ids", '[]'::jsonb),
                "visibility" = COALESCE("visibility", 'PUBLIC');
        `);

        await sequelize.query(`
            ALTER TABLE "coupons"
            ALTER COLUMN "applies_to" SET DEFAULT 'ALL',
            ALTER COLUMN "product_ids" SET DEFAULT '[]'::jsonb,
            ALTER COLUMN "category_ids" SET DEFAULT '[]'::jsonb,
            ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC',
            ALTER COLUMN "applies_to" SET NOT NULL,
            ALTER COLUMN "product_ids" SET NOT NULL,
            ALTER COLUMN "category_ids" SET NOT NULL,
            ALTER COLUMN "visibility" SET NOT NULL;
        `);

        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "coupons_visibility_idx"
            ON "coupons" ("visibility");
        `);

        logger.info('Coupon schema compatibility check completed');
    }
    else {
        await Coupon.sync();
        logger.info('Coupons table created');
    }

    if (!normalizedTables.has('coupon_assignments')) {
        await CouponAssignment.sync();
        logger.info('Coupon assignments table created');
    }

    if (!normalizedTables.has('coupon_usages')) {
        await CouponUsage.sync();
        logger.info('Coupon usages table created');
    }

    if (normalizedTables.has('orders')) {
        await addColumnIfMissing(
            sequelize,
            'orders',
            'shipping_discount_amount',
            'DECIMAL(12, 2)',
            '0',
            true
        );

        await sequelize.query(`
            UPDATE "orders"
            SET "shipping_discount_amount" = COALESCE("shipping_discount_amount", 0);
        `);

        await sequelize.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "shipping_discount_amount" SET DEFAULT 0,
            ALTER COLUMN "shipping_discount_amount" SET NOT NULL;
        `);
    }

    logger.info('Coupon support tables synchronized');
};

module.exports = ensureCouponSchema;
