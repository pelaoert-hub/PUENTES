// Pruebas de la puerta de las dos capas (html.capa-rica) y de la fuente propia.
//
// La regla: el suelo (movil, Cuba, ahorro de datos, "reducir movimiento") no
// descarga nada de la capa rica. Ni la fuente: solo se pide si la usa un
// titular, y eso solo pasa con html.capa-rica.

const { test, expect } = require('@playwright/test');

function contarFuentes(page) {
  const pedidas = [];
  page.on('request', r => { if (/\/fonts\/.*\.woff2/.test(r.url())) pedidas.push(r.url()); });
  return pedidas;
}

test.describe('capa rica', () => {
  test('en movil: suelo, sin clase y sin pedir la fuente', async ({ page }) => {
    test.skip(page.viewportSize().width >= 900, 'solo en el ancho movil');
    const pedidas = contarFuentes(page);
    await page.goto('/');
    await page.waitForTimeout(600);
    await expect(page.locator('html')).not.toHaveClass(/capa-rica/);
    expect(pedidas).toEqual([]);
  });

  test('en escritorio con raton: capa rica y titulares con Source Serif 4', async ({ page }) => {
    test.skip(page.viewportSize().width < 900, 'solo en escritorio');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const pedidas = contarFuentes(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/capa-rica/);
    await page.evaluate(() => document.fonts.ready);
    const familia = await page.locator('h1:visible').evaluate(e => getComputedStyle(e).fontFamily);
    expect(familia).toContain('Source Serif 4');
    expect(await page.evaluate(() => document.fonts.check('600 40px "Source Serif 4"'))).toBe(true);
    expect(pedidas.length).toBe(1);
  });

  test('con reducir movimiento o ?suelo=1 se queda el suelo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/capa-rica/);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?suelo=1');
    await expect(page.locator('html')).not.toHaveClass(/capa-rica/);
  });

  test('?3d=1 fuerza la capa rica en cualquier ancho', async ({ page }) => {
    await page.route('**/3d/logo3d.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export function montarLogo3D(){}' }));
    await page.goto('/?3d=1');
    await expect(page.locator('html')).toHaveClass(/capa-rica/);
  });
});
