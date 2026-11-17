-- WallpaperHub shared translation cache and monthly free-quota guard.
-- Run this once in Supabase Dashboard -> SQL Editor.
-- The browser must never access these tables; only the server service_role uses them.

create table if not exists public.wallpaperhub_translation_cache (
    cache_key text primary key check (cache_key ~ '^[0-9a-f]{64}$'),
    source_language text not null default 'auto',
    target_language text not null,
    source_text text not null,
    translated_text text not null,
    provider text not null default 'byteplus',
    character_count integer not null default 0 check (character_count >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists wallpaperhub_translation_cache_target_idx
    on public.wallpaperhub_translation_cache (target_language);

alter table public.wallpaperhub_translation_cache enable row level security;
revoke all on table public.wallpaperhub_translation_cache from anon, authenticated;
grant all on table public.wallpaperhub_translation_cache to service_role;

create table if not exists public.wallpaperhub_translation_usage (
    billing_month date primary key,
    character_count bigint not null default 0 check (character_count >= 0),
    updated_at timestamptz not null default now()
);

alter table public.wallpaperhub_translation_usage enable row level security;
revoke all on table public.wallpaperhub_translation_usage from anon, authenticated;
grant all on table public.wallpaperhub_translation_usage to service_role;

-- Atomically reserve characters before sending a cache miss to BytePlus.
-- Return false when the safe monthly cap would be exceeded.
create or replace function public.reserve_wallpaperhub_translation_chars(
    p_chars integer,
    p_monthly_limit integer default 1900000
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_month date := date_trunc('month', now() at time zone 'UTC')::date;
begin
    if p_chars is null or p_chars < 0 or p_monthly_limit is null or p_monthly_limit < 1 then
        return false;
    end if;
    if p_chars = 0 then
        return true;
    end if;
    if p_chars > p_monthly_limit then
        return false;
    end if;

    insert into public.wallpaperhub_translation_usage (billing_month, character_count, updated_at)
    values (v_month, p_chars, now())
    on conflict (billing_month) do update
       set character_count = public.wallpaperhub_translation_usage.character_count + excluded.character_count,
           updated_at = now()
     where public.wallpaperhub_translation_usage.character_count + excluded.character_count <= p_monthly_limit;

    return found;
end;
$$;

revoke all on function public.reserve_wallpaperhub_translation_chars(integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_wallpaperhub_translation_chars(integer, integer) to service_role;

comment on table public.wallpaperhub_translation_cache is
    'Shared translations used by WallpaperHub; server service_role only.';
comment on table public.wallpaperhub_translation_usage is
    'Monthly character reservations protecting the BytePlus free translation quota.';
