-- NO APLICADO. Crea esto en un proyecto de Supabase propio para esta web,
-- no en el de Puentes.
create table public.comunidad_mensajes (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 40),
  texto  text not null check (char_length(texto)  between 5 and 500),
  aprobado boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.comunidad_mensajes enable row level security;

-- cualquiera puede enviar, pero siempre sin aprobar
create policy "enviar" on public.comunidad_mensajes
  for insert to anon with check (aprobado = false);
-- cualquiera puede leer solo lo aprobado
create policy "leer aprobados" on public.comunidad_mensajes
  for select to anon using (aprobado = true);
-- anon no tiene UPDATE ni DELETE: aprobar se hace desde el panel de Supabase
