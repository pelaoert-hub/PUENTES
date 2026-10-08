/* Puentes: capa rica de la portada. Solo la pide index.html cuando
   html.capa-rica esta puesta (ver la puerta del <head>). */
/* Capa rica del cartel: las cifras suben, las tarjetas se inclinan con el
   raton y detras corre agua (un shader propio en WebGL, sin librerias).
   Solo con html.capa-rica; si algo falla (sin WebGL, por ejemplo) se queda
   el suelo y no se dice nada. */
(function () {
  if (!document.documentElement.classList.contains('capa-rica')) return;
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- 1. Las cifras suben desde cero al verse (el valor final ya esta puesto) ---- */
  var cuentas = window.cuentaPortada, caja = document.getElementById('cifras');
  if (cuentas && caja && 'IntersectionObserver' in window && !quieto.matches) {
    var nums = caja.querySelectorAll('[data-cuenta]');
    new IntersectionObserver(function (ent, obs) {
      if (!ent[0].isIntersecting) return;
      obs.disconnect();
      var t0 = performance.now(), dur = 1100;
      (function paso(ahora) {
        var k = Math.min(1, (ahora - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        nums.forEach(function (el) { el.textContent = Math.round(cuentas[el.dataset.cuenta] * e); });
        if (k < 1) requestAnimationFrame(paso);
      })(t0);
    }).observe(caja);
  }

  /* ---- 2. Inclinacion y brillo de las tarjetas, solo con raton ---- */
  var grid = document.getElementById('necesito-grid');
  if (grid && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    grid.addEventListener('pointermove', function (e) {
      if (quieto.matches || e.pointerType !== 'mouse') return;
      var c = e.target.closest('.necesito-card'); if (!c) return;
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      var max = c.classList.contains('destacada') ? 4 : 7;
      c.classList.add('inclinada');
      c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      c.style.transform = 'rotateX(' + ((0.5 - y) * max).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * max).toFixed(2) + 'deg) translateY(-2px)';
    });
    grid.addEventListener('pointerout', function (e) {
      var c = e.target.closest('.necesito-card');
      if (c && !c.contains(e.relatedTarget)) { c.classList.remove('inclinada'); c.style.transform = ''; }
    });
  }

  /* ---- 3. Agua: un shader de fragmentos, a media resolucion ---- */
  var cv = document.getElementById('agua');
  if (!cv || quieto.matches) return;
  var gl = null;
  try { gl = cv.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' }); } catch (e) {}
  if (!gl) return;
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = 'precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;' +
    'float o(vec2 p){return sin(p.x)+sin(p.y);}' +
    'void main(){vec2 u=gl_FragCoord.xy/r;vec2 p=u*vec2(r.x/r.y,1.)*5.;' +
    'float c=0.;vec2 q=p;for(int i=0;i<4;i++){float f=float(i)+1.;q+=vec2(sin(q.y*.9+t*.21*f),cos(q.x*.8-t*.17*f))*.55/f;c+=o(q*f*.7)/f;}' +
    'c=c*.18+.5;float l=pow(smoothstep(.62,.98,c),2.);' +
    'float d=length((u-m)*vec2(r.x/r.y,1.));float h=.08*exp(-d*5.)*(.5+.5*sin(d*40.-t*3.));' +
    'vec3 a=vec3(.051,.322,.341),b=vec3(.082,.439,.467),g=vec3(1.,.76,.29);' +
    'vec3 col=mix(a,b,smoothstep(.2,.8,c+h));col+=g*l*.10+vec3(.9,.97,.92)*l*.06;' +
    'col=mix(col,a,smoothstep(.35,1.,u.y)*.35);gl_FragColor=vec4(col,1.);}';
  function sh(tipo, src) { var s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return; /* sin agua: el degradado del suelo se queda */
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var ap = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm');
  function medir() {
    cv.width = Math.max(1, Math.round(cv.clientWidth * 0.5)); cv.height = Math.max(1, Math.round(cv.clientHeight * 0.5));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(cv);
  medir();
  var raton = [0.7, 0.6], objetivo = [0.7, 0.6];
  cv.parentElement.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    objetivo = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  }, { passive: true });
  /* Se pausa fuera de pantalla, con la pestana oculta, en otra seccion
     (el cartel se oculta) y si se pide "reducir movimiento" a mitad. */
  var visible = true, corriendo = false, t0 = performance.now();
  function cuadro(ahora) {
    if (!visible || document.hidden || quieto.matches) { corriendo = false; return; }
    raton[0] += (objetivo[0] - raton[0]) * 0.04; raton[1] += (objetivo[1] - raton[1]) * 0.04;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (ahora - t0) / 1000); gl.uniform2f(uM, raton[0], raton[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(cuadro);
  }
  function arrancar() { if (!corriendo && visible && !document.hidden && !quieto.matches) { corriendo = true; requestAnimationFrame(cuadro); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; arrancar(); }).observe(cv);
  document.addEventListener('visibilitychange', arrancar);
  if (quieto.addEventListener) quieto.addEventListener('change', function () { cv.classList.toggle('listo', !quieto.matches); arrancar(); });
  window.aguaPortada = { corriendo: function () { return corriendo; } };
  arrancar();
  requestAnimationFrame(function () { cv.classList.add('listo'); });
})();
