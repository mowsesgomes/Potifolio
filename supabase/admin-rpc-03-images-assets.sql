create or replace function public.admin_save_project_image(p_image jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $admin_rpc$
declare
  image_id uuid;
  saved_id uuid;
begin
  perform public.require_portfolio_admin();

  image_id := nullif(p_image->>'id', '')::uuid;

  if image_id is null then
    insert into public.project_images (
      project_id,
      storage_path,
      public_url,
      alt_text,
      sort_order,
      is_cover,
      show_in_gallery,
      status
    )
    values (
      (p_image->>'project_id')::uuid,
      coalesce(p_image->>'storage_path', ''),
      coalesce(p_image->>'public_url', ''),
      coalesce(p_image->>'alt_text', ''),
      coalesce((p_image->>'sort_order')::integer, 0),
      coalesce((p_image->>'is_cover')::boolean, false),
      coalesce((p_image->>'show_in_gallery')::boolean, true),
      case when p_image->>'status' = 'hidden' then 'hidden' else 'active' end
    )
    returning id into saved_id;
  else
    update public.project_images
    set
      alt_text = coalesce(p_image->>'alt_text', ''),
      sort_order = coalesce((p_image->>'sort_order')::integer, sort_order),
      show_in_gallery = coalesce((p_image->>'show_in_gallery')::boolean, true),
      status = case when p_image->>'status' = 'hidden' then 'hidden' else 'active' end
    where id = image_id
    returning id into saved_id;
  end if;

  return saved_id;
end;
$admin_rpc$;

create or replace function public.admin_set_cover_image(p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
declare
  target_project_id uuid;
begin
  perform public.require_portfolio_admin();

  select project_id into target_project_id
  from public.project_images
  where id = p_image_id;

  update public.project_images
  set is_cover = false
  where project_id = target_project_id;

  update public.project_images
  set is_cover = true
  where id = p_image_id;
end;
$admin_rpc$;

create or replace function public.admin_delete_project_image(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
begin
  perform public.require_portfolio_admin();
  delete from public.project_images where id = p_id;
end;
$admin_rpc$;

create or replace function public.admin_save_site_asset(p_asset jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $admin_rpc$
declare
  saved_id uuid;
begin
  perform public.require_portfolio_admin();

  insert into public.site_assets (
    asset_key,
    label,
    storage_path,
    public_url,
    alt_text,
    status
  )
  values (
    coalesce(nullif(trim(p_asset->>'asset_key'), ''), gen_random_uuid()::text),
    coalesce(nullif(trim(p_asset->>'label'), ''), 'Midia'),
    coalesce(p_asset->>'storage_path', ''),
    coalesce(p_asset->>'public_url', ''),
    coalesce(p_asset->>'alt_text', ''),
    case when p_asset->>'status' = 'hidden' then 'hidden' else 'active' end
  )
  on conflict (asset_key) do update
  set
    label = excluded.label,
    storage_path = excluded.storage_path,
    public_url = excluded.public_url,
    alt_text = excluded.alt_text,
    status = excluded.status
  returning id into saved_id;

  return saved_id;
end;
$admin_rpc$;

create or replace function public.admin_delete_site_asset(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
begin
  perform public.require_portfolio_admin();
  delete from public.site_assets where id = p_id;
end;
$admin_rpc$;

grant execute on function public.admin_save_project_image(jsonb) to authenticated;
grant execute on function public.admin_set_cover_image(uuid) to authenticated;
grant execute on function public.admin_delete_project_image(uuid) to authenticated;
grant execute on function public.admin_save_site_asset(jsonb) to authenticated;
grant execute on function public.admin_delete_site_asset(uuid) to authenticated;

notify pgrst, 'reload schema';
