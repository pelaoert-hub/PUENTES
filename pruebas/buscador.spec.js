// Pruebas del cartel de la portada: el buscador "¿Que necesitas hoy?" y el
// contador de lo verificado.
//
// La regla: el contador se calcula de los datos de la pagina (nunca a mano) y
// el buscador solo encuentra lo que ya esta escrito. Los dos son del suelo:
// tienen que funcionar en movil y sin capa rica.

const { test, expect } = require('@playwright/test');

test.describe('buscador y contador', () => {
  test('el contador sale de los datos de cada seccion', async ({ page }) => {
    await page.goto('/?suelo=1');
    const esperado = await page.evaluate(() => ({
      fichas: Object.values(tramitesData).flat().filter(i => nivelDe(i) === 'oficial' && i.source).length
        + cubaFeed.filter(i => i.source).length,
      enlaces: Object.values(tramitesEnlaces).flat().length + tramitesCuba.length,
      remesas: remesas.filter(r => r[4]).length,
    }));
    for (const [clave, n] of Object.entries(esperado)) {
      expect(n, clave).toBeGreaterThan(0);
      await expect(page.locator(`#cuenta [data-cuenta="${clave}"]`)).toHaveText(String(n));
    }
  });

  test('etiqueta, combobox y resultados accesibles', async ({ page }) => {
    await page.goto('/');
    const q = page.getByLabel('Busca en Puentes');
    await expect(q).toHaveAttribute('role', 'combobox');
    await expect(q).toHaveAttribute('aria-expanded', 'false');
    await q.fill('pasaporte');
    await expect(q).toHaveAttribute('aria-expanded', 'true');
    const lista = page.locator('#buscar-res');
    await expect(lista).toHaveAttribute('role', 'listbox');
    await expect(lista.getByRole('option').first()).toContainText('¿Dónde renuevo el pasaporte cubano?');
    await expect(page.locator('#buscar-estado')).toContainText('resultado');
  });

  test('sinonimo: "visa" lleva a la seccion de visados (Antes de salir)', async ({ page }) => {
    await page.goto('/');
    await page.fill('#buscar-q', 'visa');
    await expect(page.locator('#buscar-res [role="option"]', { hasText: 'Prepararme para salir de Cuba' })).toBeVisible();
  });

  test('teclado: flechas, Enter abre y Escape cierra', async ({ page }) => {
    await page.goto('/');
    const q = page.locator('#buscar-q');
    await q.fill('aduana');
    await q.press('ArrowDown');
    await expect(page.locator('#buscar-op-0')).toHaveAttribute('aria-selected', 'true');
    await expect(q).toHaveAttribute('aria-activedescendant', 'buscar-op-0');
    await q.press('Escape');
    await expect(page.locator('#buscar-res')).toBeHidden();
    await expect(q).toHaveValue('aduana');
    await q.press('Escape');
    await expect(q).toHaveValue('');
    // Una seccion: Enter sobre ella cambia de seccion sin salir de la pagina.
    await q.fill('cambio cuba');
    const op = page.locator('#buscar-res [role="option"]', { hasText: 'Saber qué cambió en Cuba' });
    await expect(op).toBeVisible();
    const i = await op.getAttribute('data-i');
    for (let k = 0; k <= +i; k++) await q.press('ArrowDown');
    await q.press('Enter');
    await expect(page.locator('#cuba')).toHaveClass(/active/);
  });

  test('sin resultados lo dice, sin inventar', async ({ page }) => {
    await page.goto('/');
    await page.fill('#buscar-q', 'zzzxqw');
    await expect(page.locator('#buscar-res .vacio')).toBeVisible();
    await expect(page.locator('#buscar-res [role="option"]')).toHaveCount(0);
  });

  test('los atajos rellenan y buscan', async ({ page }) => {
    await page.goto('/');
    await page.click('.atajos button[data-q="arraigo"]');
    await expect(page.locator('#buscar-q')).toHaveValue('arraigo');
    await expect(page.locator('#buscar-res [role="option"]').first()).toContainText('arraigo');
  });
});
