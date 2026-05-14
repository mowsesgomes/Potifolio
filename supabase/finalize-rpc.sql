create or replace function public.get_portfolio_content()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'projectSection',
      coalesce(
        (
          select jsonb_build_object(
            'id', id,
            'section_key', section_key,
            'step', step,
            'title', title,
            'description', description,
            'status', status
          )
          from public.site_sections
          where section_key = 'projects'
            and status = 'active'
          limit 1
        ),
        '{}'::jsonb
      ),
    'brands',
      coalesce(
        (
          select jsonb_agg(name order by sort_order)
          from public.brand_items
          where status = 'active'
        ),
        '[]'::jsonb
      ),
    'brandItems',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', id,
              'name', name,
              'sort_order', sort_order,
              'status', status
            )
            order by sort_order
          )
          from public.brand_items
          where status = 'active'
        ),
        '[]'::jsonb
      ),
    'projects',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'slug', p.slug,
              'title', p.title,
              'type', p.type,
              'summary', p.summary,
              'description', p.description,
              'url', p.url,
              'tags', p.tags,
              'sort_order', p.sort_order,
              'is_published', p.is_published,
              'is_hero_featured', p.is_hero_featured,
              'images',
                coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', pi.id,
                        'project_id', pi.project_id,
                        'storage_path', pi.storage_path,
                        'public_url', pi.public_url,
                        'alt_text', pi.alt_text,
                        'sort_order', pi.sort_order,
                        'is_cover', pi.is_cover,
                        'show_in_gallery', pi.show_in_gallery,
                        'status', pi.status
                      )
                      order by pi.sort_order
                    )
                    from public.project_images pi
                    where pi.project_id = p.id
                      and pi.status = 'active'
                  ),
                  '[]'::jsonb
                )
            )
            order by p.sort_order
          )
          from public.projects p
          where p.is_published = true
        ),
        '[]'::jsonb
      ),
    'assets',
      coalesce(
        (
          select jsonb_object_agg(asset_key, public_url)
          from public.site_assets
          where status = 'active'
        ),
        '{}'::jsonb
      ),
    'siteAssets',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', id,
              'asset_key', asset_key,
              'label', label,
              'storage_path', storage_path,
              'public_url', public_url,
              'alt_text', alt_text,
              'status', status
            )
            order by asset_key
          )
          from public.site_assets
          where status = 'active'
        ),
        '[]'::jsonb
      )
  );
$$;

grant execute on function public.get_portfolio_content() to public, anon, authenticated;

notify pgrst, 'reload schema';
