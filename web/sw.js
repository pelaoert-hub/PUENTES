/* Service Worker de Puentes
 *
 * Pensado para conexiones caras, lentas e intermitentes (sobre todo dentro de
 * Cuba). Tres estrategias segun el tipo de pedido:
 *
 *   1. Navegacion (el HTML)  -> red primero con limite de tiempo, luego cache.
 *      Asi el contenido siempre esta fresco, pero si la red tarda o no hay,
 *      la app abre igual con la ultima version guardada.
 *
 *   2. Datos de Supabase     -> red primero con limite de tiempo, luego cache.
 *      Permite leer tramites, remesas y anuncios ya vistos estando sin datos.
 *      Solo se cachean GET publicos y respuestas correctas.
 *
 *   3. Estaticos (iconos, JS)-> cache primero, revalidando en segundo plano.
 *      No gasta datos en cada visita.
 *
 * Al cambiar VERSION se descartan todos los caches viejos.
 */

const VERSION = 'v5';
const SHELL_CACHE = `puentes-shell-${VERSION}`;
const DATA_CACHE = `puentes-data-${VERSION}`;
const STATIC_CACHE = `puentes-static-${VERSION}`;

// Cuanto esperamos a la red antes de servir lo guardado (ms).
const NET_TIMEOUT = 4500;

// Techo de entradas cacheadas de datos, para no llenar el disco del telefono.
const DATA_MAX_ENTRIES = 120;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/apple-touch-icon.png',
  '/1940-constitucion-trabajo.html',
  // El indice de respuestas rapidas: es la puerta de entrada desde Google y
  // pesa poco. Las guias sueltas no se precachean — se guardan al visitarlas,
  // con la misma estrategia de red-primero que el resto de la navegacion.
  '/guias/'
];

/* ---------- Instalacion ---------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll falla entero si un solo recurso falla; los agregamos de a uno
    // para que un 404 suelto no rompa la instalacion completa.
    await Promise.all(SHELL_ASSETS.map(async url => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (err) {
        console.warn('[sw] no se pudo precachear', url, err);
      }
    }));
  })());
});

/* ---------- Activacion: limpiamos versiones viejas ---------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const vigentes = [SHELL_CACHE, DATA_CACHE, STATIC_CACHE];
    await Promise.all(
      keys.filter(k => k.startsWith('puentes-') && !vigentes.includes(k))
          .map(k => caches.delete(k))
    );
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

/* ---------- Utilidades ---------- */

/** Pide a la red, pero se rinde a los `ms` milisegundos. */
function fetchConLimite(request, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      res => { clearTimeout(id); resolve(res); },
      err => { clearTimeout(id); reject(err); }
    );
  });
}

/** Recorta el cache de datos para que no crezca sin limite. */
async function recortarCache(nombre, maximo) {
  const cache = await caches.open(nombre);
  const keys = await cache.keys();
  if (keys.length <= maximo) return;
  // Las claves salen en orden de insercion: borramos las mas viejas.
  await Promise.all(keys.slice(0, keys.length - maximo).map(k => cache.delete(k)));
}

const esSupabase = url => url.hostname.endsWith('.supabase.co');

const esEstatico = url =>
  url.origin === self.location.origin &&
  /\.(png|svg|jpg|jpeg|webp|gif|ico|css|js|woff2?|json|webmanifest)$/i.test(url.pathname);

/* ---------- Estrategias ---------- */

/** Navegacion: red primero, con respaldo en cache y pagina offline.
 *
 * Cada pagina se guarda bajo SU propia direccion. Antes TODAS se guardaban
 * como '/index.html', asi que abrir una guia reemplazaba la app entera en la
 * cache: al abrir Puentes sin conexion salia la guia en vez de la app. Con una
 * sola pagina suelta casi no se notaba; con las guias es cuestion de tiempo. */
async function manejarNavegacion(event) {
  const cache = await caches.open(SHELL_CACHE);
  const ruta = new URL(event.request.url).pathname;
  try {
    const preload = await event.preloadResponse;
    const red = preload || await fetchConLimite(event.request, NET_TIMEOUT);
    if (red && red.ok) cache.put(ruta, red.clone());
    return red;
  } catch (_) {
    // Primero la pagina pedida; si esa no esta, la app; y si tampoco, el aviso.
    return (await cache.match(ruta))
        || (await cache.match('/index.html'))
        || (await cache.match('/'))
        || (await cache.match('/offline.html'))
        || new Response('Sin conexion', { status: 503, statusText: 'Sin conexion' });
  }
}

/** Datos de Supabase: red primero, con respaldo en lo ultimo guardado. */
async function manejarDatos(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const red = await fetchConLimite(request, NET_TIMEOUT);
    if (red && red.ok) {
      cache.put(request, red.clone());
      recortarCache(DATA_CACHE, DATA_MAX_ENTRIES);
    }
    return red;
  } catch (_) {
    const guardado = await cache.match(request);
    if (guardado) {
      // Marcamos la respuesta para que la interfaz pueda avisar "datos guardados".
      const headers = new Headers(guardado.headers);
      headers.set('X-Puentes-Cache', 'offline');
      return new Response(guardado.body, {
        status: guardado.status,
        statusText: guardado.statusText,
        headers
      });
    }
    return new Response(JSON.stringify([]), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'X-Puentes-Cache': 'vacio' }
    });
  }
}

/** Estaticos: cache primero, revalidando en segundo plano. */
async function manejarEstatico(request) {
  const cache = await caches.open(STATIC_CACHE);
  const guardado = await cache.match(request);
  const enRed = fetch(request).then(res => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return guardado || await enRed || new Response('', { status: 504 });
}

/* ---------- Router ---------- */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Nunca tocamos escrituras: los formularios deben llegar a la red tal cual.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Peticiones con credenciales de sesion: siempre a la red, nunca al cache.
  if (request.headers.has('Authorization') && !esSupabase(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(manejarNavegacion(event));
    return;
  }

  if (esSupabase(url)) {
    // Solo cacheamos lecturas de la API REST. Auth, realtime y storage van directo.
    if (url.pathname.startsWith('/rest/')) {
      event.respondWith(manejarDatos(request));
    }
    return;
  }

  if (esEstatico(url) || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(manejarEstatico(request));
  }
});

/* ---------- Avisos de nuevas convocatorias ---------- */

self.addEventListener('push', event => {
  // Si el aviso llega sin datos o rotos, mostramos algo generico igual:
  // quedarse callado seria peor que un aviso impreciso.
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch (_) {}

  const titulo = datos.titulo || 'Nuevo encuentro en Puentes';
  const cuerpo = datos.cuerpo || 'Alguien convoco un encuentro. Toca para verlo y apuntarte.';
  const url    = datos.url    || '/?source=push#comunidad';

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'es',
      tag: datos.tag || 'encuentro',
      renotify: true,
      data: { url }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/?source=push#comunidad';

  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Si Puentes ya esta abierto, lo traemos al frente y lo llevamos al encuentro
    // en vez de abrir una pestana nueva.
    for (const w of ventanas) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        if ('navigate' in w) { try { await w.navigate(destino); } catch (_) {} }
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});

/* ---------- Mensajes desde la pagina ---------- */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
