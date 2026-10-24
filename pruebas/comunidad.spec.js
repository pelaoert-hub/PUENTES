// La seccion Comunidad (Grupos) se pinta limpia: sin 'undefined' ni 'NaN' y
// sin las cifras de miembros que estaban escritas a mano y sin fuente.

const { test, expect } = require('@playwright/test');

test.describe('comunidad sin cifras inventadas', () => {
  test('los grupos se pintan sin undefined, NaN ni cifras de miembros', async ({ page }) => {
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    await page.goto('/#comunidad');
    const tarjetas = page.locator('#community-grid .card');
    await expect(tarjetas).toHaveCount(4);
    const texto = await page.locator('#community-grid').innerText();
    expect(texto).not.toMatch(/undefined|NaN|null/);
    expect(texto).not.toMatch(/miembros|3,214|8,902|5,110|2,340/);
    // cada tarjeta conserva etiqueta y titulo, y no deja un parrafo vacio
    for (let i = 0; i < 4; i++) {
      const t = tarjetas.nth(i);
      await expect(t.locator('.tag')).not.toBeEmpty();
      await expect(t.locator('h3')).not.toBeEmpty();
      await expect(t.locator('p.count')).toHaveCount(0);
    }
    expect(errores).toEqual([]);
  });
});
