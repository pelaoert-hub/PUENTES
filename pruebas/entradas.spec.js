// Pruebas de las entradas al bajar, la barra de lectura y los fundidos.
//
// La regla: el movimiento es un extra. Con "reducir movimiento" no hay ni
// entradas ni barra, y en ningun caso una tarjeta que ya esta en pantalla
// puede quedarse invisible.

const { test, expect } = require('@playwright/test');

const TARJETAS = '.necesito-card, .guia-card, .articulo-card';

test.describe('entradas y fundidos', () => {
  test('con reducir movimiento todo se ve quieto y completo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.necesito-card').first()).toBeVisible();
    const sinAnimar = await page.evaluate(sel => [...document.querySelectorAll(sel)]
      .every(e => getComputedStyle(e).animationName === 'none' && getComputedStyle(e).opacity === '1'), TARJETAS);
    expect(sinAnimar).toBe(true);
  });

  test('las tarjetas que ya estan en pantalla no quedan ocultas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.necesito-card').first()).toBeVisible();
    for (const sel of ['.necesito-card', '.guia-card', '.articulo-card']) {
      for (const cual of ['first', 'last']) {
        const t = page.locator(sel)[cual]();
        await t.evaluate(e => e.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(250);
        const o = await t.evaluate(e => parseFloat(getComputedStyle(e).opacity));
        expect(o, `${sel} (${cual}) opacidad ${o}`).toBeGreaterThan(0.9);
      }
    }
  });

  test('barra de lectura: solo decorativa y fuera con reducir movimiento', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/articulos/el-son-cubano/');
    const barra = page.locator('.progreso-lectura');
    await expect(barra).toHaveAttribute('aria-hidden', 'true');
    await expect(barra).toBeHidden();
  });
});
