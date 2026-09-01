ALTER VIEW public.v_carteira SET (security_invoker = true);
GRANT SELECT ON public.v_carteira TO authenticated;
GRANT ALL ON public.v_carteira TO service_role;