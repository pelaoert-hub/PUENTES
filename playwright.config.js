// Configuracion de pruebas de Puentes.
//
// Dos decisiones que no hay que deshacer sin entender por que:
//
//   1. channel: 'msedge'. El proxy de esta red corta la descarga del Chromium
//      propio de Playwright (`npx playwright install` falla por timeout), asi
//      que usamos el Edge que ya esta instalado en el sistema. Si algun dia la
//      descarga funciona, se puede quitar el canal y usar el navegador propio.
//
//   2. serviceWorkers: 'block'. Con el service worker activo las pruebas leen
//      copias guardadas en cache y mienten: pasan aunque la pagina este rota.
//      Esto ya engano una vez.
//
// El servidor estatico se levanta solo (tools/serve.ps1, puerto 8080).

const { defineConfig, devices } = require('@playwright/test');

const PUERTO = 8080;
const BASE = 'http://localhost:' + PUERTO;

module.exports = defineConfig({
  testDir: './pruebas',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],

  use: {
    baseURL: BASE,
    serviceWorkers: 'block',
    channel: 'msedge',
    trace: 'on-first-retry'
  },

  // Los dos anchos del manual del proyecto.
  projects: [
    {
      name: 'movil',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 390, height: 840 } }
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1280, height: 900 } }
    }
  ],

  webServer: {
    command: 'powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port ' + PUERTO,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000
  }
});
