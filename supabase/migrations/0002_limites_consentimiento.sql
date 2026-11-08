-- 0002: límites por IP/correo, doble opt-in, avance pendiente (entre dispositivos) y baja.
-- Aplicar después de 0001 (SQL editor de Supabase o `supabase db push`).

-- ---------- suscriptores: doble opt-in, avance pendiente y token de baja ----------
alter table public.suscriptores
  add column if not exists consentimiento_confirmado boolean not null default false,
  add column if not exists consentido_en timestamptz,
  add column if not exists texto_consentimiento text,
  add column if not exists avance_pendiente jsonb,
  add column if not exists token_baja uuid not null default gen_random_uuid();

create unique index if not exists suscriptores_token_baja_idx on public.suscriptores (token_baja);

-- ---------- límites: ventanas fijas por clave (nunca IP ni correo en claro: solo su hash) ----------
create table if not exists public.limites (
  clave text not null,
  ventana timestamptz not null,
  cuenta int not null default 0,
  primary key (clave, ventana)
);

-- RLS activado y sin políticas: solo el service role la toca (a través de la función).
alter table public.limites enable row level security;

-- Suma un uso a la ventana actual de `p_clave`; true si sigue dentro del máximo.
create or replace function public.consumir_limite(p_clave text, p_max int, p_segundos int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ventana timestamptz;
  v_cuenta int;
begin
  v_ventana := to_timestamp(floor(extract(epoch from now()) / p_segundos) * p_segundos);
  insert into public.limites as l (clave, ventana, cuenta)
  values (p_clave, v_ventana, 1)
  on conflict (clave, ventana) do update set cuenta = l.cuenta + 1
  returning l.cuenta into v_cuenta;
  -- limpieza ocasional de ventanas viejas
  if random() < 0.01 then
    delete from public.limites where ventana < now() - interval '1 day';
  end if;
  return v_cuenta <= p_max;
end;
$$;

revoke all on function public.consumir_limite(text, int, int) from public;
revoke all on function public.consumir_limite(text, int, int) from anon, authenticated;
grant execute on function public.consumir_limite(text, int, int) to service_role;
