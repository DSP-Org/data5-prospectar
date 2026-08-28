REVOKE EXECUTE ON FUNCTION public.pode_acessar(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.pode_acessar(uuid, text) TO authenticated, service_role;