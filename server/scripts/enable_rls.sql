-- ============================================================
-- AURA ARCHIVE - Enable RLS on ALL tables
-- Supabase Database Security Hardening
-- 
-- Strategy: Enable RLS + allow service_role full access
-- This means:
--   ✅ Backend (Sequelize via service_role connection) works normally
--   ✅ Frontend anon key CANNOT access DB directly
--   ✅ Supabase Advisor warnings resolved
-- ============================================================

-- 1. Enable RLS on every public table
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 2. Create policy: service_role can do EVERYTHING (SELECT, INSERT, UPDATE, DELETE)
--    This is the role your backend Sequelize connection uses.
CREATE POLICY "service_role_full_access" ON public.abandoned_carts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.addresses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.banners FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.blogs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.chat_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.coupon_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.coupon_usages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.coupons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.newsletters FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.page_contents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.popups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.site_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.system_prompts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.variants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON public.wishlists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Also allow the postgres role (superuser / migrations) full access
CREATE POLICY "postgres_full_access" ON public.abandoned_carts FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.addresses FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.banners FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.blogs FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.chat_logs FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.chat_sessions FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.coupon_assignments FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.coupon_usages FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.coupons FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.newsletters FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.notifications FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.order_items FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.orders FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.page_contents FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.popups FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.products FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.reviews FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.site_settings FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.system_prompts FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.users FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.variants FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "postgres_full_access" ON public.wishlists FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Done! All 22 tables now have RLS enabled with service_role + postgres bypass.
-- anon and authenticated roles are BLOCKED from direct DB access.
