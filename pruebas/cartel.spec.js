// Pruebas del cartel de bienvenida (hero + puente del Yayabo).
//
// El cartel solo se ve en la portada; en las demas secciones se va directo al
// contenido. Como el h1 vivia en el cartel, cada seccion tiene que seguir
// teniendo un unico h1 visible: el del cartel en la portada y el suyo propio
// en las demas. Va en su propio archivo para no pisar las pruebas de la
// cabecera en portada.spec.js.

const { test, expect } = require('@playwright/test');

const SECCIONES = ['portada', 'tramites', 'antes-salir', 'cuba', 'comunidad', 'remesas', 'negocios', 'empleos'];

test.describe('cartel', () => {
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

  test('el cartel vuelve al ir a la portada desde el menu, Explorar y atras', async ({ page }) => {
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

  test('¿Qué necesitas? se ve en la primera pantalla de la portada (movil)', async ({ page }) => {
    const vista = page.viewportSize();
    test.skip(vista.width >= 640, 'solo se exige en movil');
    await page.goto('/');
    const caja = await page.locator('#necesito-titulo').boundingBox();
    expect(caja.y + caja.height, `titulo a ${Math.round(caja.y)}px`).toBeLessThanOrEqual(vista.height);
  });
});
