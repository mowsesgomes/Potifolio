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

grant execute on function public.require_portfolio_admin() to authenticated;
grant execute on function public.admin_save_project_section(text, text, text, text) to authenticated;
grant execute on function public.admin_save_brands(jsonb) to authenticated;
grant execute on function public.admin_delete_brand(uuid) to authenticated;

notify pgrst, 'reload schema';
