create extension if not exists "pgcrypto";

create table if not exists public.download_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null check (status in ('queued', 'processing', 'completed', 'failed', 'expired')),
  source_url text not null,
  platform text,
  requested_by uuid,
  priority int not null default 0,
  attempts int not null default 0,
  max_attempts int not null default 2,
  error_code text,
  error_message text,
  output_items jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  worker text,
  callback_url text
);

create index if not exists download_jobs_status_idx on public.download_jobs (status);
create index if not exists download_jobs_created_at_idx on public.download_jobs (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_download_jobs_updated_at on public.download_jobs;
create trigger set_download_jobs_updated_at
before update on public.download_jobs
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('downloads', 'downloads', false)
on conflict (id) do nothing;
