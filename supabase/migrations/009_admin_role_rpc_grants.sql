-- ============================================================
-- 009: Admin role RPC grants
--
-- Middleware and server components use this SECURITY DEFINER
-- helper to avoid user_roles RLS visibility drift in production.
-- ============================================================

grant execute on function public.is_admin_or_editor() to authenticated;
grant execute on function public.is_admin_or_editor() to anon;
