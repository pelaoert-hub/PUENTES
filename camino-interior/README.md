# Camino Interior

Web de crecimiento personal y espiritualidad. Sitio estático: HTML, CSS y JavaScript, sin dependencias ni CDN.

- `index.html`, `estilo.css`, `app.js`: la web.
- `articulos.js`: los artículos (hoy, 3 borradores).
- `config.js`: datos de la comunidad (vacío = comunidad desactivada).
- `supabase/comunidad.sql`: tabla y reglas de la comunidad. **No aplicado.**

Probar en local: `python3 -m http.server -d camino-interior 8000`.

## Publicar en vantlygo.com (pendiente: el dominio aún no está disponible)

1. Cuando el dominio esté liberado/transferido a Vercel, crear un proyecto nuevo en Vercel con **Root Directory = `camino-interior`** (este `vercel.json` ya viene listo).
2. Añadir `vantlygo.com` en Settings → Domains.
3. Comunidad: crear un proyecto de Supabase propio, aplicar `supabase/comunidad.sql`, y rellenar `config.js` (URL y clave pública). Los mensajes nuevos se aprueban a mano en el panel.
4. Antes de publicar: revisar los 3 artículos (están marcados como borrador) y quitar `borrador: true`.
5. Comprobar en el dominio real: que cargue, que `robots.txt` y `sitemap.xml` respondan.

Las URL de `index.html`, `robots.txt` y `sitemap.xml` ya apuntan a https://vantlygo.com. Si el dominio cambia, hay que actualizarlas.
