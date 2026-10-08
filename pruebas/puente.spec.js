// Pruebas del puente que se dibuja y de los sellos que se estampan.
//
// El movimiento es un extra: al terminar (o con "reducir movimiento") el
// puente y los sellos tienen que verse exactamente como siempre.

const { test, expect } = require('@playwright/test');

test.describe('puente y sellos', () => {
  test('el puente se dibuja una vez y queda como siempre', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    // Al acabar el viaje de los puntos se marca la visita.
    await expect(page.locator('html')).toHaveClass(/puente-visto/, { timeout: 5000 });
    const estado = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('.puente-calzada'));
      const v = getComputedStyle(document.querySelector('.puente-viaje'));
      return { calzada: c.animationName + ' ' + c.strokeDasharray, viaje: v.animationName + ' ' + v.strokeDashoffset };
    });
    expect(estado.calzada).toBe('none none');
    expect(estado.viaje).toBe('none 0px');
  });

  test('con reducir movimiento el puente y los sellos no se mueven', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#tramites');
    await expect(page.locator('#tramites')).toHaveClass(/active/);
    const nombres = await page.evaluate(() => [
      ...document.querySelectorAll('.puente-calzada, .puente-viaje, .sello')
    ].map(e => getComputedStyle(e).animationName));
    expect(nombres.length).toBeGreaterThan(2);
    expect(nombres.every(n => n === 'none')).toBe(true);
  });

  test('un sello ya en pantalla tiene su tamano de siempre', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/#tramites');
    const sello = page.locator('#leyenda-sellos .sello').first();
    await sello.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    const escala = await sello.evaluate(e => getComputedStyle(e).scale);
    expect(['none', '1']).toContain(escala);
  });
});
