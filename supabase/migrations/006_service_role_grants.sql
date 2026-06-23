-- ============================================================
-- 006: Narrow service-role grant for first admin bootstrap
--
-- This lets the server-only bootstrap route assign admin/editor roles
-- after the first user signs up. It does not grant broad table access.
-- ============================================================

grant select, insert on public.user_roles to service_role;
