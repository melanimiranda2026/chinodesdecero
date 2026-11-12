-- Tablas iniciales. Aplicar en el SQL editor de Supabase o con `supabase db push`.

create table if not exists public.suscriptores (
  email text primary key,
  consentimiento boolean not null,
  origen text,
  creado timestamptz not null default now(),
  plan text not null default 'gratis' -- lugar para los pagos futuros
);

create table if not exists public.eventos (
  id bigserial primary key,
  sesion text not null,
  nombre text not null,
  datos jsonb,
  creado timestamptz not null default now()
);

create table if not exists public.avance (
  user_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null,
  actualizado timestamptz not null default now()
);

-- suscriptores y eventos: RLS activado y sin políticas; solo escribe el service role.
alter table public.suscriptores enable row level security;
alter table public.eventos enable row level security;

alter table public.avance enable row level security;

create policy "avance_select_propio" on public.avance
  for select to authenticated using (user_id = auth.uid());
create policy "avance_insert_propio" on public.avance
  for insert to authenticated with check (user_id = auth.uid());
create policy "avance_update_propio" on public.avance
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
