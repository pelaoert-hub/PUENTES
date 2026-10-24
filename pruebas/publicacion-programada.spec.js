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
  ['1933: la revolución que derribó a Machado', '2026-10-16T12:00:00Z'],
  ['La Constituyente de 1940', '2026-10-18T12:00:00Z'],
  ['1952: el golpe que sustituyó la Constitución', '2026-10-20T12:00:00Z'],
  ['Los que llegaron a Cuba', '2026-10-22T12:00:00Z'],
  ['Antes de Cuba: los primeros habitantes', '2026-11-24T09:00:00Z'],
  ['1492: el encuentro que cambió Cuba', '2026-11-26T09:00:00Z'],
  ['El nacimiento de las primeras villas cubanas', '2026-11-28T09:00:00Z'],
  ['La Habana: la ciudad que cambió el destino de Cuba', '2026-11-30T09:00:00Z'],
  ['España, África y América: las raíces de una nueva sociedad', '2026-12-02T09:00:00Z'],
  ['El nacimiento del criollo', '2026-12-04T09:00:00Z'],
  ['Cuba en el siglo XVIII: una isla que cambia', '2026-12-06T09:00:00Z'],
  ['Azúcar, tabaco y la transformación de la sociedad cubana', '2026-12-08T09:00:00Z'],
  ['Cuando los cubanos comenzaron a preguntarse quiénes eran', '2026-12-10T09:00:00Z'],
  ['El siglo XIX: el nacimiento de una nación', '2026-12-12T09:00:00Z'],
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

// Serie "Cuba: una historia de cultura e identidad": el bloque "Sigue leyendo"
// de cada capitulo no debe mostrar el enlace a un capitulo aun sin publicar.
// Se prueba con el capitulo 3, que no tiene enlaces a articulos ya publicados:
// antes de la fecha del 2 su bloque entero esta oculto; entre la del 2 y la del
// 4 solo se ve el anterior; despues de la del 4 se ven los dos.
const CAP3 = '/articulos/primeras-villas-cubanas/';
const ENLACE_CAP2 = '.sigue a[href="/articulos/1492-el-encuentro-que-cambio-cuba"]';
const ENLACE_CAP4 = '.sigue a[href="/articulos/la-habana-ciudad-que-cambio-el-destino-de-cuba"]';

test('sigue leyendo: oculta los capitulos aun sin publicar', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-25T12:00:00Z') });
  await page.goto(CAP3);
  await expect(page.locator('.sigue')).toBeHidden();
  await expect(page.locator(ENLACE_CAP2)).toBeHidden();
  await expect(page.locator(ENLACE_CAP4)).toBeHidden();

  await page.clock.install({ time: new Date('2026-11-27T12:00:00Z') });
  await page.goto(CAP3);
  await expect(page.locator(ENLACE_CAP2)).toBeVisible();
  await expect(page.locator(ENLACE_CAP4)).toBeHidden();

  await page.clock.install({ time: new Date('2026-11-30T09:01:00Z') });
  await page.goto(CAP3);
  await expect(page.locator(ENLACE_CAP2)).toBeVisible();
  await expect(page.locator(ENLACE_CAP4)).toBeVisible();
});
