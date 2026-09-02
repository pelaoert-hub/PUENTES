# Puentes — App

Versión instalable (PWA) de [puentescuba.com](https://www.puentescuba.com), la
guía y comunidad para cubanos dentro y fuera de la isla.

## Estado

**Fase 1 (PWA) — EN PRODUCCIÓN desde el 2026-08-25.** Publicada en
www.puentescuba.com. Se instala como app en Android, iPhone y escritorio,
funciona sin conexión y avisa cuando hay una versión nueva.

Verificado sobre el dominio real después de publicar: `index.html` idéntico byte
a byte al local, service worker activo con los 9 recursos del shell
precacheados, las 5 cabeceras de `vercel.json` aplicándose, los 6 iconos con el
MIME correcto y byte a byte iguales a los locales, las 5 lecturas de Supabase en
200, botón "↓ Instalar app" visible, y los 4 estados del aviso de conexión. Cero
recursos fallidos, sin scroll horizontal.

Reversible en un clic: vercel.com/eliecer/puente → Deployments → *Instant
Rollback*.

**Fase 2 (Capacitor) — APK compilado.** `android/` e `ios/` generados con los
iconos de marca. El APK de prueba ya se compila y está firmado; falta la clave
de publicación para Play Store, y una Mac para iOS.

## Estructura

```
APP PUENTES/
├── web/                        ← lo que se despliega
│   ├── index.html              ← el sitio + la capa PWA
│   ├── 1940-constitucion-trabajo.html
│   ├── offline.html            ← pantalla cuando no hay conexión
│   ├── manifest.webmanifest    ← nombre, iconos, accesos directos
│   ├── sw.js                   ← service worker (caché y offline)
│   ├── vercel.json             ← cabeceras de despliegue
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── guias/                  ← una pagina por pregunta real (SEO)
│   │   ├── index.html          ← el indice de respuestas rapidas
│   │   └── <pregunta>/index.html
│   └── icons/
│       ├── icon-192.png        ← requisito de instalación en Chrome
│       ├── icon-512.png        ← alta densidad y pantalla de arranque
│       ├── icon-maskable-192.png ← Android adaptativo (zona segura)
│       ├── icon-maskable-512.png ← ídem, alta densidad
│       ├── apple-touch-icon.png← iOS (180×180)
│       ├── icon.svg            ← escalable, para la pestaña del navegador
│       └── icon-maskable.svg   ← versión SVG, ya no la usa el manifest
│
├── android/                    ← proyecto nativo Android (Capacitor)
├── ios/                        ← proyecto nativo iOS (necesita una Mac)
├── capacitor.config.json
├── package.json
│
├── supabase/
│   ├── functions/              ← funciones desplegadas (avisos push)
│   └── migraciones/            ← SQL para aplicar a mano en el editor
│
├── original/                   ← copia intacta del sitio publicado (referencia)
├── tools/
│   ├── serve.ps1               ← servidor local para probar
│   └── icon-gen.html           ← genera los PNG de los iconos
└── README.md
```

`original/` es una copia sin tocar de lo que hay hoy en producción. Sirve para
comparar y para volver atrás si algo sale mal. No se despliega.

## Probar en local

Los service workers **solo funcionan sobre HTTPS o localhost**. Abrir el
`index.html` con doble clic no alcanza: hay que levantar un servidor.

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Después abrí http://localhost:8080

## Coordenadas del proyecto

Anotadas acá para no volver a perderlas. Ojo: en ambos servicios el proyecto se
llama **`puente`**, en singular — no "puentes".

| | |
|---|---|
| **Sitio** | https://www.puentescuba.com |
| **Vercel** | https://vercel.com/eliecer/puente (equipo `Eliecer`, plan Hobby) |
| **Supabase** | Proyecto `puente` — `ggehkwinqlhsdbimovzx`, región us-east-1 |
| **Políticas RLS** | https://supabase.com/dashboard/project/ggehkwinqlhsdbimovzx/auth/policies |
| **Editor SQL** | https://supabase.com/dashboard/project/ggehkwinqlhsdbimovzx/sql/new |
| **Tablas** | https://supabase.com/dashboard/project/ggehkwinqlhsdbimovzx/editor |
| **Diagnóstico** | https://supabase.com/dashboard/project/ggehkwinqlhsdbimovzx/advisors/security |

El proyecto de Vercel **no tiene repositorio Git conectado**: se desplegó a mano.

## Desplegar

El contenido de `web/` va a la raíz del sitio. Está todo lo que hoy sirve
producción, incluido el `og-image.png`.

El CLI de Vercel ya está instalado. Abrí una terminal **en esta carpeta** y:

**Paso 1 — autenticarte** (una sola vez; se abre el navegador):

```bash
npx vercel login
```

**Paso 2 — desplegar a una URL de prueba:**

```bash
npx vercel deploy web
```

La primera vez pregunta a qué proyecto vincularlo. Elegí **`puente`**, el que ya
existe. Al terminar imprime una URL tipo `puente-xxxx.vercel.app`: abrila en el
teléfono y probá instalar la app.

**Paso 3 — cuando estés conforme, a producción:**

```bash
npx vercel deploy web --prod
```

Eso publica en www.puentescuba.com. Es reversible: en el panel de Vercel podés
volver a cualquier despliegue anterior con *Instant Rollback*.

También podés usar `npm run deploy:preview` y `npm run deploy:prod`, que hacen
lo mismo.

## Qué agrega la capa PWA

| | |
|---|---|
| **Instalable** | Botón "Instalar app" siempre visible, con instrucciones según el dispositivo |
| **Funciona sin conexión** | Lo ya visitado queda guardado y se puede consultar sin datos |
| **Accesos directos** | Mantener pulsado el icono abre Trámites, Remesas, Comunidad o Antes de salir |
| **Avisa de actualizaciones** | Cuando publicás una versión nueva, ofrece recargar |
| **Enlaces compartibles** | `/#remesas`, `/#comunidad`, etc. Antes no existían |
| **Botón atrás** | Ahora funciona entre secciones |

### El botón "Instalar app" parpadeaba al abrir la app instalada ✅ (2026-08-25)

Abriendo Puentes desde el icono de la pantalla de inicio, el botón aparecía un
instante arriba y desaparecía solo.

No era un error: **dentro de la app ya instalada el botón sobra**, y el código lo
esconde a propósito (`yaInstalada()` mira `display-mode: standalone`). El defecto
era *cuándo* lo hacía: el JavaScript corre al final del documento, así que el
navegador alcanzaba a pintar el botón antes de esconderlo.

Se agregó una regla CSS que lo descarta **antes del primer pintado**:

```css
@media all and (display-mode: standalone), all and (display-mode: fullscreen),
       all and (display-mode: minimal-ui), all and (display-mode: window-controls-overlay){
  #btn-instalar{ display:none; }
}
```

El JavaScript se dejó igual, como respaldo para navegadores viejos. En un
navegador normal el botón sigue visible: comprobado a los 2,5 s de cargar.

### El icono de la app salía como una "P" — arreglado ✅ (2026-08-25)

Al instalarla, en vez del logo aparecía una **"P"** sobre un fondo de color. Eso
no lo servía el sitio: lo **inventa el navegador** cuando no encuentra un icono
que le sirva para el lanzador, usando la primera letra de `short_name`.

La causa: el único icono marcado como `maskable` — el que Android usa para la
pantalla de inicio — era un **SVG**, y el soporte de SVG para iconos de app es
irregular. Tampoco había un PNG de 512×512, que es lo que piden los teléfonos de
alta densidad.

Se generaron los PNG que faltaban con `tools/icon-gen.html` (el mismo dibujo del
logo del sitio, así que el icono es idéntico) y el manifest ahora lista **PNG
primero**, con el SVG al final como extra:

| Icono | Tamaño | Propósito |
|---|---|---|
| `icon-192.png` | 192×192 | `any` |
| `icon-512.png` | 512×512 | `any` |
| `icon-maskable-192.png` | 192×192 | `maskable` |
| `icon-maskable-512.png` | 512×512 | `maskable` |
| `icon.svg` | escalable | `any` |

Los cuatro PNG se verificaron **byte a byte** contra lo que produce el generador.

> **Los iconos ya instalados no se actualizan solos.** El sistema operativo los
> guarda al instalar. Para ver el nuevo hay que **desinstalar la app y volver a
> instalarla**.

### El botón "Instalar app"

El evento del navegador que ofrece instalar (`beforeinstallprompt`) **solo
existe en Chrome, Edge y derivados**. No aparece en:

- Safari de iPhone y iPad
- Los navegadores internos de Facebook, Instagram, WhatsApp, TikTok…
- Firefox

Como mucha gente llega por enlaces compartidos en redes, esconder el botón
cuando el navegador no colabora dejaba a la mayoría sin forma de instalar.
Por eso el botón está **siempre visible** y abre una ventana con los pasos
exactos para el dispositivo que detecta:

| Situación | Qué muestra |
|---|---|
| Ya instalada | Avisa que no hace falta hacer nada |
| Dentro de Facebook / Instagram / WhatsApp | Explica que hay que abrirlo en Chrome o Safari, con botón para copiar el enlace |
| Chrome / Edge con instalación disponible | Lanza el diálogo nativo del navegador |
| iPhone o iPad | Compartir → Agregar a inicio |
| Firefox | Cómo hacerlo, o sugerencia de usar Chrome |
| Safari de Mac | Archivo → Agregar al Dock |
| Chrome que aún no ofreció | Dónde encontrarlo en el menú |

La detección se verificó contra 12 user-agents reales (Facebook Android e
iPhone, Instagram, WhatsApp, WebView, Safari iOS, Chrome iOS, Chrome Android,
Firefox, Safari Mac, Chrome y Edge de escritorio): 12 de 12 correctos.

### Estrategias de caché

Pensadas para conexiones caras, lentas e intermitentes, sobre todo dentro de Cuba:

- **El HTML** → red primero, con límite de 4,5 s; si tarda o no hay, abre desde caché.
- **Datos de Supabase** (`/rest/v1/`) → igual: red primero, y si falla muestra lo
  último guardado. Solo se guardan lecturas `GET` correctas, con un techo de 120
  entradas para no llenar el teléfono.
- **Iconos y librerías** → caché primero, revalidando en segundo plano. No gasta
  datos en cada visita.

Los formularios (`POST`) **nunca** pasan por el caché: siempre van a la red.

### El aviso de "sin conexión" — ahora dice la verdad

`navigator.onLine` solo informa si hay *alguna* interfaz de red levantada, no si
se llega a internet. En el caso que más importa acá — wifi de ETECSA que no
sale, o Supabase caído — vale `true`, así que el aviso viejo **nunca aparecía**
y la gente leía datos guardados creyéndolos al día.

El service worker ya distinguía ese caso y marcaba la respuesta con la cabecera
`X-Puentes-Cache` (`offline` = sirvió la copia, `vacio` = no había copia), pero
la página nunca la leía. Ahora `index.html` envuelve `fetch`, lee esa marca y
muestra tres avisos distintos:

| Situación | Aviso |
|---|---|
| El dispositivo no tiene red | *Sin conexión — estás viendo información guardada* |
| Hay red, el servidor no responde, hay copia | *No hay conexión con el servidor — estás viendo información guardada* |
| Hay red, el servidor no responde, sin copia | *No hay conexión con el servidor y no hay información guardada de esta sección* (en rojo oscuro) |

Cuando el servidor vuelve a responder, el aviso se va solo.

### "Descargar la app" no aplica a una PWA

Una PWA no es un archivo que se descarga: es la propia web que el navegador
guarda como app. Por eso el botón dice **Instalar**, no *Descargar*.

Cuando exista el APK (Fase 2), ahí sí tendrá sentido un botón de descarga
directa, o el enlace a Play Store.

### Publicar una versión nueva

Subí los cambios a Vercel. Los usuarios verán el aviso "Hay una versión nueva"
la próxima vez que abran la app.

Si cambiás `sw.js`, subí la constante `VERSION` (`'v1'` → `'v2'`). Eso descarta
todos los cachés viejos.

## Cinco mejoras de producto (2026-09-01)

Cinco cambios que van juntos: la app deja de ser la misma para todo el mundo, y
deja de esperar a que alguien vuelva por su cuenta.

### 1. La portada pregunta, no enumera

**Antes:** la portada era "aquí están todas nuestras secciones" — el menú
arriba, y debajo la lista de artículos. Quien entraba con un problema concreto
("necesito enviar dinero", "me caduca el pasaporte") tenía que traducir su
problema al nombre de una sección.

**Ahora:** la portada pregunta **¿Qué necesitas?** y muestra siete tarjetas
escritas como lo diría la persona, no como lo llamamos nosotros:

| La tarjeta dice | Lleva a |
|---|---|
| Arreglar mis papeles | Trámites, ya abierto en su país |
| Buscar trabajo | Empleos, filtrado si sigue en Cuba |
| Enviar dinero o recargar | Remesas |
| Conocer cubanos cerca | Comunidad → Encuentros, filtrado por su ciudad |
| Comprar a un cubano | Negocios |
| Saber qué cambió en Cuba | Cambios en Cuba |
| Prepararme para salir de Cuba | Antes de salir |

El menú de arriba sigue igual: quien prefiera navegar a mano, puede.

La cabecera se apretó para que la primera tarjeta se vea sin bajar: el `hero`
pasó de 64px de margen superior a 34 (16 en móvil) y el puente tiene ahora techo
de altura (190px, 104 en móvil). El cartel sigue ahí, ocupando lo justo.

Los artículos y la encuesta no desaparecen: bajan. Siguen en la portada, debajo
de lo que alguien necesita resolver primero.

### 2. Perfil sin cuenta — "cubano en Madrid"

Nadie tiene que registrarse. La portada pregunta **dónde estás** (país y, si
quiere, ciudad) y guarda esas dos cosas en `localStorage`, bajo
`puentes_perfil`. **No viaja a ningún servidor.**

Con eso:

- La cabecera saluda: *"Puentes desde Madrid, España"*.
- Las siete tarjetas se **reordenan**. Quien está en Cuba ve primero "Prepararme
  para salir"; quien está fuera, "Arreglar mis papeles". La primera lleva el
  sello **para ti**.
- Los textos hablan de su sitio: *"Ofertas en Madrid y en el resto"*.
- **Trámites abre directamente en su país** — antes siempre abría en España.
- Encuentros se filtra por su ciudad al entrar desde la portada.
- Las respuestas rápidas se ordenan poniendo delante las de su país, y entre
  esas, las más concretas.

Se puede cambiar en cualquier momento ("Cambiar") y borrar del todo ("Olvidar
mis datos"). Si no lo rellena, todo funciona exactamente como antes.

### 3. Respuestas rápidas — una página por pregunta real

Google no busca "Puentes": busca *"cómo enviar dinero a Cuba"*. Una app de una
sola página no puede posicionar para eso, porque para un buscador es una única
dirección.

Se crearon páginas propias en `web/guias/`, una por pregunta, con las cuatro
formas en que la gente escribe:

| Página | Pregunta |
|---|---|
| `guias/como-enviar-dinero-a-cuba/` | **Cómo** envío dinero a Cuba |
| `guias/donde-renovar-pasaporte-cubano/` | **Dónde** renuevo el pasaporte cubano |
| `guias/que-necesito-arraigo-social-espana/` | **Qué necesito** para el arraigo social |
| `guias/como-pedir-residencia-eeuu-cubano/` | **Cómo** pido la residencia en EE.UU. |
| `guias/que-puedo-llevar-a-cuba/` | **Qué puedo** llevar sin pagar aduana |

Más `guias/index.html`, que las lista y es la puerta de entrada.

Cada página lleva `canonical`, Open Graph, Twitter Card y **datos estructurados
`FAQPage` + `BreadcrumbList`** — que es lo que hace que Google pueda mostrarlas
como respuesta directa. El índice lleva `ItemList`. Todas están en el
`sitemap.xml`.

**Regla que se respetó:** ninguna guía afirma nada que no estuviera ya
verificado dentro de la app. Salen de `tramitesData`, `tramitesEnlaces`,
`cubaFeed` y la tabla de remesas, con el mismo enlace oficial. No se inventó
ningún dato ni ningún enlace.

Son HTML plano, sin fuentes externas ni JavaScript: cargan con una conexión
mala. Usan la paleta caribeña de la app para que se note que son de Puentes.

**Para agregar una guía:** crear `web/guias/<pregunta>/index.html`, sumarla al
array `guias` de `index.html` (para que salga en la portada), a
`web/guias/index.html` y al `sitemap.xml`.

### 4. Los tres sellos de Puentes

Antes había dos estados: verificado o no. Eso metía en el mismo saco un enlace
del BOE y un anuncio que escribió alguien anoche. Ahora hay tres, con el mismo
significado en toda la app:

| Sello | Qué significa |
|---|---|
| ✓ **Verificado oficialmente** | Lo dice la web del gobierno, ministerio o consulado, y ponemos el enlace directo |
| ◐ **Comprobado por Puentes** | Lo abrimos y lo probamos a mano. Funciona, pero no hay una fuente oficial que lo respalde entero |
| ? **Aporte de la comunidad** | Lo publicó alguien que usa la app. Nadie lo ha comprobado |

La leyenda que lo explica está arriba de Trámites, y los sellos aparecen en cada
tarjeta de trámites, remesas, empleos, negocios, anuncios y encuentros.

`ejemplo — sin confirmar` **no** es un cuarto nivel: es contenido de relleno
nuestro, todavía sin fuente. Se marca aparte a propósito, para no hacerlo pasar
por un aporte de la comunidad, que no lo es.

En código son dos funciones, en `index.html`:

```js
sello('oficial')      // devuelve el HTML de la píldora
nivelDe(item)         // 'nivel' si lo trae; si no, deduce de `verificado`
```

Las filas viejas que solo traen `verificado: true/false` siguen funcionando. Para
marcar algo como comprobado a mano, se le pone `nivel: 'puentes'`.

### 5. Un motivo para volver

**Desde tu última visita.** Al abrir la app se cuenta lo que se publicó desde la
última vez — y si hay ciudad en el perfil, **solo lo de esa ciudad**:

> **7** ofertas de empleo nuevas en Madrid
> **3** encuentros de cubanos nuevos en Madrid

Tocar una línea lleva directo a esa sección. La marca de tiempo vive en
`localStorage` (`puentes_ultima_visita`) y se actualiza al tocar o al decir "ya
lo he visto". En la primera visita no sale nada: no hay con qué comparar.

Se calcula con cuatro consultas `count` contra la base que ya usábamos — sin
tabla nueva y sin traerse las filas.

**Avisos que dicen algo.** El botón de avisos era "avisarme de nuevos
encuentros", y mandaba el mismo aviso a todo el mundo, viviera donde viviera.
Ahora se eligen los temas (encuentros, empleos, negocios, cambios de normativa) y
se guardan junto a la ciudad del perfil.

Para que los avisos salgan ya filtrados hay que agregar tres columnas:

```
supabase/migraciones/2026-09-01-avisos-personalizados.sql
```

Se pega en el [editor SQL](https://supabase.com/dashboard/project/ggehkwinqlhsdbimovzx/sql/new)
y se ejecuta. **Es opcional y no rompe nada si no se hace:** la app guarda las
preferencias en silencio y la suscripción se crea igual, y la función
`enviar-aviso-encuentro` vuelve a leer sin esas columnas si no existen — los
avisos siguen saliendo, solo que sin personalizar (lo dice en su respuesta, en
el campo `personalizado`).

#### El tema excluye; la ciudad, todavía no

Los dos filtros no se tratan igual, y es a propósito.

**El tema sí excluye.** Si alguien desmarcó "encuentros", no le llega. Mandarlo
igual es la vía más rápida a que bloquee los avisos del sitio — y eso no tiene
vuelta atrás: el navegador se acuerda y no se puede volver a pedir permiso.

**La ciudad no excluye.** Con pocos encuentros al mes, filtrar por ciudad
significa que casi nadie recibe casi nunca, y entonces el aviso deja de dar un
motivo para volver, que es justo para lo que existe. Comparado sobre seis
suscripciones de prueba: un encuentro en Barcelona llegaba a 2 filtrando por
ciudad, y llega a 5 sin filtrar (el sexto se queda fuera porque desmarcó el
tema, que es lo correcto).

Así que la ciudad se usa para **redactar**, no para descartar: el aviso siempre
dice dónde es el encuentro, y a quien lo tiene en su ciudad se lo dice con otras
palabras ("Es en tu ciudad"). Que decida la persona.

**Cuándo cambiarlo:** cuando haya varios encuentros por semana. Ahí el problema
pasa a ser el ruido y no el silencio. Ese día es una línea:
`const CIUDAD_EXCLUYE = true` en `enviar-aviso-encuentro/index.ts`. La respuesta
de la función ya devuelve `enSuCiudad` y `ciudadExcluye` para poder ver, antes
de tocar nada, a cuánta gente le está llegando de verdad y a cuánta le queda
cerca.

Después de aplicar el SQL hay que volver a desplegar la función (ver "Desplegar
la función tras cambiarla").

### Y de paso: la app ya no se queda en blanco si falla el CDN

Encontrado mientras se probaba esto. La librería de Supabase viene de
`cdn.jsdelivr.net`. Si ese CDN no cargaba — red mala, ETECSA cortando, el CDN
bloqueado — `supabase` no existía, `supabase.createClient()` lanzaba y **el
script entero moría**: la app se quedaba en blanco. Sin trámites, sin remesas,
sin portada. Y todo eso es contenido fijo que no necesita base de datos.

Ahora, si la librería falta, se usa un sustituto: las lecturas devuelven listas
vacías y las escrituras un error controlado. Se pierde lo que viene de la base
(anuncios, empleos, encuentros) y queda un aviso en la consola, pero **la app
abre y sirve**.

### Probado

Con Chromium, a 390×844 (móvil) y 1280×900 (escritorio), sirviendo `web/` en
local:

- Portada sin perfil: sale la pregunta "¿Dónde estás?", 7 tarjetas, 5 guías, y
  **ninguna** caja de novedades (primera visita).
- Perfil España/Madrid: cabecera "Puentes desde Madrid, España", primera tarjeta
  "Arreglar mis papeles · para ti", primera guía la del arraigo en España,
  Trámites abre con el chip de España marcado.
- Perfil Cuba: la primera tarjeta pasa a ser "Prepararme para salir de Cuba".
- Segunda visita con datos de prueba: la caja cuenta lo nuevo **de Madrid**, en
  singular o plural según toque, y tocar una línea navega a su sección. Con el
  perfil en Bilbao, no cuenta nada de Madrid — correcto.
- Avisos: los cuatro temas se marcan y desmarcan, siempre queda al menos uno, y
  se guardan en `localStorage`.
- Sellos: los tres en la leyenda, en las tarjetas de trámites, en las ofertas de
  empleo y en las 7 filas de remesas.
- Guías: los cinco `FAQPage` y `BreadcrumbList` son JSON válido; el `sitemap.xml`
  es XML válido.
- **Cero errores de JavaScript**, y sin scroll horizontal en móvil ni en las
  guías.


## Lo que encontró la revisión de código (2026-09-02)

Se pasó una revisión sobre el PR y salieron once cosas. Cuatro eran serias y
están arregladas; el resto queda anotado abajo con su razón.

### 🔴 Un agujero de seguridad, abierto por nosotros el día antes

La migración del 01-09 dejaba una política de UPDATE con `using (true)`,
apoyada en este razonamiento: *"la tabla no tiene política SELECT pública, así
que nadie puede enumerar los endpoints"*.

**El razonamiento era falso.** No hace falta enumerar nada: PostgREST acepta un
PATCH **sin filtro**. Cualquiera con la clave anónima —que va en el HTML, a la
vista de todos— podía reescribir `temas` en **todas** las filas de golpe y
dejar a la comunidad entera sin avisos.

Reproducido contra la base real antes de tocarlo: el rol anónimo actualizó
todas las filas sin poner un solo filtro.

**Arreglado** (`2026-09-02-avisos-preferencias-solo-via-funcion.sql`, ya
aplicado): el rol anónimo pierde el UPDATE directo. Guardar preferencias pasa
ahora por `guardar_preferencias_aviso`, que exige el endpoint y toca como mucho
esa fila. Comprobado después: el ataque devuelve *permission denied*, la
función guarda bien con el endpoint correcto, descarta temas inventados, y con
un endpoint que no existe no toca nada.

### 🔴 La app prometía algo que dejó de ser verdad

El formulario del perfil decía *"se guarda solo en este teléfono — no lo
enviamos a ningún sitio"*. Pero al activar los avisos, la ciudad y el país **sí**
se enviaban junto a la suscripción. Y "Olvidar mis datos" solo limpiaba el
teléfono.

Es lo más grave después del agujero: una promesa incumplida sobre los datos de
la gente. Ahora el texto dice la verdad —*"solo sale de aquí si activas los
avisos"*— y borrar el perfil sincroniza, dejando ciudad y país en blanco en el
servidor.

### 🔴 Dos formas de perder novedades que nadie llegó a ver

**Un fallo de red parecía "no hay nada nuevo".** `contarNuevos` devolvía 0 tanto
si no había nada como si la consulta reventaba. Con 0 en las cuatro, se
adelantaba la marca de tiempo y esa ventana se perdía para siempre. Ahora
devuelve `null` al fallar, y si fallan todas no se toca nada.

**Tocar una línea borraba las otras tres.** Abrir "7 ofertas" daba por vistos
los "3 encuentros" que nunca miraste. Ahora hay una marca por categoría
(`puentes_visto`).

Probado con la red simulada caída y luego restablecida: la ventana sobrevive al
fallo, tocar una línea marca solo esa, y al volver las otras tres siguen ahí.

### 🔴 Abrir una guía borraba la app de la caché

`sw.js` guardaba **toda** navegación bajo la clave `/index.html`. Visitar una
guía reemplazaba la app entera: al abrir Puentes sin conexión salía la guía en
lugar de la app.

El fallo ya estaba en el código original, pero con una sola página suelta casi
no se notaba; con siete guías a las que se llega desde Google, era cuestión de
tiempo. Ahora cada página se guarda bajo su propia dirección, y `VERSION` sube a
`v5` para limpiar las cachés con el dato malo.

### Lo que se dejó a propósito

- **`paisParaTramites()` manda "Cuba" a "Otro".** Para quien sigue en la isla,
  "Otro" muestra los trámites cubanos, que son los que le sirven. Es mejor que
  el España por defecto de antes.
- **La ciudad se compara con `includes()` en los dos sentidos**, así que un
  perfil en "Santiago" casa con un encuentro en "Santiago de Cuba". Hoy solo
  afecta a cómo se redacta el aviso. **El día que se ponga `CIUDAD_EXCLUYE` en
  `true`, esto hay que mirarlo**: ahí pasaría a decidir quién recibe y quién no.
- **Con el CDN caído no salta el aviso de "sin conexión"**, porque no llega
  ninguna petición al servidor y cada sección enseña su "todavía no hay nada".
  Es peor de lo ideal, pero muy por encima de la pantalla en blanco de antes.

## Enlaces a trámites oficiales (2026-08-28)

Botones de acceso directo por país, en la sección Trámites. Cada enlace se
comprobó uno por uno; los que no se pudieron confirmar **no se pusieron**.

| País | Enlaces |
|---|---|
| España | Cita de Extranjería · DNI/pasaporte · Antecedentes penales · Homologar título · BOE |
| EEUU | Cita USCIS · Residencia para cubanos (Ley de Ajuste) · Pasaporte · Federal Register |
| México | Trámites INM · Cita pasaporte (SRE) · Buscador de trámites · DOF |
| Rusia | Portal Oficial de Información Jurídica |

Y en **todos** los países aparece *Antecedentes penales cubanos (MINJUS)*, que
vale desde cualquier sitio.

### Pasaportes en las dos direcciones

Un cubano en el exterior necesita **dos** pasaportes al día, y la app cubre los
dos caminos:

- **El del país donde vive** (para viajar y vivir allí): España `citapreviadnie.es`,
  EEUU `usa.gov/passport`, México `citas.sre.gob.mx`. Rusia sigue sin enlace.
- **El cubano** (sin él **no se puede entrar a Cuba**, se tenga la nacionalidad
  que se tenga): enlace directo al consulado de Cuba en cada país, vía
  `misiones.cubaminrex.cu/es/<pais>`, verificado para España, EE.UU., México y
  Rusia.

Además, en **todos** los países aparece *Buscar tu consulado cubano (127 países)*
→ `misiones.cubaminrex.cu`, el directorio Cubadiplomática. Es lo único útil para
quien elige "Otro país", que antes se quedaba casi sin nada.

> `misiones.cubaminrex.cu/es/pasaporte` **no** sirve: es una etiqueta con una
> nota de 2020 sobre la COVID. Y `/es/<pais>/servicios-consulares` devuelve
> "Acceso denegado". El que funciona es `/es/<pais>` a secas.

### Lo que no se pudo verificar, y por eso no está

- **travel.state.gov (pasaporte)**: devuelve 403 a cualquier comprobación
  automática *y también a un navegador real desde este entorno* (antibots de
  Cloudflare). Se usó `usa.gov/passport` en su lugar, igual de oficial y sí carga.
- **FBI (antecedentes penales de EEUU)**: mismo bloqueo desde aquí, así que se
  dejó fuera hasta que el dueño del proyecto lo abrió en su navegador y confirmó
  que funciona. **Ya está incluido.** Cuando una fuente no se puede verificar
  desde aquí, la comprobación de una persona con un navegador normal es válida y
  preferible a dejar el hueco.
- **Fichas de gob.mx** (`/tramites/ficha/...`): devuelven 200 pero **redirigen al
  buscador genérico** — el portal se reorganizó. Un 200 no basta: hay que mirar
  dónde aterriza. Se usó el buscador oficial en su lugar.
- **Homologación de títulos en EEUU**: no existe un organismo público que la
  haga; son agencias privadas. No se enlaza ninguna.
- **Rusia**: sin enlaces de trámites todavía.

> Regla que salió de aquí: **un código 200 no significa que el enlace sirva.**
> Hay que comprobar dónde aterriza, y varios sitios oficiales solo se pueden
> comprobar abriéndolos en un navegador de verdad.

## La encuesta también dentro del artículo (2026-08-30)

**El problema:** el enlace que se comparte por WhatsApp lleva a la página del
artículo, que es independiente de la web. Quien llegaba desde fuera leía y se
iba, sin enterarse de que existía Puentes ni de que había una encuesta.

**La solución no fue cambiar el enlace** — el artículo es el gancho, y llevar a
la portada haría perder el motivo por el que la gente entra. Se llevó lo que
importa al artículo:

- **La encuesta, al final del texto**, con los estilos del artículo (papel y
  tinta), no los de la web. Se vota sin salir de la página.
- **Un bloque de llamada a la web** con cuatro puertas: Entrar a Puentes,
  Trámites, Negocios y Empleos.

Comparte el mismo `puente_device_id` en `localStorage`, así que **quien ya votó
en la web no vuelve a votar en el artículo**, y al revés. Los porcentajes son los
mismos en los dos sitios.

Si Supabase falla o no responde, la encuesta simplemente no aparece y el artículo
se lee igual: nunca bloquea la lectura.

> **Al replicar esto en artículos futuros**, copiar el bloque `#encuesta-caja`,
> la sección `.cta` y el `<script>` del final. Es autónomo: no depende de nada
> de `index.html`.

## Detalles de acabado (2026-08-30)

Salieron de mirar una captura de la app funcionando en un móvil real:

- **El pie decía "prototipo funcional. Contenido de ejemplo pendiente de
  verificación".** Ya no era cierto —los trámites enlazan a fuentes oficiales
  verificadas— y le restaba credibilidad a quien llegaba por primera vez. Ahora
  describe lo que es y separa con claridad lo verificado (trámites) de lo que
  publica la comunidad (negocios, empleos, anuncios), que no lo está.
- **La hora de los encuentros salía como `14:00:00`.** Sobraban los segundos.

## Ofertas de trabajo (2026-08-28)

Sección propia **Empleos**, con enlace directo al empleador para postular sin
intermediarios. Tabla `empleos` con el mismo patrón que `negocios`: RLS, lectura
e inserción públicas, `trg_moderar` y restricciones en la base (`donde`,
`modalidad` y topes de longitud).

Campos: puesto, empresa, categoría (12), descripción, ubicación, dentro/fuera de
Cuba, modalidad (presencial/remoto/híbrido), salario, enlace y contacto. Filtros
por ubicación y categoría.

**Aviso destacado contra la estafa más común:** *"Nunca pagues por un trabajo.
Ningún empleador legítimo cobra por darte empleo."* Es la estafa que más golpea a
quien busca trabajo desde fuera.

Probado: alta dentro y fuera de Cuba, filtros (2 → 1 Cuba, 1 exterior), la
moderación rechaza una oferta con amenazas, y el saneador de enlaces vale igual
que en Negocios. Datos de prueba borrados.

## Ajustes de móvil (2026-08-28)

Al añadir Empleos el menú llegó a 8 entradas y en móvil se apilaba en 4 filas:
**156 px de menú antes del contenido.** Ya existía una regla `overflow-x:auto`
pero el `flex-wrap:wrap` de la regla general la anulaba.

| | Antes | Ahora |
|---|---|---|
| Menú en móvil | 156 px (4 filas) | **36 px** (una fila deslizable) |
| Banner de portada | 437 px | **320 px** |
| Primer artículo visible | a 887 px (fuera de pantalla) | a 752 px (asoma en pantalla) |

> El banner no es una imagen: es texto (título + párrafo de presentación). Se
> ajustó el **tamaño de letra** en móvil, sin recortar el mensaje — el contenido
> es del dueño del proyecto, no algo que deba truncarse por cuenta propia. Si
> hiciera falta ganar más espacio, hay que acortar el párrafo, y esa es su
> decisión.

## Enlaces a trámites oficiales (2026-08-28)

La sección Trámites ya no tiene dos botones fijos ("cita previa" y "gaceta"):
ahora pinta una fila de accesos directos según el país elegido, desde el array
`tramitesEnlaces`. Se añaden en un solo sitio.

| País | Enlaces |
|---|---|
| España | Extranjería · DNI/pasaporte · Antecedentes penales · Homologación de títulos · BOE |
| EEUU | USCIS · Federal Register |
| México | INM · DOF |
| Rusia | Portal jurídico |

Además, **`tramitesCuba` sale en todos los países**: el trámite de antecedentes
penales cubanos ([MINJUS](https://www.minjus.gob.cu/es/solicitud/antecedentes-penales))
sirve se viva donde se viva.

### Todos verificados a mano

Cada URL se abrió y se comprobó que lleva al trámite. Tres candidatas se
descartaron por dar **404** (las páginas se habían movido): la de homologación
de `educacionfpydeportes`, la de DNI de `policia.es` y `citapreviadnie.es/citaPreviaDniExp/`.
Una cuarta, `universidades.gob.es/homologacion...`, devolvía 200 **pero redirigía
a la portada del ministerio**, no al trámite — también descartada. La buena es el
portal Valida-TE.

> Un 200 no basta: hay que mirar dónde aterriza. Un enlace equivocado a
> inmigración puede costarle un trámite a alguien.

**Falta:** completar EEUU, México y Rusia (pasaportes, antecedentes locales,
homologaciones). Donde no hay fuente oficial confirmada no se inventa nada: la
app muestra el aviso de que solo hay trámites cubanos para ese país.

## La pregunta de Puentes — encuesta interactiva (2026-08-29)

En lo alto de la portada, antes de los artículos. Se vota con un toque y los
resultados aparecen al instante, con barras y porcentajes. Un voto por
dispositivo (`device_id` + `unique`), y el voto propio queda marcado con ✓.

**Por qué una encuesta y no comentarios:** participar cuesta un segundo, no hay
nada que moderar, y da un motivo para volver a mirar cómo va. Los comentarios
exigirían moderación humana constante.

### Cómo cambiar la pregunta

Las preguntas **no se pueden crear desde la web** — la tabla `encuestas` no
tiene política de inserción pública, para que nadie invente preguntas. Se crean
desde el editor SQL de Supabase:

```sql
-- Cerrar la anterior y abrir una nueva
update public.encuestas set activa = false where activa;
insert into public.encuestas (pregunta, opciones) values (
  '¿Tu pregunta aquí?',
  array['Opción 1','Opción 2','Opción 3']
);
```

Entre 2 y 6 opciones. Se muestra siempre la activa más reciente. Los votos de
las encuestas viejas se conservan.

**Vista `encuesta_resultados`:** devuelve el recuento ya agregado, con
`security_invoker = on`. Así el navegador no se descarga todos los votos uno por
uno — importa con conexiones caras.

Primera pregunta publicada: *"¿Qué es lo más difícil de estar lejos de Cuba?"*

### Preguntas de reserva ya cargadas

Hay **6 preguntas más guardadas como inactivas**. Para cambiar la de la portada
no hace falta escribir ninguna: se apaga la actual y se enciende otra.

```sql
-- Ver todas y su estado
select activa, pregunta from public.encuestas order by activa desc, created_at;

-- Cambiar: apaga la actual y enciende la que elijas (usa su texto exacto)
update public.encuestas set activa = false where activa;
update public.encuestas set activa = true
  where pregunta = '¿Cada cuánto logras visitar Cuba?';
```

Las de reserva son: trámite más difícil · cada cuánto visitas Cuba · cómo mandas
dinero · qué te haría falta que tuviera Puentes · qué te sorprendió al salir ·
qué edad tenías al salir.

> La cuarta (*"¿Qué te haría más falta que tuviera Puentes?"*) no es solo para
> generar tráfico: sus respuestas dicen qué construir después.

### Cambio automático todos los lunes

**Ya no hace falta acordarse.** Un `pg_cron` dentro de la propia base cambia la
pregunta **cada lunes a las 12:00 UTC** (mañana en América, tarde en Europa). No
depende de ningún ordenador encendido.

```sql
-- Ver la tarea programada
select jobname, schedule, active from cron.job;

-- Cambiar el día u hora (formato cron: minuto hora * * día-de-semana)
select cron.alter_job(
  (select jobid from cron.job where jobname = 'rotar-encuesta-semanal'),
  schedule => '0 12 * * 1'
);

-- Adelantar el cambio a mano, sin esperar al lunes
select public.rotar_encuesta();
```

**Cómo elige la siguiente:** primero las preguntas que nunca se han usado (de la
más antigua a la más nueva); cuando se agotan, vuelve a empezar por la que lleva
más tiempo sin salir. Con una sola pregunta cargada no hace nada, así que la
portada nunca se queda vacía.

Probado ejecutándolo 7 veces seguidas: recorrió las 7 preguntas en orden y volvió
a la primera. La columna `ultima_activacion` lleva la cuenta.

**Para que la rueda no se detenga**, hay que ir añadiendo preguntas nuevas:

```sql
insert into public.encuestas (pregunta, opciones, activa)
values ('¿Tu pregunta?', array['Opción 1','Opción 2'], false);
```

Los votos de las encuestas anteriores se conservan, así que se pueden consultar
los resultados de cualquier semana pasada.

## Ajustes de portada y menú (2026-08-29)

- **Artículos en columna:** la portada era una rejilla de cuadritos; ahora van
  uno debajo del otro, como un muro que se recorre con el dedo.
- **Menú desplegable:** medía **606 px** y en pantallas cortas se salía por
  abajo. Ahora se limita a la altura de la pantalla (`max-height` +
  `overflow-y:auto`) y se compactó el espaciado: **536 px** y con desplazamiento
  propio.
- **`tools/serve.ps1`** no sabía servir el `index.html` de una carpeta, así que
  `/articulos/<nombre>` daba 404 en local aunque funcionara en Vercel. Corregido:
  ahora el servidor de pruebas se comporta como producción.

## Portada de artículos y paleta caribeña (2026-08-28)

### La web abre en los artículos

Antes abría en Trámites. Ahora la primera pantalla es **Inicio**, con fichas
grandes de los artículos publicados; el resto de secciones sigue en el menú y en
"Explorar todo". Verificado: la sección por defecto es `portada`, las 7 entradas
del menú navegan bien, los enlaces directos (`/#negocios`) funcionan y el botón
atrás también.

#### Cómo publicar un artículo nuevo

1. Crear su página HTML dentro de `web/` (el de 1940 sirve de plantilla).
2. Añadir una entrada **arriba del todo** del array `articulos` en `index.html`
   — el primero de la lista es el primero en la portada. Campos: `etiqueta`
   (píldora dorada), `titulo`, `sub`, `resumen` (1-2 frases: es lo que decide si
   lo abren) y `href`.
3. Sumarlo a `web/sitemap.xml` para que Google lo encuentre.

La misma lista alimenta la portada y el panel "Explorar todo": se toca en un
solo sitio.

### Paleta caribeña

El fondo pasó de `#0E2A2E` (casi negro) a `#0D5257`, un turquesa más vivo, y los
acentos subieron de brillo (oro `#FFC24B`, coral `#FF6F52`, detalles `#A8DADC`).

**Dos problemas de contraste que el color más vivo destapó, ya corregidos:**

| Elemento | Antes | Ahora |
|---|---|---|
| Barra "sin conexión" (texto blanco sobre coral) | 2,75:1 ❌ | 4,90:1 ✅ (texto oscuro) |
| Enlaces "Ver fuente oficial" | 3,24:1 ❌ | 4,78:1 ✅ |

Para lo segundo se separó el coral en dos tonos: `--coral` para rellenos y
`--coral-txt` (aclarado) para texto. **Los 6 contrastes superan 4,5:1.** Importa:
mucha gente abre esto en un teléfono, en la calle y con sol.

> **Los iconos y el logo no se tocaron.** Costó dejarlos bien y regenerarlos
> arriesgaría lo que funciona; el verde profundo del icono combina igual con el
> fondo nuevo. `background_color` del manifest (la pantalla de arranque) se dejó
> en `#0E2A2E` para que siga haciendo juego con el icono.

## Remesas: proveedores reales (2026-08-28)

La tabla ya no tiene `Servicio A/B/C`. Ahora lista servicios reales, con enlaces
comprobados (los 5 responden 200) y **comisiones tomadas de la web de cada
proveedor**, no estimadas por nosotros. Donde el proveedor no publica la
comisión, dice *"Ver en el sitio"* en vez de un número inventado.

| Servicio | Tipo | Comisión (según el proveedor) |
|---|---|---|
| Safe Pay Today — Tarjeta MLC | MLC/tarjeta | 7% + 1 USD |
| Safe Pay Today — Tarjeta Clásica (CUP) | MLC/tarjeta | 18% + 1 USD |
| Safe Pay Today — USD en efectivo | Efectivo | 20% + reparto (solo La Habana) |
| sendvalu — entrega a domicilio | Efectivo | Ver en el sitio |
| Fonmoney | MLC/tarjeta | Ver en el sitio |
| Cuballama · Cubatel | Recarga móvil | Ver en el sitio |

**No se listó VaCuba:** al comprobar su web, no ofrece envío de dinero — solo
paquetes, viajes y recargas. Se descartó en vez de asumirlo.

### Cobrar en la misma moneda que se envía

**Por vía oficial no se puede.** Ningún banco ni casa de cambio del Estado
entrega moneda extranjera: pagan en CUP o en saldo MLC, y el CUP está muy
devaluado frente a la calle. Solo servicios privados entregan USD en mano.

> Hubo un anuncio de Fincimex (abril 2026) diciendo que las remesas podrían
> cobrarse en dólares en efectivo en CADECA, y llegó a citarse aquí. **Se quitó
> del sitio**: el dueño del proyecto, que conoce la práctica en Cuba, confirmó
> que ninguna oficina oficial paga en moneda extranjera. Un anuncio oficial no
> describe lo que pasa en la ventanilla, y dejarlo solo servía para que alguien
> hiciera el viaje al banco en balde.

## Avisos de nuevas convocatorias — FUNCIONANDO (2026-08-28)

El circuito está completo y probado de punta a punta: al insertar un encuentro,
el disparador llamó a la función y esta respondió **HTTP 200** con
`{"enviados":0,"fallidos":0,"nota":"Nadie suscrito"}` — correcto, porque todavía
nadie activó los avisos.

**Cadena completa:** botón en la app → suscripción guardada → alguien crea un
encuentro → `trg_avisar_encuentro` → `pg_net` → función `enviar-aviso-encuentro`
→ push firmado a cada suscriptor → el service worker muestra el aviso → al
tocarlo abre la app en Comunidad para apuntarse.

**Confirmado en un teléfono real (2026-08-30):** con los avisos activados en un
móvil y el encuentro creado desde otro dispositivo, **la notificación llegó**. El
circuito está probado de punta a punta, no solo en teoría.

### Desplegar la función tras cambiarla

```bash
npx.cmd supabase functions deploy enviar-aviso-encuentro --project-ref ggehkwinqlhsdbimovzx --no-verify-jwt
```

`--no-verify-jwt` es obligatorio: la función se protege con el token del Vault,
no con JWT. Si se despliega sin esa opción, la base recibe 401 y no sale ningún
aviso.

> El editor de funciones del panel web **no aceptaba pegar código** (se probó
> varias veces). El CLI lo lee del disco y evita el problema entero.

### El esquema `vault` no está expuesto en la API

`supabase-js` no puede leer `vault.decrypted_secrets` directamente — el primer
despliegue fallaba con *"Falta configurar push_token"*. Se resolvió con
`public.leer_secreto_push(text)`: `SECURITY DEFINER`, restringida a los tres
secretos de los avisos, y con `EXECUTE` revocado a `anon` y `authenticated`.
Solo `service_role` puede llamarla.

> El linter de seguridad avisó dos veces de funciones `SECURITY DEFINER`
> expuestas por la API (`avisar_nuevo_encuentro` y esta). Ambas quedaron con los
> permisos revocados. Diagnóstico final: **cero avisos**.

### Lo que NO se puede hacer

No se le puede avisar a "todo el que tenga la web". El navegador exige permiso
explícito de cada persona, y en iPhone solo llega si la app está **instalada en
la pantalla de inicio** (iOS 16.4+). En Safari normal no llega nunca. Lo honesto
es prometer "aviso a quien lo active".

### Claves VAPID

Generadas el 2026-08-28. La **pública** va en `index.html` (es normal, no es
secreta). La **privada** está en `vapid-claves.txt`, ya en `.gitignore`, y tiene
que acabar como secreto de la función del servidor — **nunca** en `web/`.

> Si se pierde la clave privada hay que generar el par de nuevo, y **todas las
> suscripciones existentes dejan de servir**: cada persona tendría que volver a
> activar los avisos.

### Tabla `push_suscripciones`

RLS activo con una diferencia importante frente a las demás: **no tiene política
de lectura**. Con la clave pública se puede crear y borrar la propia
suscripción, pero no listar quién está suscrito. Solo la función del servidor
(`service_role`) las lee.

### Incidente: index.html quedó en 0 bytes

Al añadir esta sección, un script abrió `index.html` para escribir (lo cual lo
vacía) y falló a mitad por un escape de emoji mal formado, dejando el archivo en
0 bytes. Se restauró descargando el último despliegue de preview y quitando el
script que Vercel inyecta.

**Para que no se repita:** escribir siempre a un archivo temporal y reemplazar el
original solo si la escritura terminó bien y el resultado no es más pequeño de lo
esperado.

## Enlaces y participación en encuentros (2026-08-25)

### Auditoría de enlaces

Se comprobaron los 19 enlaces externos del sitio, uno por uno.

- **1 roto de verdad:** `exteriores.gob.es/.../La-Ley-de-Memoria-Democratica.aspx`
  devolvía *Error 404 – Página no encontrada*. Reemplazado por la ley en el BOE
  (`BOE-A-2022-17099`, Ley 20/2022 de Memoria Democrática), que es fuente oficial
  y no caduca.
- **6 daban 403 al comprobarlos con `curl`** (Gaceta Oficial ×4, inclusion.gob.es,
  opapeleo.com) pero **abren perfectamente en un navegador**: es bloqueo
  antirrobots, no enlaces rotos. Verificado abriéndolos de verdad.
- **1 sin comprobar:** `dof.gob.mx` rechaza las conexiones desde aquí. Conviene
  abrirlo a mano.

> Al comprobar enlaces desde la terminal, ojo con dos trampas que costaron un
> rato: `curl` dentro de un bucle `while read` se come la lista por la entrada
> estándar (hay que pasarle `< /dev/null`), y un archivo escrito por Python en
> Windows lleva `
` al final de cada línea, que ensucia la URL.

### Remesas: el enlace que devolvía al inicio

Cada fila de la tabla tenía `href="#"`. Al pulsarlo, el `#` vacío dejaba al
enrutador sin sección y **caía a la primera, Trámites** — de ahí el "vuelve al
inicio". Ahora la fila lleva una url opcional: si está vacía se muestra *sin
enlace* en vez de un enlace muerto.

**Pendiente:** la tabla sigue con datos de relleno (`Servicio A`, `B`, `C`). El
aviso ahora dice claramente que son ejemplos de muestra y que no se envíe dinero
basándose en ella. Hay que sustituirlos por proveedores reales.

### Participación en encuentros

Cada encuentro muestra ahora cuánta gente se apuntó y un botón **✋ Voy a ir**,
que se puede cancelar. Tabla `evento_asistentes`, identificando por `device_id`
como el resto de la app, con `unique (evento_id, device_id)` para que nadie se
apunte dos veces.

**Limitación:** al no haber cuentas de usuario, la política de borrado es
pública. En teoría alguien podría quitar la asistencia de otro. Es el mismo
compromiso que el resto de la app; si crece, hace falta autenticación.

## Negocios cubanos (sección nueva, 2026-08-25 — EN PRODUCCIÓN)

Directorio gratuito para que cubanos dentro y fuera de la isla promocionen sus
emprendimientos. Sección propia en el menú, con enlace directo `/#negocios` y
acceso directo al mantener pulsado el icono de la app.

**Cómo funciona.** Cualquiera publica sin registrarse: nombre, categoría (11
opciones), descripción, si está dentro o fuera de Cuba, ciudad y país, y de
contacto WhatsApp/teléfono y un enlace a redes o web. Se filtra por ubicación y
por categoría. Los más nuevos aparecen primero.

**Tabla `negocios`** — mismo patrón que las demás: RLS activo, políticas de
lectura e inserción públicas, disparador `trg_moderar`, `device_id` y
`created_at`. Además lleva restricciones en la propia base (`donde` solo acepta
`cuba` o `exterior`, y hay topes de longitud en cada campo) para que no dependa
solo de lo que valide el navegador.

**Seguridad de los enlaces.** Un enlace lo escribe cualquiera, así que
`enlaceSeguro()` deja pasar únicamente `http:` y `https:`. Verificado que
rechaza `javascript:`, `data:` y texto que no sea una URL. Todos los enlaces
salen con `rel="noopener nofollow"`. El teléfono se convierte en botón de
WhatsApp (`wa.me`) y en botón de llamada.

**Lo que esta sección NO hace.** No verifica a nadie. La moderación automática
bloquea amenazas, acoso y contenido sexual explícito, pero **no detecta
estafas**. Por eso la sección lleva un aviso visible y el formulario recuerda que
el teléfono queda público. Si el directorio crece, va a hacer falta una forma de
denunciar publicaciones y de que el autor borre la suya — hoy no existe ninguna
de las dos (la tabla no tiene política de borrado).

### Probado

- Alta de negocios dentro y fuera de Cuba, y los filtros (2 totales → 1 en Cuba,
  1 en el exterior, 1 en Comida)
- La moderación rechaza una descripción con amenazas, con el mensaje correcto
- `enlaceSeguro()`: acepta https, rechaza `javascript:`, `data:` y basura
- Enlace directo `/#negocios`, botón en el menú, sin errores de consola, sin
  scroll horizontal
- Los datos de prueba se borraron: la tabla quedó vacía

## Seguridad: Row Level Security — verificado ✅

La `anon key` de Supabase está expuesta en el HTML. Eso es normal y correcto,
pero solo si cada tabla tiene Row Level Security (RLS) activado.

**Verificado el 2026-08-24: las 6 tablas tienen RLS habilitado.**

| Tabla | RLS |
|---|---|
| `anuncios` | ✅ |
| `eventos` | ✅ |
| `tramites_sugeridos` | ✅ |
| `remesas_sugeridos` | ✅ |
| `visado_sugeridos` | ✅ |
| `cuba_reportes` | ✅ |

El diagnóstico de seguridad de Supabase no reporta ningún error de RLS. La base
está protegida.

### Los dos avisos menores — arreglados ✅ (2026-08-25)

Las funciones `moderar_contenido` y `contiene_contenido_prohibido` tenían el
`search_path` mutable (nivel WARN). Aplicado con:

```sql
alter function public.moderar_contenido() set search_path = public, pg_temp;
alter function public.contiene_contenido_prohibido(txt text) set search_path = public, pg_temp;
```

> **Ojo con las firmas.** `contiene_contenido_prohibido` **recibe un argumento**
> (`txt text`). Una versión anterior de este README traía el `alter` con los
> paréntesis vacíos: así falla. Antes de tocar una función, mirá su firma real:
>
> ```sql
> select p.proname, pg_get_function_identity_arguments(p.oid), p.proconfig
> from pg_proc p join pg_namespace n on n.oid = p.pronamespace
> where n.nspname = 'public';
> ```

El cambio no altera el comportamiento: ambas funciones solo usan `pg_catalog`
(`to_jsonb`, `jsonb_each_text`, `~*`) y una llamada ya calificada a
`public.contiene_contenido_prohibido`. Verificado después de aplicarlo:

- El diagnóstico de seguridad de Supabase devuelve **cero avisos**
- La moderación sigue filtrando igual: texto normal → pasa, amenaza → bloquea,
  acoso → bloquea, `null` → pasa (4 de 4)

Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

## Fase 2 — Capacitor (proyectos creados)

Capacitor envuelve este mismo código en una app nativa. No hay código
duplicado: `android/` e `ios/` leen de `web/`.

| | |
|---|---|
| **ID de la app** | `com.puentescuba.app` |
| **Nombre** | Puentes |
| **Versión** | 1.0 (versionCode 1) |
| **Capacitor** | 8.5.0 |
| **Node** | v24.19.0 en `C:\Program Files\nodejs` |

### Hecho

- Proyectos `android/` e `ios/` generados con los assets de `web/` copiados
- Icono adaptativo de Android como **vector** (`drawable/ic_launcher_foreground.xml`),
  nítido en cualquier densidad. Fondo `#0E2A2E`
- Iconos heredados en los `mipmap-*/` para Android 7 y 7.1, anteriores a los
  iconos adaptativos (`minSdk` es 24)
- Splash y barra de estado con los colores de marca en `capacitor.config.json`

### Compilar el APK

Todo instalado y funcionando: **APK generado el 2026-08-24, 3,97 MB.**

| | |
|---|---|
| **JDK** | Temurin 21.0.12 en `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| **Android SDK** | `%LOCALAPPDATA%\Android\Sdk` (build-tools 36.0.0, platform android-37.0) |
| **Gradle** | 8.14.3 |
| **AGP** | 8.13.0 |

> **Importante: no uses el JDK que trae Android Studio.** Es Java 25, y Gradle
> 8.14 solo corre hasta Java 24 — falla con *"Unsupported class file major
> version 69"*. Además, el Android Gradle Plugin 8.x está soportado
> oficialmente sobre JDK 17 y 21. El script `build-apk.ps1` ya prefiere el
> Temurin 21 y avisa si encuentra uno demasiado nuevo.
>
> Si alguna vez falta: `winget install EclipseAdoptium.Temurin.21.JDK`

**Desde la línea de comandos** (lo más rápido):

```bash
powershell -ExecutionPolicy Bypass -File tools/build-apk.ps1
```

El script busca el JDK y el SDK solo, escribe `android/local.properties`,
sincroniza los assets de `web/` y compila. El APK queda en
`android/app/build/outputs/apk/debug/`.

La primera vez descarga Gradle (unos 150 MB) y tarda varios minutos.

**Versión de publicación** (necesita firma configurada):

```bash
powershell -ExecutionPolicy Bypass -File tools/build-apk.ps1 -Release
```

**Desde Android Studio:**

```bash
npx cap open android
```

Y ahí: *Build → Generate Signed Bundle / APK*.

> El APK *debug* sirve para instalarlo en tu teléfono y probar, pero **no** para
> publicarlo en Play Store: para eso hace falta un APK o AAB firmado.

Para iOS hace falta una Mac con Xcode. El proyecto `ios/` ya está creado y
se puede copiar tal cual.

### Flujo de trabajo

Cada vez que cambies algo en `web/`:

```bash
npx cap sync
```

Eso vuelve a copiar los assets a las dos plataformas.

### Firmar para Play Store

Play Store no acepta APK de prueba: hay que firmar la app con una clave propia.

**La clave se genera una sola vez y no se puede reemplazar.** Si la perdés, no
podés volver a publicar actualizaciones de la misma app: hay que crear una ficha
nueva y los usuarios instalados quedan sin camino de actualización. Guardá una
copia fuera de la computadora.

Generar la clave (el JDK de Android Studio trae `keytool`):

```bash
"C:\Program Files\Android\Android Studio\jbr\bin\keytool" -genkeypair -v \
  -keystore puentes-release.jks -keyalg RSA -keysize 2048 -validity 10000 \
  -alias puentes
```

Pide una contraseña y algunos datos. Después, en `android/key.properties`
(este archivo **no** debe subirse a ningún repositorio; ya está en `.gitignore`):

```properties
storeFile=../puentes-release.jks
storePassword=TU_CONTRASENIA
keyAlias=puentes
keyPassword=TU_CONTRASENIA
```

Y en `android/app/build.gradle`, dentro de `android { }`, agregar el bloque
`signingConfigs` que lea ese archivo y asignarlo a `buildTypes.release`.

Para Play Store conviene generar un **AAB** en vez de un APK:

```bash
cd android && ./gradlew bundleRelease
```

Queda en `android/app/build/outputs/bundle/release/`.

### Después

- Notificaciones push con `@capacitor/push-notifications` + Firebase
- Play Store: cuenta de desarrollador, 25 USD pago único
- App Store: 99 USD al año

### Nota sobre `npm audit`

Reporta 3 vulnerabilidades moderadas en `uuid` → `xcode` → `@capacitor/cli`.
Es una herramienta **solo de compilación**: no viaja dentro de la app. El
`audit fix` degradaría el CLI a una versión anterior a la del resto de
Capacitor, así que se dejó como está.

## Lo que se verificó

Probado con el servidor local, en escritorio y en viewport de móvil:

- Service worker se instala, activa y controla la página
- Los 8 recursos del shell quedan precacheados
- Las 5 consultas a Supabase se guardan en caché
- **Con el servidor apagado, la app carga completa desde caché**
- Enlaces directos (`/#antes-salir`) abren la sección correcta
- El botón atrás navega entre secciones
- Manifest válido, los 3 iconos se sirven con el tipo MIME correcto
- Sin errores en consola, sin scroll horizontal
- **Supabase realmente inalcanzable** (2026-08-25): con un host `.supabase.co`
  que no resuelve, el service worker devuelve la copia guardada con la marca
  `X-Puentes-Cache: offline`, y `[]` con estado 503 y marca `vacio` cuando no
  hay copia. Los cuatro estados del aviso (todo bien / sin red / servidor caído
  con copia / servidor caído sin copia) se comprobaron uno por uno en el
  navegador, y se verificó que `supabase-js` pasa por el `fetch` envuelto.

**No verificado:** el mismo escenario en un teléfono real en modo avión. La
lógica está comprobada contra fallos de red auténticos en escritorio.
