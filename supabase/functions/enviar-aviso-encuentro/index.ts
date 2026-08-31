// Envia el aviso push cuando alguien convoca un encuentro.
//
// La llama la propia base de datos (trigger + pg_net) al insertar en `eventos`.
// No lleva verificacion de JWT: se protege con un token compartido guardado en
// el Vault, asi que sin ese token la peticion se rechaza.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// service_role se salta las politicas RLS: es la unica via que puede leer las
// suscripciones y los secretos del Vault.
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// El esquema `vault` no esta expuesto en la API, asi que pasamos por una
// funcion puente en `public` que solo puede ejecutar el service_role.
async function secreto(nombre: string): Promise<string | null> {
  const { data, error } = await db.rpc('leer_secreto_push', { p_nombre: nombre });
  if (error || !data) return null;
  return data as string;
}

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Solo POST' }, 405);

  const tokenEsperado = await secreto('push_token');
  if (!tokenEsperado) return json({ error: 'Falta configurar push_token' }, 500);
  if (req.headers.get('x-puentes-token') !== tokenEsperado) {
    return json({ error: 'No autorizado' }, 401);
  }

  let evento: Record<string, unknown> = {};
  try { evento = (await req.json())?.evento ?? {}; } catch { /* sin cuerpo */ }

  const privada = await secreto('vapid_privada');
  const publica = await secreto('vapid_publica');
  if (!privada || !publica) return json({ error: 'Faltan las claves VAPID' }, 500);

  webpush.setVapidDetails('mailto:pelaoert@gmail.com', publica, privada);

  const { data: subs, error } = await db.from('push_suscripciones')
    .select('id, endpoint, p256dh, auth');
  if (error) return json({ error: error.message }, 500);
  if (!subs?.length) return json({ enviados: 0, fallidos: 0, nota: 'Nadie suscrito' });

  const titulo = String(evento.titulo ?? 'Nuevo encuentro en Puentes');
  const lugar = [evento.ciudad, evento.pais].filter(Boolean).join(', ');
  const cuerpo = lugar
    ? `${lugar}${evento.fecha ? ' · ' + evento.fecha : ''}. Toca para verlo y apuntarte.`
    : 'Alguien convoco un encuentro. Toca para verlo y apuntarte.';

  const carga = JSON.stringify({
    titulo,
    cuerpo,
    url: '/?source=push#comunidad',
    tag: 'encuentro-' + (evento.id ?? Date.now()),
  });

  let enviados = 0;
  const caducadas: string[] = [];

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        carga,
      );
      enviados++;
    } catch (err) {
      const codigo = (err as { statusCode?: number })?.statusCode;
      // 404/410 = el navegador ya no existe o el usuario desinstalo: limpiamos.
      if (codigo === 404 || codigo === 410) caducadas.push(s.id);
    }
  }));

  if (caducadas.length) {
    await db.from('push_suscripciones').delete().in('id', caducadas);
  }

  return json({
    enviados,
    fallidos: subs.length - enviados,
    caducadasBorradas: caducadas.length,
  });
});
