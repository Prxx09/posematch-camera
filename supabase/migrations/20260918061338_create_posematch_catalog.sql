create table public.poses (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 120),
 category text not null check (category in ('solo','couple','group','pet','airport fit check','mirror selfie')),
 image_path text not null unique check (image_path !~ '^/' and image_path !~ '\.\.'),
 orientation text not null default 'portrait' check (orientation in ('portrait','landscape','square')),
 tags text[] not null default '{}',
 is_featured boolean not null default false,
 is_active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.poses enable row level security;
revoke all on public.poses from anon, authenticated;
grant select on public.poses to anon, authenticated;
create policy "Read active catalog poses" on public.poses for select to anon, authenticated using (is_active);
create index poses_active_order_idx on public.poses (sort_order, created_at desc) where is_active;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('pose-catalog','pose-catalog',true,10485760,array['image/jpeg','image/png','image/webp']);
