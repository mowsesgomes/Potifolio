create or replace function public.can_manage_portfolio_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $storage_policy$
  select public.is_portfolio_admin();
$storage_policy$;

grant execute on function public.can_manage_portfolio_media() to authenticated;

drop policy if exists "Admins insert portfolio media" on storage.objects;
create policy "Admins insert portfolio media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'portfolio-media'
  and public.can_manage_portfolio_media()
);

drop policy if exists "Admins update portfolio media" on storage.objects;
create policy "Admins update portfolio media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'portfolio-media'
  and public.can_manage_portfolio_media()
)
with check (
  bucket_id = 'portfolio-media'
  and public.can_manage_portfolio_media()
);

drop policy if exists "Admins delete portfolio media" on storage.objects;
create policy "Admins delete portfolio media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'portfolio-media'
  and public.can_manage_portfolio_media()
);

drop policy if exists "Public reads portfolio media" on storage.objects;
create policy "Public reads portfolio media"
on storage.objects
for select
using (bucket_id = 'portfolio-media');

notify pgrst, 'reload schema';
