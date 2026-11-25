-- Private monthly achievement book snapshots for WallpaperHub.
begin;
create table if not exists public.user_monthly_books (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  report jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);
create index if not exists user_monthly_books_user_month_idx
  on public.user_monthly_books (user_id, month_start desc);
alter table public.user_monthly_books enable row level security;
revoke all on public.user_monthly_books from anon, authenticated;
grant select, insert, update, delete on public.user_monthly_books to service_role;
comment on table public.user_monthly_books is
  'Private monthly achievement book snapshots; access only via authenticated server API.';
commit;
