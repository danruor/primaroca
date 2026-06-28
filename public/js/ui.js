// Utilidades de interfaz: formato, iconos, modal, toast, sparkline.

/* --------------------------------- Formato -------------------------------- */
const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat('es-MX');

export const fmtMXN = (n) => MXN.format(Number(n) || 0);
export const fmtNum = (n) => NUM.format(Number(n) || 0);

export function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
export const fmtFechaInput = (iso) => (iso ? String(iso).slice(0, 10) : '');

export function escapar(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/* ------------------------------- Estados ---------------------------------- */
export const ESTADO_PROYECTO = {
  planeacion: 'Planeación',
  en_progreso: 'En progreso',
  pausado: 'Pausado',
  terminado: 'Terminado',
};
export const ESTADO_COT = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};
export function chip(estado, mapa) {
  return `<span class="chip st-${estado}">${escapar((mapa || {})[estado] || estado)}</span>`;
}

/* -------------------------------- Iconos ---------------------------------- */
const ICONS = {
  dashboard:
    '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
  proyectos:
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  materiales:
    '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  cotizador:
    '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
  config:
    '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  hardhat:
    '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 16v-4a6 6 0 0 1 6-6"/><path d="M14 6a6 6 0 0 1 6 6v4"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  printer:
    '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  globe:
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  inbox:
    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down: '<path d="M12 5v14"/><path d="m5 12 7 7 7-7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
};

export function icon(name, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    ICONS[name] || ''
  }</svg>`;
}

/* -------------------------------- Toast ----------------------------------- */
let toastWrap = null;
export function toast(msg, tipo = '') {
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.className = 'toasts';
    document.body.appendChild(toastWrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`.trim();
  const ic = tipo === 'ok' ? 'check' : tipo === 'err' ? 'alert' : 'info';
  t.innerHTML = `${icon(ic, 18)}<span>${escapar(msg)}</span>`;
  toastWrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s ease, transform .3s ease';
    t.style.opacity = '0';
    t.style.transform = 'translateX(24px)';
    setTimeout(() => t.remove(), 300);
  }, 3400);
}

/* -------------------------------- Modal ----------------------------------- */
export function closeModal() {
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
}

export function openModal({ title, bodyHTML = '', footerHTML = '', wide = false }) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-h">
        <h3>${escapar(title)}</h3>
        <button class="btn ghost icon-btn" data-close aria-label="Cerrar">${icon('x', 18)}</button>
      </div>
      <div class="modal-b">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-f">${footerHTML}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);

  return {
    overlay,
    close,
    q: (s) => overlay.querySelector(s),
    qa: (s) => [...overlay.querySelectorAll(s)],
  };
}

export function confirmar({ title = 'Confirmar', message = '', confirmText = 'Eliminar', danger = true }) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      bodyHTML: `<p style="margin:0;color:var(--ink-2);font-size:14px;line-height:1.55">${escapar(message)}</p>`,
      footerHTML: `<button class="btn" data-cancel>Cancelar</button><button class="btn ${
        danger ? 'danger' : 'primary'
      }" data-ok>${escapar(confirmText)}</button>`,
    });
    m.q('[data-cancel]').addEventListener('click', () => {
      m.close();
      resolve(false);
    });
    m.q('[data-ok]').addEventListener('click', () => {
      m.close();
      resolve(true);
    });
  });
}

/* ----------------------------- Botón cargando ----------------------------- */
export function cargando(boton, texto = '') {
  if (!boton) return () => {};
  const original = boton.innerHTML;
  boton.disabled = true;
  const oscuro = boton.classList.contains('amber') || boton.classList.contains('primary') ? '' : ' dark';
  boton.innerHTML = `<span class="spinner${oscuro}"></span>${texto ? ' ' + escapar(texto) : ''}`;
  return () => {
    boton.disabled = false;
    boton.innerHTML = original;
  };
}

/* ------------------------------ Estado vacío ------------------------------ */
export function vacio(titulo, sub = '', iconName = 'inbox') {
  return `<div class="empty">${icon(iconName, 40)}<h3>${escapar(titulo)}</h3>${
    sub ? `<p>${escapar(sub)}</p>` : ''
  }</div>`;
}

/* ------------------------------- Sparkline -------------------------------- */
export function sparkline(values, { w = 132, h = 34, stroke = '#f5a300' } = {}) {
  const vals = (values || []).filter((v) => typeof v === 'number' && !isNaN(v));
  if (vals.length < 2) return '<span class="muted">—</span>';
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - 4 - ((v - min) / span) * (h - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  const last = pts[pts.length - 1];
  const sube = vals[vals.length - 1] >= vals[0];
  const col = stroke;
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${area}" fill="${col}" opacity="0.08"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${col}"/>
  </svg>`;
}

/* --------------------------- Barras horizontales -------------------------- */
// data: [{ etiqueta, valor, sufijo?, color? }]
export function barras(data, { max } = {}) {
  const items = data || [];
  const tope = max || Math.max(1, ...items.map((d) => d.valor || 0));
  return `<div class="barras">${items
    .map((d) => {
      const pct = Math.max(2, Math.round(((d.valor || 0) / tope) * 100));
      return `<div class="barra-row">
        <div class="barra-lbl" title="${escapar(d.etiqueta)}">${escapar(d.etiqueta)}</div>
        <div class="bar ${d.color || ''}"><span style="width:${pct}%"></span></div>
        <div class="barra-val num">${escapar(d.sufijo != null ? d.sufijo : d.valor)}</div>
      </div>`;
    })
    .join('')}</div>`;
}
