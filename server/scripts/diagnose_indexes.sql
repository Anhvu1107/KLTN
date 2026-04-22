-- ============================================================
-- STEP 1: DIAGNOSTIC - Run this FIRST to see all problematic indexes
-- Copy output to share with me, or review yourself
-- ============================================================

-- 1A. Find DUPLICATE indexes
SELECT
    'DUPLICATE' as issue,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef IN (
    SELECT indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY indexdef
    HAVING COUNT(*) > 1
)
ORDER BY indexdef, indexname;

-- 1B. Find UNINDEXED foreign keys
SELECT
    'UNINDEXED_FK' as issue,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table
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
ORDER BY tc.table_name;

-- 1C. Find UNUSED indexes (0 scans since last stats reset)
SELECT
    'UNUSED' as issue,
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'  -- Skip primary keys
ORDER BY pg_relation_size(indexrelid) DESC;
