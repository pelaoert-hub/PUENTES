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

  // Cabecera en una linea: antes eran dos filas (163px en movil) y se comia
  // media pantalla antes del contenido.
  test('cabecera en una sola linea y baja', async ({ page }) => {
    await page.goto('/');
    const alto = await page.locator('header').evaluate(h => h.getBoundingClientRect().height);
    expect(alto, `la cabecera mide ${alto}px`).toBeLessThanOrEqual(64);
    // El menu, el logo y Explorar comparten la misma fila.
    const filas = await page.evaluate(() => {
      const centro = s => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round(r.top + r.height / 2); };
      return [centro('.logo'), centro('#nav'), centro('#explore-toggle')];
    });
    expect(Math.max(...filas) - Math.min(...filas)).toBeLessThanOrEqual(4);
  });

  test('Explorar: Instalar app vive dentro y Escape cierra el panel', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('#explore-panel');
    await expect(page.locator('#explore-panel #btn-instalar')).toHaveCount(1);
    await page.click('#explore-toggle');
    await expect(panel).toHaveClass(/open/);
    await expect(page.locator('#explore-toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(panel).not.toHaveClass(/open/);
    await expect(page.locator('#explore-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#explore-toggle')).toBeFocused();
    // El boton de instalar sigue abriendo sus instrucciones.
    await page.click('#explore-toggle');
    await page.click('#btn-instalar');
    await expect(page.locator('#modal-instalar')).toHaveClass(/abierto/);
    await expect(panel).not.toHaveClass(/open/);
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
