/* Logo 3D de Puentes — animacion de la portada.
 *
 * Carga el GLB exportado desde Blender (build_logo.py) y anima:
 *   - las cuentas del camino fluyen del orbe coral (donde estas) al dorado
 *     (donde empezaste), en bucle;
 *   - la placa flota suave y se inclina hacia el puntero.
 * Se pausa fuera de pantalla o con la pestana oculta y respeta
 * "reducir movimiento" (queda quieta, en su mejor angulo).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export async function montarLogo3D(canvas, urlModelo) {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camara.position.set(-2.2, 1.4, 12.5);
  camara.lookAt(0, -0.05, 0);

  escena.add(new THREE.HemisphereLight(0xfff4e6, 0x0d5257, 1.1));
  const clave = new THREE.DirectionalLight(0xfff1e0, 2.6);
  clave.position.set(-4, 5, 7);
  escena.add(clave);
  const contra = new THREE.DirectionalLight(0xbfe6ff, 1.2);
  contra.position.set(3, 2, -5);
  escena.add(contra);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(urlModelo);
  const logo = gltf.scene;
  const pivote = new THREE.Group();
  pivote.add(logo);
  escena.add(pivote);

  // El camino: curva cuadratica entre los dos orbes, igual que en Blender.
  // El GLB viene cuantizado: la posicion de cada nodo no es su centro real,
  // asi que medimos centros con cajas y creamos las cuentas aqui mismo.
  const coral = logo.getObjectByName('Orb_Coral');
  const oro = logo.getObjectByName('Orb_Gold');
  const centro = o => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  const plantilla = logo.getObjectByName('Bead_00');
  const matCuenta = plantilla.material;
  logo.traverse(o => { if (/^Bead_/.test(o.name)) o.visible = false; });
  const geoCuenta = new THREE.SphereGeometry(0.055, 12, 8);
  const cuentas = Array.from({ length: 9 }, () => {
    const c = new THREE.Mesh(geoCuenta, matCuenta);
    logo.add(c);
    return c;
  });

  const r = 0.24;
  const a = centro(coral).add(new THREE.Vector3(r * 0.9, 0.05, 0));
  const b = centro(oro).add(new THREE.Vector3(-r * 0.9, 0.05, 0));
  const medio = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.14, 0));
  const curva = new THREE.QuadraticBezierCurve3(a, medio, b);

  // Resplandor de los orbes (emisivo), para que "laten" al recibir cuentas.
  const matCoral = coral.material, matOro = oro.material;
  const brilloBase = matOro.emissiveIntensity ?? 1;

  function ajustarTamano() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    // Sin animacion (movimiento reducido) nadie vuelve a dibujar: al cambiar
    // de tamano, o al reaparecer el cartel tras volver a la portada, se
    // redibuja aqui el cuadro fijo.
    if (quieto) renderer.render(escena, camara);
  }
  new ResizeObserver(ajustarTamano).observe(canvas);
  ajustarTamano();

  // Inclinacion hacia el puntero, con suavizado.
  const objetivo = { x: 0, y: 0 }, actual = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    objetivo.x = (e.clientX / innerWidth - 0.5) * 2;
    objetivo.y = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  function colocarCuentas(t) {
    const n = cuentas.length;
    cuentas.forEach((c, i) => {
      const u = ((i / n) + t * 0.18) % 1;
      c.position.copy(curva.getPoint(u));
      // Nacen y mueren suaves en los extremos.
      const s = Math.min(1, u / 0.12, (1 - u) / 0.12);
      c.scale.setScalar(Math.max(0.001, s));
    });
    // El dorado se enciende un poco cada vez que llega una cuenta.
    const llegada = cuentas.reduce((m, c, i) => {
      const u = ((i / n) + t * 0.18) % 1;
      return Math.max(m, u > 0.9 ? (u - 0.9) / 0.1 : 0);
    }, 0);
    matOro.emissiveIntensity = brilloBase * (1 + llegada * 1.2);
    matCoral.emissiveIntensity = brilloBase * (1 + 0.25 * Math.sin(t * 2.4));
  }

  let visible = true, corriendo = false, t0 = performance.now();
  function cuadro(ahora) {
    if (!visible || document.hidden) { corriendo = false; return; }
    const t = (ahora - t0) / 1000;
    actual.x += (objetivo.x - actual.x) * 0.05;
    actual.y += (objetivo.y - actual.y) * 0.05;
    pivote.rotation.y = -0.22 + actual.x * 0.28 + Math.sin(t * 0.5) * 0.06;
    pivote.rotation.x = 0.06 + actual.y * 0.14;
    pivote.position.y = Math.sin(t * 0.9) * 0.06;
    colocarCuentas(t);
    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }
  function arrancar() {
    if (corriendo || quieto) return;
    corriendo = true;
    requestAnimationFrame(cuadro);
  }

  // Aparece con un fundido cuando ya hay un cuadro dibujado.
  requestAnimationFrame(() => canvas.classList.add('listo'));

  if (quieto) {
    pivote.rotation.set(0.06, -0.22, 0);
    colocarCuentas(0);
    renderer.render(escena, camara);
  } else {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
    arrancar();
  }

  // Si el navegador pierde el contexto grafico, no dejamos basura.
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); corriendo = false; });
  return { renderer };
}
