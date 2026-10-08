// Pruebas de la portada (index.html) de Puentes.
//
// Recorre las secciones principales en los dos anchos del proyecto y vigila:
//   - que el documento no desborde en horizontal (scrollWidth <= clientWidth),
//   - que no haya errores de JavaScript en consola.
//
// Antes de este archivo, Negocios/Empleos/Anuncios desbordaban a 390px
// (584px y 453px) y nadie lo vigilaba.

const { test, expect } = require('@playwright/test');

const SECCIONES = ['portada', 'tramites', 'antes-salir', 'cuba', 'comunidad', 'remesas', 'negocios', 'empleos'];

// Avisos locales conocidos que NO son fallos de la pagina:
//   - contador de Vercel (/_vercel/insights): solo existe en produccion,
//   - favicon.ico: no lo servimos en local,
//   - service worker: aqui va bloqueado a proposito,
//   - recursos de fuera (fuentes, CDN): el proxy de esta red los corta.
function esRuido(url, texto) {
  if (/_vercel\/insights/.test(url || '')) return true;
  if (/favicon\.ico/.test(url || '')) return true;
  if (/service.?worker|sw\.js/i.test(texto || '')) return true;
  if (url && !/^https?:\/\/localhost[:/]/.test(url)) return true;
  return false;
}

function vigilarErrores(page) {
  const errores = [];
  page.on('pageerror', e => errores.push('JavaScript: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (esRuido(url, m.text())) return;
    errores.push('consola: ' + m.text() + ' (' + url + ')');
  });
  return errores;
}

test.describe('portada', () => {
  test('recorre las secciones sin errores de JavaScript', async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.goto('/');
    for (const id of SECCIONES) {
      await page.goto('/#' + id);
      await expect(page.locator('#' + id)).toHaveClass(/active/);
      await page.waitForTimeout(250);
    }
    expect(errores, errores.join('\n')).toEqual([]);
  });

  for (const id of SECCIONES) {
    test(`seccion ${id}: sin desborde horizontal`, async ({ page }) => {
      await page.goto('/#' + id);
      await expect(page.locator('#' + id)).toHaveClass(/active/);
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        cliente: document.documentElement.clientWidth
      }));
      expect(m.scroll, `scrollWidth ${m.scroll} > clientWidth ${m.cliente}`).toBeLessThanOrEqual(m.cliente);
    });
  }
});
