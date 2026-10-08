// Prepara la copia propia de Three.js que usa el logo 3D (web/vendor/three/).
//
//   node tools/three-vendor.mjs
//
// Por que existe: el import map pedia Three a jsDelivr, y su three.module.min.js
// importa three.core.js SIN minificar (Three 0.186 no publica versiones .min;
// las genera jsDelivr al vuelo y no reescribe ese import). Resultado: ~430 KB
// comprimidos para un logo. Aqui se empaqueta SOLO lo que usa web/3d/logo3d.js
// (mas el cargador GLTF y el descompresor meshopt), minificado, en un unico
// archivo servido desde nuestro dominio: no depende de un CDN que falla a
// menudo desde Cuba y el service worker lo guarda como cualquier otro .js.
//
// Solo hace falta volver a ejecutarlo al cambiar de version de Three o si
// logo3d.js empieza a usar algo nuevo de THREE (salta un error al cargar: el
// nombre no esta exportado). Three y esbuild van fijados en devDependencies.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = path.join(RAIZ, 'web', 'vendor', 'three');
const version = JSON.parse(fs.readFileSync(path.join(RAIZ, 'node_modules', 'three', 'package.json'), 'utf8')).version;

// Lo que importa web/3d/logo3d.js. Si se usa algo nuevo de THREE, va aqui.
const entrada = `
export { Box3, DirectionalLight, Group, HemisphereLight, Mesh, NeutralToneMapping,
  PerspectiveCamera, QuadraticBezierCurve3, Scene, SphereGeometry, Vector3, WebGLRenderer } from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
`;

fs.mkdirSync(DESTINO, { recursive: true });
await build({
  stdin: { contents: entrada, resolveDir: RAIZ, loader: 'js' },
  bundle: true,
  format: 'esm',
  minify: true,
  legalComments: 'eof',
  target: 'es2020',
  banner: { js: `/* Three.js ${version} (MIT, (c) three.js authors) y meshoptimizer (MIT, (c) Arseny Kapoulkine). Solo lo que usa /3d/logo3d.js. Generado con tools/three-vendor.mjs; licencias en LICENSE.txt */` },
  outfile: path.join(DESTINO, 'three-logo.min.js'),
});

const licThree = fs.readFileSync(path.join(RAIZ, 'node_modules', 'three', 'LICENSE'), 'utf8');
fs.writeFileSync(path.join(DESTINO, 'LICENSE.txt'),
  `three-logo.min.js contiene partes de dos proyectos con licencia MIT:\n\n` +
  `== three.js ${version} (https://threejs.org) ==\n\n${licThree.trim()}\n\n` +
  `== meshoptimizer (examples/jsm/libs/meshopt_decoder.module.js de three.js) ==\n\n` +
  `Copyright (C) 2016-2026, by Arseny Kapoulkine (arseny.kapoulkine@gmail.com)\n` +
  `Distribuido bajo la licencia MIT, con el mismo texto que la de arriba.\n`);

const peso = fs.statSync(path.join(DESTINO, 'three-logo.min.js')).size;
console.log(`ok: web/vendor/three/three-logo.min.js (${(peso / 1024).toFixed(0)} KB sin comprimir), Three ${version}`);
