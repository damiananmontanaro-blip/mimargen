-- ============================================================
-- MI MARGEN — Esquema Supabase v1
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1) PERFILES: país + fin del trial (3 días desde el registro)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  pais text not null default 'AR' check (pais in ('AR','MX','CO')),
  trial_ends_at timestamptz not null default (now() + interval '3 days'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfil propio: leer" on public.profiles;
create policy "perfil propio: leer" on public.profiles
  for select using (auth.uid() = id);

-- SEGURIDAD: sin policy de UPDATE para usuarios sobre profiles.
-- Si existiera, el usuario podría editar su propio trial_ends_at y extenderse
-- la prueba gratis indefinidamente. El país del negocio viaja dentro del
-- escenario guardado (data.pais), así que no hace falta escribir acá.

-- Trigger: crear perfil automáticamente al registrarse (toma el país del metadata del signup)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, pais)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'pais', 'AR')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) SUSCRIPCIONES (las escribe SOLO el webhook con service_role; el usuario solo lee la suya)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lemon_subscription_id text,
  status text not null default 'unknown',
  email text,
  renews_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "suscripcion propia: leer" on public.subscriptions;
create policy "suscripcion propia: leer" on public.subscriptions
  for select using (auth.uid() = user_id);
-- OJO: sin policy de insert/update para usuarios => solo service_role puede escribir. Es a propósito.

-- 3) ESCENARIOS: el "Excel" del usuario guardado en la nube
create table if not exists public.escenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null default 'principal',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, nombre)
);

alter table public.escenarios enable row level security;

drop policy if exists "escenarios propios: todo" on public.escenarios;
create policy "escenarios propios: todo" on public.escenarios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índice para lecturas por usuario
create index if not exists escenarios_user_idx on public.escenarios (user_id);
