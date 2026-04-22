-- ============================================================
-- AURA ARCHIVE - Migration Script
-- Adds stock_quantity column to variants table
-- ============================================================

-- 1. Add the column with default 1 for existing items
ALTER TABLE public.variants 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 1 NOT NULL;

-- 2. Update stock to 0 for items that are already sold
UPDATE public.variants 
SET stock_quantity = 0 
WHERE status = 'SOLD';

-- 3. Add a comment to the column
COMMENT ON COLUMN public.variants.stock_quantity IS 'Available stock count for this variant';
