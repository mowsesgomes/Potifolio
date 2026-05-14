create or replace function public.require_portfolio_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $admin_rpc$
begin
  if not public.is_portfolio_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
end;
$admin_rpc$;

create or replace function public.admin_save_project_section(
  p_step text,
  p_title text,
  p_description text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
begin
  perform public.require_portfolio_admin();

  insert into public.site_sections (section_key, step, title, description, status)
  values (
    'projects',
    coalesce(nullif(trim(p_step), ''), '03'),
    coalesce(nullif(trim(p_title), ''), 'Projetos selecionados.'),
    nullif(trim(coalesce(p_description, '')), ''),
    case when p_status = 'hidden' then 'hidden' else 'active' end
  )
  on conflict (section_key) do update
  set
    step = excluded.step,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status;
end;
$admin_rpc$;

create or replace function public.admin_save_brands(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
declare
  item jsonb;
  item_id uuid;
begin
  perform public.require_portfolio_admin();

  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    item_id := nullif(item->>'id', '')::uuid;

    if item_id is null then
      insert into public.brand_items (name, sort_order, status)
      values (
        trim(coalesce(item->>'name', '')),
        coalesce((item->>'sort_order')::integer, 0),
        case when item->>'status' = 'hidden' then 'hidden' else 'active' end
      );
    else
      update public.brand_items
      set
        name = trim(coalesce(item->>'name', '')),
        sort_order = coalesce((item->>'sort_order')::integer, sort_order),
        status = case when item->>'status' = 'hidden' then 'hidden' else 'active' end
      where id = item_id;
    end if;
  end loop;
end;
$admin_rpc$;

create or replace function public.admin_delete_brand(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
begin
  perform public.require_portfolio_admin();
  delete from public.brand_items where id = p_id;
end;
$admin_rpc$;

create or replace function public.admin_save_project(p_project jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $admin_rpc$
declare
  project_id uuid;
  saved_id uuid;
  project_tags text[];
  hero_featured boolean;
begin
  perform public.require_portfolio_admin();

  project_id := nullif(p_project->>'id', '')::uuid;
  project_tags := coalesce(
    array(select jsonb_array_elements_text(coalesce(p_project->'tags', '[]'::jsonb))),
    '{}'::text[]
  );
  hero_featured := coalesce((p_project->>'is_hero_featured')::boolean, false);

  if project_id is null then
    insert into public.projects (
      slug,
      title,
      type,
      summary,
      description,
      url,
      tags,
      sort_order,
      is_published,
      is_hero_featured
    )
    values (
      coalesce(nullif(trim(p_project->>'slug'), ''), gen_random_uuid()::text),
      coalesce(nullif(trim(p_project->>'title'), ''), 'Projeto sem titulo'),
      coalesce(trim(p_project->>'type'), ''),
      coalesce(trim(p_project->>'summary'), ''),
      coalesce(trim(p_project->>'description'), ''),
      nullif(trim(coalesce(p_project->>'url', '')), ''),
      project_tags,
      coalesce((p_project->>'sort_order')::integer, 0),
      coalesce((p_project->>'is_published')::boolean, true),
      hero_featured
    )
    returning id into saved_id;
  else
    update public.projects
    set
      slug = coalesce(nullif(trim(p_project->>'slug'), ''), slug),
      title = coalesce(nullif(trim(p_project->>'title'), ''), 'Projeto sem titulo'),
      type = coalesce(trim(p_project->>'type'), ''),
      summary = coalesce(trim(p_project->>'summary'), ''),
      description = coalesce(trim(p_project->>'description'), ''),
      url = nullif(trim(coalesce(p_project->>'url', '')), ''),
      tags = project_tags,
      sort_order = coalesce((p_project->>'sort_order')::integer, sort_order),
      is_published = coalesce((p_project->>'is_published')::boolean, true),
      is_hero_featured = hero_featured
    where id = project_id
    returning id into saved_id;
  end if;

  if hero_featured then
    update public.projects
    set is_hero_featured = false
    where is_hero_featured = true
      and id <> saved_id;
  end if;

  return saved_id;
end;
$admin_rpc$;

create or replace function public.admin_delete_project(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $admin_rpc$
begin
  perform public.require_portfolio_admin();
  delete from public.projects where id = p_id;
end;
$admin_rpc$;

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

grant execute on function public.require_portfolio_admin() to authenticated;
grant execute on function public.admin_save_project_section(text, text, text, text) to authenticated;
grant execute on function public.admin_save_brands(jsonb) to authenticated;
grant execute on function public.admin_delete_brand(uuid) to authenticated;
grant execute on function public.admin_save_project(jsonb) to authenticated;
grant execute on function public.admin_delete_project(uuid) to authenticated;
grant execute on function public.admin_save_project_image(jsonb) to authenticated;
grant execute on function public.admin_set_cover_image(uuid) to authenticated;
grant execute on function public.admin_delete_project_image(uuid) to authenticated;
grant execute on function public.admin_save_site_asset(jsonb) to authenticated;
grant execute on function public.admin_delete_site_asset(uuid) to authenticated;

notify pgrst, 'reload schema';
