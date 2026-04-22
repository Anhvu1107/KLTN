-- ============================================================
-- AURA ARCHIVE - Smart Database Index Optimizer (Supabase)
-- Resolves: Duplicate Indexes & Missing Foreign Key Indexes
-- ============================================================

-- 1. XÓA CÁC INDEX BỊ TRÙNG LẶP (Duplicate Indexes)
DO $$
DECLARE
    r RECORD;
    dropped_count INT := 0;
BEGIN
    FOR r IN (
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexdef IN (
            SELECT indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            GROUP BY indexdef
            HAVING COUNT(*) > 1
        )
        AND indexname NOT IN (
            SELECT MIN(indexname)
            FROM pg_indexes
            WHERE schemaname = 'public'
            GROUP BY indexdef
            HAVING COUNT(*) > 1
        )
    )
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(r.indexname);
        dropped_count := dropped_count + 1;
        RAISE NOTICE 'Đã xóa index trùng lặp: %', r.indexname;
    END LOOP;
    RAISE NOTICE 'Tổng số index trùng lặp đã xóa: %', dropped_count;
END $$;


-- 2. TẠO INDEX CHO FOREIGN KEYS BỊ THIẾU (Unindexed foreign keys)
DO $$
DECLARE
    r RECORD;
    created_count INT := 0;
BEGIN
    FOR r IN (
        SELECT
            tc.table_name,
            kcu.column_name,
            'idx_' || tc.table_name || '_' || kcu.column_name AS new_index_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_indexes pi
            WHERE pi.schemaname = 'public'
            AND pi.tablename = tc.table_name
            AND pi.indexdef LIKE '%' || kcu.column_name || '%'
        )
    )
    LOOP
        EXECUTE 'CREATE INDEX IF NOT EXISTS ' || quote_ident(r.new_index_name) || ' ON public.' || quote_ident(r.table_name) || ' (' || quote_ident(r.column_name) || ')';
        created_count := created_count + 1;
        RAISE NOTICE 'Đã tạo index % cho %.%', r.new_index_name, r.table_name, r.column_name;
    END LOOP;
    RAISE NOTICE 'Tổng số index FK bị thiếu đã tạo: %', created_count;
END $$;
