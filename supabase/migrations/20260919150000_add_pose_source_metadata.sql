alter table public.poses
  add column source_id text,
  add column source_url text,
  add column creator text,
  add column license text,
  add column license_url text,
  add column provider text,
  add column alt_text text;

create unique index poses_provider_source_id_idx
  on public.poses (provider, source_id)
  where provider is not null and source_id is not null;

comment on column public.poses.source_url is 'Canonical source page for license and attribution review.';
comment on column public.poses.license is 'License name captured when the catalog item was imported.';
