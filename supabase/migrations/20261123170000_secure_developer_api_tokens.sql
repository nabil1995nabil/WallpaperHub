-- Store developer API keys as SHA-256 digests and enforce atomic daily quota claims.
alter table public.api_tokens
  add column if not exists token_hash text;

update public.api_tokens
set token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
where coalesce(token, '') <> ''
  and coalesce(token_hash, '') = '';

create unique index if not exists api_tokens_token_hash_uidx
  on public.api_tokens (token_hash)
  where token_hash is not null and token_hash <> '';

alter table public.api_tokens
  alter column token set default '';

update public.api_tokens
set daily_limit = least(greatest(coalesce(daily_limit, 200), 20), 200),
    requests = greatest(coalesce(requests, 0), 0);

create or replace function public.claim_developer_api_quota(
  p_token_id bigint,
  p_today date,
  p_max_items integer
)
returns table (granted integer, used integer, remaining integer)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_limit integer;
  v_used integer;
  v_granted integer;
begin
  if p_token_id is null or p_today is null or p_max_items is null or p_max_items < 0 then
    raise exception 'Invalid API quota claim';
  end if;

  select
    least(greatest(coalesce(t.daily_limit, 20), 1), 200),
    case when t.last_request_date = p_today
      then greatest(coalesce(t.requests, 0), 0) else 0 end
  into v_limit, v_used
  from public.api_tokens as t
  where t.id = p_token_id and t.active is true
  for update;

  if not found then
    return query select 0, 0, 0;
    return;
  end if;

  v_granted := least(greatest(p_max_items, 0), greatest(v_limit - v_used, 0));

  update public.api_tokens as t
  set requests = v_used + v_granted,
      last_request_date = p_today,
      last_used = case when v_granted > 0 then now() else t.last_used end
  where t.id = p_token_id and t.active is true;

  return query select v_granted, v_used + v_granted, greatest(v_limit - (v_used + v_granted), 0);
end;
$function$;

revoke all on function public.claim_developer_api_quota(bigint, date, integer)
  from public, anon, authenticated;
grant execute on function public.claim_developer_api_quota(bigint, date, integer)
  to service_role;
