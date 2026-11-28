-- Allow post owners to edit only the post body.
-- The table-level UPDATE privilege remains revoked; authenticated users receive
-- UPDATE on the body column only. RLS keeps edits scoped to the post owner.

revoke update on table public.social_posts from anon, authenticated;
grant update (body) on table public.social_posts to authenticated;

drop policy if exists "social_posts_update_own_body" on public.social_posts;
create policy "social_posts_update_own_body"
on public.social_posts
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and is_deleted = false
)
with check (
  (select auth.uid()) = user_id
  and is_deleted = false
  and char_length(body) <= 3000
  and (char_length(trim(body)) > 0 or media_url is not null)
);
