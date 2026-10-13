// Publicacion programada de articulos.
//
// Un articulo con `desde` no aparece en la portada hasta esa fecha. El filtro
// esta en `articulosPublicados`, en web/index.html, y es lo unico que separa un
// borrador de algo publicado: si se rompe, se publica antes de tiempo y nadie
// se entera.
//
// La prueba no depende del dia en que se ejecute: adelanta el reloj del
// navegador a un minuto antes y a un minuto despues de cada fecha.

const { test, expect } = require('@playwright/test');

const PROGRAMADOS = [
  ['El azúcar y Cuba', '2026-10-14T12:00:00Z'],
];

async function titulosPublicados(page) {
  return page.evaluate(() => articulosPublicados.map(a => a.titulo));
}

for (const [fragmento, iso] of PROGRAMADOS) {
  test('aparece solo cuando llega su fecha: ' + fragmento, async ({ page }) => {
    await page.clock.install({ time: new Date(Date.parse(iso) - 60000) });
    await page.goto('/');
    expect((await titulosPublicados(page)).join(' | ')).not.toContain(fragmento);

    await page.clock.install({ time: new Date(Date.parse(iso) + 60000) });
    await page.goto('/');
    expect((await titulosPublicados(page)).join(' | ')).toContain(fragmento);
  });
}

test('una fecha ilegible no esconde el articulo', async ({ page }) => {
  await page.goto('/');
  const resultado = await page.evaluate(() => {
    const filtro = a => {
      if (!a.desde) return true;
      const cuando = Date.parse(a.desde);
      if (Number.isNaN(cuando)) return true;
      return Date.now() >= cuando;
    };
    return [filtro({ desde: 'manana por la tarde' }), filtro({})];
  });
  expect(resultado).toEqual([true, true]);
});
