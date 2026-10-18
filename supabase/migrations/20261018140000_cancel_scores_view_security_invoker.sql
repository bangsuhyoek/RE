-- Set security_invoker = true on cancel_difficulty_scores view
-- Resolves Supabase linter 0010_security_definer_view ERROR.
-- The underlying function public.get_cancel_difficulty_scores() remains SECURITY DEFINER with search_path = '',
-- so anon and authenticated callers retain access to k-anonymous aggregates while the view respects caller permissions.

alter view if exists public.cancel_difficulty_scores set (security_invoker = true);
