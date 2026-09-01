-- Avisos personalizados
-- ---------------------
-- Hasta ahora, cuando alguien convocaba un encuentro se le mandaba el mismo
-- aviso a TODO el que estuviera suscrito, viviera donde viviera. Eso quema la
-- suscripcion: la gente desactiva los avisos y no vuelve.
--
-- Con estas dos columnas cada suscripcion dice de QUE quiere enterarse y
-- DONDE esta, y la funcion `enviar-aviso-encuentro` solo avisa a quien le toca.
--
-- APLICADO EN PRODUCCION el 2026-09-01 (migracion `avisos_personalizados`).
-- Se deja aqui como registro de lo que se ejecuto.
--
-- Como aplicarlo en otro entorno: pegar esto en el editor SQL de Supabase.
--   https://supabase.com/dashboard/project/ggehkwinqlhsdbimovzx/sql/new
--
-- Es opcional y no rompe nada: la app funciona igual sin estas columnas (el
-- guardado de preferencias falla en silencio y la suscripcion se crea igual),
-- y la funcion tambien, porque vuelve a leer sin ellas si no existen.

alter table public.push_suscripciones
  add column if not exists temas  text[] not null default array['encuentros'],
  add column if not exists ciudad text,
  add column if not exists pais   text;

comment on column public.push_suscripciones.temas is
  'De que se quiere enterar: encuentros, empleos, negocios, tramites.';
comment on column public.push_suscripciones.ciudad is
  'Ciudad del perfil, para señalar lo que pasa cerca. Puede ser NULL.';
comment on column public.push_suscripciones.pais is
  'Pais del perfil. Puede ser NULL.';

-- Para poder buscar "quien quiere avisos de encuentros" sin recorrer la tabla.
create index if not exists push_suscripciones_temas_idx
  on public.push_suscripciones using gin (temas);

-- La app guarda sus preferencias con un UPDATE sobre su propia suscripcion,
-- identificada por el endpoint que solo conoce ese navegador. La tabla no
-- tiene politica SELECT publica, asi que los endpoints no se pueden enumerar.
drop policy if exists "cada uno actualiza su suscripcion" on public.push_suscripciones;
create policy "cada uno actualiza su suscripcion"
  on public.push_suscripciones
  for update
  using (true)
  with check (true);

-- Defensa en profundidad: aunque alguien llegase a adivinar un endpoint, solo
-- puede cambiar preferencias — nunca endpoint, p256dh ni auth, que es lo que
-- permitiria desviarse los avisos de otra persona a su propio navegador.
revoke update on public.push_suscripciones from anon, authenticated;
grant  update (temas, ciudad, pais) on public.push_suscripciones to anon, authenticated;
