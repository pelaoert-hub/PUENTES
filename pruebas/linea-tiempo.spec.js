// Pruebas de la linea de tiempo del Yayabo en la portada.
//
// La regla: cada fecha enlaza a un articulo de Puentes que existe y que la
// escribe, y muestra la fuente (https) que ese articulo cita. Se lee completa
// sin animacion.

const { test, expect } = require('@playwright/test');

test.describe('linea de tiempo', () => {
  test('cada fecha esta en su articulo y lleva fuente https', async ({ page, request }) => {
    await page.goto('/');
    const filas = await page.$$eval('.linea-pista li', lis => lis.map(li => ({
      anio: li.querySelector('.linea-anio').textContent.trim(),
      articulo: li.querySelector('.linea-art').getAttribute('href'),
      fuente: li.querySelector('.linea-fuente a').getAttribute('href'),
    })));
    expect(filas.length).toBeGreaterThan(0);
    for (const f of filas) {
      expect(f.fuente, f.anio).toMatch(/^https:\/\//);
      const r = await request.get(f.articulo);
      expect(r.status(), f.articulo).toBe(200);
      const html = await r.text();
      expect(html, `${f.anio} no aparece en ${f.articulo}`).toContain(f.anio);
      expect(html, `la fuente de ${f.anio} no esta citada en ${f.articulo}`).toContain(f.fuente.replace(/&/g, '&amp;').split('?')[0]);
    }
  });

  test('con reducir movimiento se ve quieta y completa', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const lt = page.locator('.linea-tiempo');
    await lt.scrollIntoViewIfNeeded();
    const quietas = await page.$$eval('.linea-pista li, .linea-arcos .arco', els =>
      els.every(e => getComputedStyle(e).animationName === 'none' && getComputedStyle(e).opacity === '1'));
    expect(quietas).toBe(true);
    await expect(page.locator('.linea-pista li').first()).toBeVisible();
  });
});
