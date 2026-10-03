// Pruebas de los articulos de Puentes.
//
// Lo que vigila este archivo, segun el manual del proyecto:
//   - cero errores de JavaScript,
//   - sin desborde horizontal en los dos anchos,
//   - la pagina aguanta que el almacenamiento del navegador este bloqueado
//     (navegacion privada, datos del sitio bloqueados),
//   - la pagina aguanta que el CDN de Supabase no responda.
//
// El caso del almacenamiento bloqueado es una regresion real: antes reventaba
// el bloque entero de la encuesta y no aparecia, sin ningun aviso.

const { test, expect } = require('@playwright/test');

const ARTICULOS = [
  'constitucion-cuba-1940-2019',
  'cuba-fuera-de-cuba-emigracion',
  'cuba-nacion-antes-de-1959',
  'cultura-cubana-mas-que-simbolos',
  'derechos-ciudadania-republica-cuba',
  'el-son-cubano',
  'jose-marti-hombre-ideas-simbolo',
  'por-que-economia-cubana-no-despega',
  'recuperar-identidad-del-cubano'
];

// Que NO cuenta como error de la pagina:
//   - recursos de fuera (fuentes de Google, CDN de Supabase): el proxy de esta
//     red los bloquea, y en una de las pruebas los cortamos a proposito. La
//     pagina tiene que aguantarlo, y eso es justo lo que se comprueba.
//   - /_vercel/insights: solo existe en produccion, en local da 404.
//
// Lo que SI cuenta es un error de JavaScript de la propia pagina (pageerror) o
// un error de consola nacido en nuestro propio servidor.
function esRuido(url) {
  if (!url) return false;
  if (/_vercel\/insights/.test(url)) return true;
  return !/^https?:\/\/localhost[:/]/.test(url);
}

function vigilarErrores(page) {
  const errores = [];
  page.on('pageerror', e => errores.push('JavaScript: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (esRuido(url)) return;
    errores.push('consola: ' + m.text() + ' (' + url + ')');
  });
  return errores;
}

async function bloquearAlmacenamiento(page) {
  await page.addInitScript(() => {
    const reventar = () => { throw new DOMException('acceso denegado', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: reventar });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get: reventar });
  });
}

async function tumbarSupabase(page) {
  await page.route('**/@supabase/**', r => r.abort());
  await page.route('**/cdn.jsdelivr.net/**', r => r.abort());
}

async function desbordaHorizontal(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

for (const slug of ARTICULOS) {
  test.describe(slug, () => {
    test('carga sin errores y sin desborde', async ({ page }) => {
      const errores = vigilarErrores(page);
      await page.goto('/articulos/' + slug + '/', { waitUntil: 'load' });
      await expect(page.locator('h1')).toBeVisible();
      expect(await desbordaHorizontal(page)).toBe(false);
      expect(errores).toEqual([]);
    });

    test('aguanta el almacenamiento bloqueado', async ({ page }) => {
      const errores = vigilarErrores(page);
      await bloquearAlmacenamiento(page);
      await page.goto('/articulos/' + slug + '/', { waitUntil: 'load' });
      await expect(page.locator('h1')).toBeVisible();
      expect(await desbordaHorizontal(page)).toBe(false);
      expect(errores).toEqual([]);
    });

    test('aguanta el CDN de Supabase caido', async ({ page }) => {
      const errores = vigilarErrores(page);
      await tumbarSupabase(page);
      await page.goto('/articulos/' + slug + '/', { waitUntil: 'load' });
      await expect(page.locator('h1')).toBeVisible();
      expect(errores).toEqual([]);
    });
  });
}
