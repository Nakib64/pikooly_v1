create table if not exists public.perf_pages (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  path text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.perf_pages to anon, authenticated;
grant all on public.perf_pages to service_role;
alter table public.perf_pages enable row level security;
create policy "perf_pages readable by all" on public.perf_pages for select to anon, authenticated using (true);
create policy "perf_pages admin manage" on public.perf_pages for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.perf_psi_runs (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.perf_pages(id) on delete cascade,
  url text not null,
  strategy text not null check (strategy in ('mobile','desktop')),
  performance_score numeric,
  lcp_ms numeric,
  fcp_ms numeric,
  cls numeric,
  ttfb_ms numeric,
  inp_ms numeric,
  tbt_ms numeric,
  si_ms numeric,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists perf_psi_runs_page_created on public.perf_psi_runs(page_id, created_at desc);
grant select on public.perf_psi_runs to authenticated;
grant all on public.perf_psi_runs to service_role;
alter table public.perf_psi_runs enable row level security;
create policy "perf_psi_runs admin select" on public.perf_psi_runs for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.perf_rum_events (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  metric text not null,
  value numeric not null,
  rating text,
  navigation_type text,
  device text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists perf_rum_events_path_metric_created on public.perf_rum_events(path, metric, created_at desc);
create index if not exists perf_rum_events_created on public.perf_rum_events(created_at desc);
grant select on public.perf_rum_events to authenticated;
grant insert on public.perf_rum_events to anon, authenticated;
grant all on public.perf_rum_events to service_role;
alter table public.perf_rum_events enable row level security;
create policy "perf_rum_events public insert" on public.perf_rum_events for insert to anon, authenticated with check (true);
create policy "perf_rum_events admin select" on public.perf_rum_events for select to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.perf_pages (label, path) values
  ('Homepage', '/'),
  ('Shop', '/shop'),
  ('Cart', '/cart'),
  ('Checkout', '/checkout'),
  ('Blog', '/blog'),
  ('About', '/about-us'),
  ('Contact', '/contact-us')
on conflict (path) do nothing;