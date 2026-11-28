-- Preserve the user's selected target device on published wallpapers.
alter table public.wallpapers
  add column if not exists device text not null default 'all';

update public.wallpapers
set device = 'all'
where device is null or trim(device) = '';
