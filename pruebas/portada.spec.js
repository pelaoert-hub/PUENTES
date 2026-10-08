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

  // El cartel (hero + puente) solo se ve en la portada, y cada seccion tiene
  // un unico h1 visible: el del cartel en la portada, el suyo en las demas.
  for (const id of SECCIONES) {
    test(`seccion ${id}: cartel solo en portada y un h1 visible`, async ({ page }) => {
      await page.goto(id === 'portada' ? '/' : '/#' + id);
      await expect(page.locator('#' + id)).toHaveClass(/active/);
      await expect(page.locator('body')).toHaveAttribute('data-seccion', id);
      const cartel = page.locator('.hero');
      if (id === 'portada') await expect(cartel).toBeVisible();
      else await expect(cartel).toBeHidden();
      const h1 = await page.locator('h1:visible').count();
      expect(h1, `h1 visibles en ${id}: ${h1}`).toBe(1);
    });
  }

  test('el cartel vuelve al ir a la portada desde el menu y desde Explorar', async ({ page }) => {
    await page.goto('/#remesas');
    await expect(page.locator('.hero')).toBeHidden();
    await page.click('#nav button[data-section="portada"]');
    await expect(page.locator('.hero')).toBeVisible();
    await page.click('#explore-toggle');
    await page.click('.explore-link[data-section="cuba"]');
    await expect(page.locator('body')).toHaveAttribute('data-seccion', 'cuba');
    await expect(page.locator('.hero')).toBeHidden();
    await page.goBack();
    await expect(page.locator('body')).toHaveAttribute('data-seccion', 'portada');
    await expect(page.locator('.hero')).toBeVisible();
  });

  test('¿Qué necesitas? se ve en la primera pantalla de la portada', async ({ page }) => {
    await page.goto('/');
    const titulo = page.locator('#necesito-titulo');
    const caja = await titulo.boundingBox();
    const alto = page.viewportSize().height;
    // Solo exigido en movil, que es lo que pide el manual; en escritorio se mide
    // pero el cartel grande con el logo 3D puede empujarlo.
    if (alto && page.viewportSize().width < 640) {
      expect(caja.y + caja.height, `titulo a ${Math.round(caja.y)}px`).toBeLessThanOrEqual(alto);
    }
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
