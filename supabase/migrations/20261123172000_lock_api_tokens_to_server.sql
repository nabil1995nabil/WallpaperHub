-- Keep API credential storage server-only. The browser must use the
-- authenticated /api/tokens routes and must never call this table directly.
revoke all on table public.api_tokens from public, anon, authenticated;
grant all on table public.api_tokens to service_role;

revoke all on sequence public.api_tokens_id_seq from public, anon, authenticated;
grant usage, select on sequence public.api_tokens_id_seq to service_role;
