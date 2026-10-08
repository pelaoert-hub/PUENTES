// Pruebas de la capa rica del cartel: agua WebGL, tarjetas que se inclinan y
// entradas. La regla: fuera de la capa rica no existe nada de esto, y sin
// WebGL la pagina sigue igual y sin errores.

const { test, expect } = require('@playwright/test');

test.describe('tarjetas vivas y agua', () => {
  test('en el suelo no hay agua, ni inclinacion, ni entradas del cartel', async ({ page }) => {
    await page.goto('/?suelo=1');
    await expect(page.locator('#agua')).toBeHidden();
    expect(await page.locator('.hero h1').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
    const card = page.locator('.necesito-card').nth(1);
    await card.hover();
    expect(await card.evaluate(e => e.style.transform)).toBe('');
  });

  test('con reducir movimiento tampoco', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#agua')).toBeHidden();
    expect(await page.locator('.hero h1').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
  });

  test('capa rica sin WebGL: sin errores y el resto sigue', async ({ page }) => {
    test.skip(page.viewportSize().width < 900, 'la capa rica es de escritorio');
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    await page.addInitScript(() => {
      const o = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : o.call(this, t, ...a); };
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/capa-rica/);
    await expect(page.locator('#agua')).not.toHaveClass(/listo/);
    await expect(page.locator('#cifras [data-cuenta="enlaces"]')).not.toHaveText('—');
    expect(errores).toEqual([]);
  });

  test('capa rica: la tarjeta se inclina con el raton y vuelve al salir', async ({ page }) => {
    test.skip(page.viewportSize().width < 900, 'la capa rica es de escritorio');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/capa-rica/);
    const card = page.locator('.necesito-card').nth(1);
    await card.scrollIntoViewIfNeeded();
    const bb = await card.boundingBox();
    await page.mouse.move(bb.x + bb.width * 0.8, bb.y + bb.height * 0.2, { steps: 4 });
    await expect.poll(() => card.evaluate(e => e.style.transform)).toContain('rotateX');
    await page.mouse.move(5, 5);
    await expect.poll(() => card.evaluate(e => e.style.transform)).toBe('');
  });
});
