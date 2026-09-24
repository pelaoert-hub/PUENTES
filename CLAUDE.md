# Trabajar en Puentes

Puentes ([puentescuba.com](https://www.puentescuba.com)) es una guía y comunidad
para cubanos dentro y fuera de la isla: trámites con fuentes oficiales, remesas,
empleos, negocios y artículos de historia.

**El README tiene la documentación del proyecto** (1300+ líneas: qué hay hecho,
por qué, y cómo quedó cada cosa). Este archivo es otra cosa: las reglas para
trabajar aquí. Léelas antes de tocar nada.

---

## 1. Todo en español

Respuestas, mensajes de commit, descripciones de PR y comentarios de código.

Los **comentarios dentro del código van sin acentos** — es la convención que ya
sigue todo el repositorio (`sw.js`, `index.html`). El texto que ve el usuario sí
lleva acentos, obviamente.

## 2. La regla que manda: nada sin verificar

Es lo que distingue a Puentes de cualquier otro directorio. Si se rompe, el
proyecto no sirve para nada.

- **Nunca inventes un dato.** Ni una comisión, ni un teléfono, ni una dirección,
  ni un horario. Si un proveedor no publica su tarifa, se escribe
  `"Ver en el sitio"`. Si no encuentras un dato, se deja vacío y se dice.
- **Comprueba cada enlace antes de ponerlo**, y si no puedes comprobarlo, dilo
  explícitamente en la respuesta y en el commit. No lo escondas.
- **Solo https://**. No queda ni un `http://` en la web y no debe volver a haber
  ninguno.
- Cuando la respuesta honesta sea *"no existe forma segura de hacer esto"*, esa
  **es** la respuesta y va escrita en la web. Ver el aviso de Abjasia en la
  sección de remesas como ejemplo.

### Los tres sellos

| Sello | Cuándo |
|---|---|
| `✓ Verificado oficialmente` | El dato viene de una fuente oficial enlazada |
| `◐ Comprobado por Puentes` | Lo comprobamos a mano, con fecha de comprobación |
| `? Aporte de la comunidad` | Lo publicó un usuario. **Nadie lo ha verificado** |

Lo que publica la comunidad (negocios, empleos, anuncios) no se presenta nunca
como verificado.

## 3. Estructura

    web/                    <- la web entera; esto es lo que se publica
      index.html            <- la app (~180 KB, todo en un archivo)
      sw.js                 <- service worker
      sitemap.xml
      articulos/<slug>/index.html
      guias/<slug>/index.html
    vercel.json             <- EN LA RAIZ, y tiene que seguir ahi (ver abajo)
    supabase/migraciones/   <- el SQL tal como se aplico
    README.md               <- la documentacion larga

## 4. Despliegue

**Vercel construye desde la raíz del repositorio, no desde `web/`.** El
`vercel.json` de la raíz tiene `outputDirectory: "web"` y los comandos de
instalación y construcción vacíos. Si se borra ese archivo, la web se publica
vacía y responde 404 en todas las rutas. Ya pasó una vez.

Un empujón a `main` publica producción automáticamente. Por eso:

- **Nunca empujes directo a `main`.** Rama → PR → fusionar.
- Verifica siempre en el dominio real después de desplegar, no solo en local.

## 5. Publicar un artículo

Tres pasos, y los tres hacen falta:

1. Crear `web/articulos/<slug>/index.html` (copia otro artículo como plantilla:
   mismas tipografías y colores, `canonical`, Open Graph, JSON-LD de `Article`,
   botones de compartir, bloque de la app y la encuesta).
2. Añadirlo **el primero** de la lista `articulos` en `web/index.html`.
3. Sumarlo a `web/sitemap.xml`.

**Para programar la publicación**, la entrada admite `desde: '2026-09-14T12:00:00Z'`
(ISO, en UTC). Hasta esa hora el artículo no se lista en ningún sitio aunque su
página ya esté subida. Si la fecha está mal escrita, el artículo se publica
igualmente y avisa por consola: una errata que adelanta se ve, una que esconde
para siempre no la nota nadie.

## 6. Seguridad

Todo esto está puesto porque hizo falta. No lo deshagas sin entender por qué:

- `escapeHtml()` escapa **también las comillas**. Se usa dentro de atributos
  HTML; sin eso hay XSS almacenado.
- Toda URL que venga de la comunidad pasa por `enlaceSeguro()`, que exige
  http/https, dominio con punto y con letras en el TLD.
- Las preferencias de avisos se guardan **solo** por la función
  `guardar_preferencias_aviso` (SECURITY DEFINER). `anon` no tiene UPDATE sobre
  `push_suscripciones`: PostgREST acepta un PATCH sin filtro y cualquiera podría
  modificar todas las filas.
- Cualquier página que use Supabase necesita el respaldo `dbDeReserva()`: si el
  CDN no responde, `supabase` no existe y revienta el bloque entero. El público
  está en buena parte dentro de Cuba, donde los CDN fallan a menudo.

## 7. Cómo se prueba

Con Playwright, antes de cada commit:

- **Dos anchos**: 390×840 (móvil) y 1280×900 (escritorio).
- **Sin desborde horizontal.** Las tablas anchas van dentro de `.tabla-scroll`.
- **Service worker desactivado** (`serviceWorkers: 'block'`), o sirve copias
  guardadas y la prueba miente. Esto ya me engañó una vez.
- **El CDN de Supabase caído y funcionando**, interceptando la petición.
- **Cero errores de JavaScript.**

## 8. Límites de este entorno

El proxy de red bloquea casi todo lo externo: Facebook, Instagram, webs de
empresas, `supabase.co` por HTTP directo, y muchos sitios oficiales. Cuando no
puedas comprobar algo, **dilo en la respuesta y en el commit** en vez de dar por
bueno lo que no viste. Para Supabase, usa el conector MCP, que sí funciona.

## 9. Preferencias del dueño

- Respuestas **claras y al grano**, sin relleno ni jerga, y sin salirse de lo que
  se preguntó.
- Cuando propongas un negocio para el directorio, **dale siempre el enlace
  directo para escribirle** (Facebook, Instagram o web). Si no encuentras
  ninguno, dilo en esa misma línea: un negocio sin forma de contactarlo no le
  sirve de nada.
