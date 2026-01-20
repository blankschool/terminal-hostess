alter table public.download_jobs
add column if not exists public_read boolean not null default true;

alter table public.download_jobs enable row level security;

drop policy if exists "download_jobs_select_public_or_owner" on public.download_jobs;
create policy "download_jobs_select_public_or_owner"
on public.download_jobs
for select
using (public_read = true or requested_by = auth.uid());
