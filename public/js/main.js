import { api } from './api.js';
import { icon, toast, vacio } from './ui.js';

import * as dashboard from './views/dashboard.js';
import * as proyectos from './views/proyectos.js';
import * as materiales from './views/materiales.js';
import * as cotizador from './views/cotizador.js';
import * as configuracion from './views/configuracion.js';

/* ------------------------------- Rutas ----------------------------------- */
const RUTAS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', mod: dashboard },
  { id: 'proyectos', label: 'Proyectos', icon: 'proyectos', mod: proyectos },
  { id: 'materiales', label: 'Materiales', icon: 'materiales', mod: materiales },
  { id: 'cotizador', label: 'Cotizador', icon: 'cotizador', mod: cotizador },
  { id: 'configuracion', label: 'Ajustes', icon: 'config', mod: configuracion },
];

const RUTA_DEFAULT = 'dashboard';

const elNav = document.getElementById('nav');
const elTab = document.getElementById('tabbar');
const elContent = document.getElementById('content');
const elEyebrow = document.getElementById('page-eyebrow');
const elTitle = document.getElementById('page-title');
const elActions = document.getElementById('page-actions');

/* --------------------------- Cabecera (contrato) -------------------------- */
const header = {
  set({ eyebrow = '', titulo = '', acciones = [] } = {}) {
    elEyebrow.textContent = eyebrow;
    elTitle.textContent = titulo;
    document.title = titulo ? `${titulo} — Constructora` : 'Constructora';
    elActions.innerHTML = '';
    for (const a of acciones) {
      const btn = document.createElement('button');
      btn.className = `btn${a.variant ? ' ' + a.variant : ''}`;
      if (a.id) btn.id = a.id;
      btn.innerHTML = `${a.icon ? icon(a.icon, 17) : ''}<span>${a.label || ''}</span>`;
      if (typeof a.onClick === 'function') btn.addEventListener('click', a.onClick);
      elActions.appendChild(btn);
    }
  },
};

/* ------------------------------- Navegación ------------------------------- */
function parseHash() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const partes = raw.split('/').filter(Boolean).map(decodeURIComponent);
  const name = partes[0] || RUTA_DEFAULT;
  return { name, params: partes.slice(1) };
}

function pintarNav() {
  const item = (r, contenedor) => {
    const a = document.createElement('a');
    a.href = `#${r.id}`;
    a.dataset.ruta = r.id;
    a.innerHTML = `${icon(r.icon, contenedor === 'tab' ? 22 : 19)}<span>${r.label}</span>`;
    return a;
  };
  elNav.innerHTML = '';
  elTab.innerHTML = '';
  for (const r of RUTAS) {
    elNav.appendChild(item(r, 'side'));
    elTab.appendChild(item(r, 'tab'));
  }
}

function marcarActiva(name) {
  document.querySelectorAll('[data-ruta]').forEach((a) => {
    a.classList.toggle('active', a.dataset.ruta === name);
  });
}

let cargandoVista = false;

async function navegar() {
  const { name, params } = parseHash();
  const ruta = RUTAS.find((r) => r.id === name);

  if (!ruta) {
    location.hash = `#${RUTA_DEFAULT}`;
    return;
  }

  marcarActiva(name);
  window.scrollTo(0, 0);
  elContent.scrollTop = 0;

  if (cargandoVista) return;
  cargandoVista = true;
  try {
    await ruta.mod.render({ root: elContent, header, params });
  } catch (e) {
    console.error('Error al renderizar la vista:', e);
    elContent.innerHTML = vacio(
      'Algo salió mal',
      e.message || 'Error desconocido',
      'alert'
    );
    toast('No se pudo cargar la vista', 'err');
  } finally {
    cargandoVista = false;
  }
}

/* ------------------------- Estado de conexión ----------------------------- */
function actualizarConexion() {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  if (!dot || !txt) return;
  const online = navigator.onLine;
  dot.classList.toggle('warn', !online);
  txt.textContent = online ? 'En línea' : 'Sin conexión';
}

/* ------------------------------- Arranque --------------------------------- */
async function init() {
  pintarNav();

  if (!location.hash) location.hash = `#${RUTA_DEFAULT}`;
  window.addEventListener('hashchange', navegar);
  window.addEventListener('online', actualizarConexion);
  window.addEventListener('offline', actualizarConexion);
  actualizarConexion();

  await navegar();

  // Nombre de la empresa en la marca (best-effort, no bloquea)
  api
    .configuracion()
    .then((cfg) => {
      const nombre = cfg?.empresa?.nombre;
      if (nombre) {
        const el = document.getElementById('brand-name');
        if (el) el.textContent = nombre;
      }
    })
    .catch(() => {});

  // Service worker para PWA / instalación en iPad
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch((e) => {
        console.warn('No se pudo registrar el service worker:', e);
      });
    });
  }
}

init();
