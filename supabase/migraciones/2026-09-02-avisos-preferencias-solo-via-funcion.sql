-- CORRIGE un agujero abierto por `2026-09-01-avisos-personalizados.sql`.
--
-- APLICADO EN PRODUCCION el 2026-09-02 (migracion
-- `avisos_preferencias_solo_via_funcion`).
--
-- El fallo: aquella migracion dejaba una politica de UPDATE con `using (true)`,
-- confiando en que sin politica SELECT nadie puede enumerar endpoints. El
-- razonamiento era falso — PostgREST acepta un PATCH SIN FILTRO, asi que
-- cualquiera con la clave anonima (que va en el HTML, a la vista) podia
-- reescribir `temas` en TODAS las filas de golpe y dejar a la comunidad entera
-- sin avisos. Reproducido contra la base real antes de arreglarlo: el rol
-- anonimo actualizaba todas las filas sin poner un solo filtro.
--
-- La correccion: el rol anonimo pierde el UPDATE directo. Para guardar sus
-- preferencias pasa por una funcion que EXIGE el endpoint y toca como mucho la
-- fila de ese endpoint. Sin endpoint no se puede hacer nada, y el endpoint solo
-- lo conoce el navegador que se suscribio.

drop policy if exists "cada uno actualiza su suscripcion" on public.push_suscripciones;
revoke update on public.push_suscripciones from anon, authenticated;

create or replace function public.guardar_preferencias_aviso(
  p_endpoint text,
  p_temas    text[],
  p_ciudad   text,
  p_pais     text
) returns void
language sql
security definer
set search_path = public
as $$
  update public.push_suscripciones
     set temas = coalesce(
           -- solo temas conocidos; si no queda ninguno, se deja lo que habia
           (select array_agg(t) from unnest(p_temas) as t
             where t in ('encuentros','empleos','negocios','tramites')),
           temas),
         ciudad = nullif(left(trim(p_ciudad), 50), ''),
         pais   = nullif(left(trim(p_pais),   50), '')
   where endpoint = p_endpoint;
$$;

comment on function public.guardar_preferencias_aviso is
  'Unica via para que la app guarde sus preferencias de aviso. Exige el endpoint, que solo conoce el navegador suscrito, y toca una sola fila.';

revoke all     on function public.guardar_preferencias_aviso(text, text[], text, text) from public;
grant  execute on function public.guardar_preferencias_aviso(text, text[], text, text) to anon, authenticated;
