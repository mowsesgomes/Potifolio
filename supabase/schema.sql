-- Supabase setup for the dynamic portfolio admin.
-- Run this file in the Supabase SQL editor, then create one Auth user and
-- insert its id into public.admin_users.

create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_portfolio_admin() to anon, authenticated;

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  step text not null default '',
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  type text not null default '',
  summary text not null default '',
  description text not null default '',
  url text,
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  is_hero_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  show_in_gallery boolean not null default true,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  label text not null,
  storage_path text not null,
  public_url text not null,
  alt_text text not null default '',
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_sections_updated_at on public.site_sections;
create trigger set_site_sections_updated_at
before update on public.site_sections
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_project_images_updated_at on public.project_images;
create trigger set_project_images_updated_at
before update on public.project_images
for each row execute function public.set_updated_at();

drop trigger if exists set_brand_items_updated_at on public.brand_items;
create trigger set_brand_items_updated_at
before update on public.brand_items
for each row execute function public.set_updated_at();

drop trigger if exists set_site_assets_updated_at on public.site_assets;
create trigger set_site_assets_updated_at
before update on public.site_assets
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  10485760,
  array['image/avif', 'image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.admin_users enable row level security;
alter table public.site_sections enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.brand_items enable row level security;
alter table public.site_assets enable row level security;

grant usage on schema public to anon, authenticated;
grant usage on schema public to public;
grant select on public.site_sections to public;
grant select on public.projects to public;
grant select on public.project_images to public;
grant select on public.brand_items to public;
grant select on public.site_assets to public;
grant select on public.site_sections to anon, authenticated;
grant select on public.projects to anon, authenticated;
grant select on public.project_images to anon, authenticated;
grant select on public.brand_items to anon, authenticated;
grant select on public.site_assets to anon, authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.site_sections to authenticated;
grant insert, update, delete on public.projects to authenticated;
grant insert, update, delete on public.project_images to authenticated;
grant insert, update, delete on public.brand_items to authenticated;
grant insert, update, delete on public.site_assets to authenticated;
grant insert, update, delete on public.admin_users to authenticated;

drop policy if exists "Admins can view admin users" on public.admin_users;
create policy "Admins can view admin users"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid() or public.is_portfolio_admin());

drop policy if exists "Admins manage admin users" on public.admin_users;
create policy "Admins manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "Public reads active sections" on public.site_sections;
create policy "Public reads active sections"
on public.site_sections
for select
using (status = 'active');

drop policy if exists "Admins manage sections" on public.site_sections;
create policy "Admins manage sections"
on public.site_sections
for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "Public reads published projects" on public.projects;
create policy "Public reads published projects"
on public.projects
for select
using (is_published = true);

drop policy if exists "Admins manage projects" on public.projects;
create policy "Admins manage projects"
on public.projects
for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "Public reads active images for published projects" on public.project_images;
create policy "Public reads active images for published projects"
on public.project_images
for select
using (
  status = 'active'
  and exists (
    select 1
    from public.projects
    where projects.id = project_images.project_id
      and projects.is_published = true
  )
);

drop policy if exists "Admins manage project images" on public.project_images;
create policy "Admins manage project images"
on public.project_images
for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "Public reads active brands" on public.brand_items;
create policy "Public reads active brands"
on public.brand_items
for select
using (status = 'active');

drop policy if exists "Admins manage brands" on public.brand_items;
create policy "Admins manage brands"
on public.brand_items
for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "Public reads active assets" on public.site_assets;
create policy "Public reads active assets"
on public.site_assets
for select
using (status = 'active');

drop policy if exists "Admins manage assets" on public.site_assets;
create policy "Admins manage assets"
on public.site_assets
for all
to authenticated
using (public.is_portfolio_admin())
with check (public.is_portfolio_admin());

drop policy if exists "Public reads portfolio media" on storage.objects;
create policy "Public reads portfolio media"
on storage.objects
for select
using (bucket_id = 'portfolio-media');

drop policy if exists "Admins insert portfolio media" on storage.objects;
create policy "Admins insert portfolio media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'portfolio-media' and public.is_portfolio_admin());

drop policy if exists "Admins update portfolio media" on storage.objects;
create policy "Admins update portfolio media"
on storage.objects
for update
to authenticated
using (bucket_id = 'portfolio-media' and public.is_portfolio_admin())
with check (bucket_id = 'portfolio-media' and public.is_portfolio_admin());

drop policy if exists "Admins delete portfolio media" on storage.objects;
create policy "Admins delete portfolio media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'portfolio-media' and public.is_portfolio_admin());

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
