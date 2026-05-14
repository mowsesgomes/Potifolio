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

grant execute on function public.admin_save_project(jsonb) to authenticated;
grant execute on function public.admin_delete_project(uuid) to authenticated;

notify pgrst, 'reload schema';
