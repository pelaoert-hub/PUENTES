(function(){
'use strict';
var $ = function(id){ return document.getElementById(id); };

/* escapa tambien comillas: se usa dentro de atributos */
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
/* almacenamiento local con respaldo si esta bloqueado */
var mem = {};
function leer(k, def){
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
  catch(e){ return k in mem ? mem[k] : def; }
}
function guardar(k, v){
  try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ mem[k] = v; }
}
function hoy(){
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

/* ---------- articulos ---------- */
function pintarArticulos(){
  $('lista-articulos').innerHTML = window.ARTICULOS.map(function(a){
    return '<div class="tarjeta"><span class="etiqueta">'+esc(a.tema)+'</span> '+
      (a.borrador ? '<span class="etiqueta borrador">Borrador</span>' : '')+
      '<h3>'+esc(a.titulo)+'</h3><p>'+esc(a.resumen)+'</p>'+
      '<a href="#articulo/'+esc(a.id)+'">Leer · '+a.minutos+' min</a></div>';
  }).join('');
}
function ruta(){
  var m = location.hash.match(/^#articulo\/([\w-]+)$/);
  var art = m && window.ARTICULOS.filter(function(a){ return a.id === m[1]; })[0];
  $('vista-principal').classList.toggle('oculto', !!art);
  $('vista-articulo').classList.toggle('oculto', !art);
  if(art){
    $('vista-articulo').innerHTML = '<a href="#articulos">← Volver</a><p><span class="etiqueta">'+esc(art.tema)+'</span> '+
      (art.borrador ? '<span class="etiqueta borrador">Borrador sin revisar</span>' : '')+'</p><h1>'+esc(art.titulo)+'</h1>'+art.cuerpo;
    window.scrollTo(0,0);
  }
}

/* ---------- diario ---------- */
function pintarDiario(){
  var d = leer('ci_diario', []);
  if(!d.length) return;
  $('lista-diario').innerHTML = d.slice().reverse().slice(0,20).map(function(e){
    return '<div class="mensaje"><small>'+esc(e.fecha)+' · '+esc(e.tipo)+'</small><br>'+esc(e.texto).replace(/\n/g,'<br>')+'</div>';
  }).join('');
}
function anotar(tipo, texto){
  var d = leer('ci_diario', []); d.push({fecha: hoy(), tipo: tipo, texto: texto});
  guardar('ci_diario', d.slice(-200)); pintarDiario();
}
$('gr-guardar').onclick = function(){
  var t = ['gr1','gr2','gr3'].map(function(i){ return $(i).value.trim(); }).filter(Boolean);
  if(!t.length){ $('gr-ok').textContent = 'Escribe al menos una.'; return; }
  anotar('Gratitud', t.map(function(x,i){ return (i+1)+'. '+x; }).join('\n'));
  ['gr1','gr2','gr3'].forEach(function(i){ $(i).value = ''; });
  $('gr-ok').textContent = 'Guardado.';
};
$('ex-guardar').onclick = function(){
  var p = ['¿A quién ayudé?','¿A quién pude lastimar?','Mañana, distinto'], t = [];
  ['ex1','ex2','ex3'].forEach(function(i,n){ var v = $(i).value.trim(); if(v) t.push(p[n]+' '+v); });
  if(!t.length){ $('ex-ok').textContent = 'Escribe algo primero.'; return; }
  anotar('Examen del día', t.join('\n'));
  ['ex1','ex2','ex3'].forEach(function(i){ $(i).value = ''; });
  $('ex-ok').textContent = 'Guardado.';
};

/* ---------- habitos ---------- */
function racha(dias){
  var n = 0, d = new Date();
  if(dias.indexOf(hoy()) < 0) d.setDate(d.getDate()-1); /* si hoy no se marco, cuenta desde ayer */
  for(;;){
    var k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(dias.indexOf(k) < 0) break;
    n++; d.setDate(d.getDate()-1);
  }
  return n;
}
function pintarHabitos(){
  var h = leer('ci_habitos', []);
  $('lista-habitos').innerHTML = h.length ? h.map(function(x,i){
    var hecho = x.dias.indexOf(hoy()) >= 0;
    return '<div class="habito"><span>'+esc(x.nombre)+' <span class="racha">'+racha(x.dias)+' días seguidos</span></span>'+
      '<span><button class="boton '+(hecho?'':'sec')+'" data-m="'+i+'">'+(hecho?'Hecho hoy ✓':'Marcar hoy')+'</button> '+
      '<button class="boton sec" data-q="'+i+'" aria-label="Quitar">✕</button></span></div>';
  }).join('') : '<p class="sub">Añade tu primer hábito.</p>';
}
$('lista-habitos').onclick = function(e){
  var h = leer('ci_habitos', []), b = e.target.closest('button'); if(!b) return;
  if(b.dataset.m !== undefined){
    var x = h[+b.dataset.m], p = x.dias.indexOf(hoy());
    if(p >= 0) x.dias.splice(p,1); else x.dias.push(hoy());
  } else if(b.dataset.q !== undefined){
    if(!confirm('¿Quitar este hábito?')) return;
    h.splice(+b.dataset.q,1);
  }
  guardar('ci_habitos', h); pintarHabitos();
};
$('add-habito').onclick = function(){
  var n = $('nuevo-habito').value.trim(); if(!n) return;
  var h = leer('ci_habitos', []); h.push({nombre: n, dias: []});
  guardar('ci_habitos', h); $('nuevo-habito').value = ''; pintarHabitos();
};

/* ---------- respiracion ---------- */
var resp = null;
$('resp-inicio').onclick = function(){
  var c = $('circulo'), est = $('resp-estado'), btn = $('resp-inicio');
  if(resp){ clearTimeout(resp); resp = null; c.style.transform = ''; c.textContent = 'Listo'; btn.textContent = 'Comenzar'; return; }
  btn.textContent = 'Parar';
  var fases = [['Inhala',4,1.35],['Sostén',4,1.35],['Exhala',6,1]], ciclos = 0, total = 12; /* 12 ciclos = 3 min aprox */
  (function paso(i){
    if(ciclos >= total){ resp = null; c.textContent = 'Listo'; est.textContent = 'Terminaste. Respira con normalidad.'; btn.textContent = 'Comenzar'; return; }
    var f = fases[i];
    c.textContent = f[0]; c.style.transitionDuration = f[1]+'s'; c.style.transform = 'scale('+f[2]+')';
    est.textContent = f[0]+' · '+f[1]+' s · ciclo '+(ciclos+1)+' de '+total;
    if(i === 2) ciclos++;
    resp = setTimeout(function(){ paso((i+1)%3); }, f[1]*1000);
  })(0);
};

/* ---------- meditacion ---------- */
var med = null;
function fmt(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
$('med-min').onchange = function(){ if(!med) $('med-reloj').textContent = fmt(+$('med-min').value*60); };
function campana(){
  try{
    var a = new (window.AudioContext||window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 528; g.gain.setValueAtTime(.2,a.currentTime); g.gain.exponentialRampToValueAtTime(.001,a.currentTime+3);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+3);
  }catch(e){}
}
$('med-inicio').onclick = function(){
  var btn = $('med-inicio');
  if(med){ clearInterval(med); med = null; btn.textContent = 'Comenzar'; $('med-reloj').textContent = fmt(+$('med-min').value*60); return; }
  var fin = Date.now() + (+$('med-min').value)*60000; btn.textContent = 'Parar';
  med = setInterval(function(){
    var r = Math.max(0, Math.round((fin-Date.now())/1000));
    $('med-reloj').textContent = fmt(r);
    if(r === 0){ clearInterval(med); med = null; btn.textContent = 'Comenzar'; campana(); anotar('Silencio', $('med-min').value+' minutos de silencio'); }
  }, 250);
};

/* ---------- comunidad (PostgREST directo, sin CDN) ---------- */
var C = window.CONFIG_COMUNIDAD || {};
function cabeceras(){ return {'apikey': C.clavePublica, 'Authorization': 'Bearer '+C.clavePublica, 'Content-Type': 'application/json'}; }
function cargarMensajes(){
  fetch(C.url+'/rest/v1/comunidad_mensajes?select=nombre,texto,created_at&order=created_at.desc&limit=30', {headers: cabeceras()})
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(m){
      $('com-lista').innerHTML = m.length ? m.map(function(x){
        return '<div class="mensaje"><b>'+esc(x.nombre)+'</b> <small>'+esc(x.created_at.slice(0,10))+' · ? Aporte de la comunidad</small><br>'+esc(x.texto)+'</div>';
      }).join('') : '<p class="sub">Aún no hay mensajes publicados.</p>';
    })
    .catch(function(){ $('com-lista').innerHTML = '<p class="sub">No se pudieron cargar los mensajes ahora mismo.</p>'; });
}
if(C.url && C.clavePublica && /^https:\/\//.test(C.url)){
  cargarMensajes();
  $('com-enviar').onclick = function(){
    var n = $('com-nombre').value.trim(), t = $('com-texto').value.trim();
    if(!n || t.length < 5){ $('com-ok').textContent = 'Escribe tu nombre y un mensaje.'; return; }
    $('com-enviar').disabled = true;
    fetch(C.url+'/rest/v1/comunidad_mensajes', {method:'POST', headers: Object.assign({'Prefer':'return=minimal'}, cabeceras()), body: JSON.stringify({nombre:n, texto:t})})
      .then(function(r){ if(!r.ok) throw 0; $('com-texto').value = ''; $('com-ok').textContent = 'Recibido. Se publicará cuando se revise.'; })
      .catch(function(){ $('com-ok').textContent = 'No se pudo enviar. Inténtalo más tarde.'; })
      .then(function(){ $('com-enviar').disabled = false; });
  };
} else {
  $('com-activa').classList.add('oculto');
  $('com-inactiva').classList.remove('oculto');
}

pintarArticulos(); pintarHabitos(); pintarDiario(); ruta();
window.addEventListener('hashchange', ruta);
})();
