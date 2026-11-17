// Configuracion de pruebas de Puentes.
//
// Dos decisiones que no hay que deshacer sin entender por que:
//
//   1. Navegador. En el PC con Windows se usaba el Edge del sistema
//      (channel: 'msedge') porque el proxy de aquella red cortaba la descarga
//      del Chromium propio de Playwright. En el Mac se usa el Chromium propio
//      de Playwright; se baja una vez con:  npx playwright install chromium
//      (Si prefieres el Chrome instalado en el Mac, anade channel: 'chrome'.)
//
//   2. serviceWorkers: 'block'. Con el service worker activo las pruebas leen
//      copias guardadas en cache y mienten: pasan aunque la pagina este rota.
//      Esto ya engano una vez.
//
// El servidor estatico se levanta solo (tools/serve.py, puerto 8080).

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
    trace: 'on-first-retry'
  },

  // Los dos anchos del manual del proyecto.
  projects: [
    {
      name: 'movil',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 840 } }
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ],

  webServer: {
    command: 'python3 tools/serve.py --port ' + PUERTO,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000
  }
});
