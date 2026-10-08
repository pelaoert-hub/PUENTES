// Pruebas del logo 3D del cartel.
//
// El 3D solo se carga en pantallas anchas con raton y conexion rapida. Cuando
// no se activa tiene que decir por que en la consola, y ?3d=1 tiene que
// saltarse las comprobaciones de pantalla y conexion (pero nunca la de WebGL2).

const { test, expect } = require('@playwright/test');

async function tieneWebgl2(page) {
  return page.evaluate(() => {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
  });
}

test.describe('logo 3D', () => {
  test('en movil no se activa y deja el motivo en la consola', async ({ page }) => {
    test.skip(page.viewportSize().width >= 900, 'solo en el ancho movil');
    const avisos = [];
    page.on('console', m => { if (m.type() === 'info') avisos.push(m.text()); });
    await page.goto('/');
    await expect(page.locator('.hero')).not.toHaveClass(/con-3d/);
    const motivo = avisos.find(t => t.startsWith('[logo3d] no se activa:'));
    expect(motivo, avisos.join('\n')).toBeTruthy();
  });

  test('?3d=1 se salta el ancho y el raton (si hay WebGL2)', async ({ page }) => {
    test.skip(page.viewportSize().width >= 900, 'solo en el ancho movil');
    await page.goto('/');
    test.skip(!(await tieneWebgl2(page)), 'este navegador no tiene WebGL2');
    // Three.js viene de un CDN que el proxy de esta red corta: se sustituye el
    // modulo por uno vacio, porque aqui solo se comprueba la decision de cargarlo.
    let pedido = false;
    await page.route('**/3d/logo3d.js', r => {
      pedido = true;
      r.fulfill({ contentType: 'text/javascript', body: 'export function montarLogo3D(){}' });
    });
    await page.goto('/?3d=1');
    await expect(page.locator('.hero')).toHaveClass(/con-3d/);
    expect(pedido).toBe(true);
  });
});
