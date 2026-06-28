import { api } from '../api.js';
import {
  fmtMXN,
  fmtFecha,
  fmtFechaInput,
  icon,
  toast,
  openModal,
  confirmar,
  cargando,
  vacio,
  escapar,
  chip,
  barras,
  ESTADO_PROYECTO,
  ESTADO_COT,
} from '../ui.js';

const TIPOS = ['Casa', 'Edificio', 'Departamentos', 'Remodelación', 'Local comercial', 'Obra civil', 'Otro'];

export async function render({ root, header, params }) {
  const sub = params && params[0];
  if (sub) return detalle(root, header, sub);
  return lista(root, header);
}

/* --------------------------------- Lista ---------------------------------- */
async function lista(root, header) {
  header.set({
    eyebrow: 'Cartera de obra',
    titulo: 'Proyectos',
    acciones: [{ label: 'Nuevo proyecto', icon: 'plus', variant: 'amber', onClick: () => abrirForm(null, () => lista(root, header)) }],
  });

  root.innerHTML = `<div id="proy-list"><div class="empty"><span class="spinner dark"></span></div></div>`;
  const cont = root.querySelector('#proy-list');

  let proyectos;
  try {
    proyectos = await api.proyectos();
  } catch (e) {
    cont.innerHTML = vacio('Error al cargar', e.message, 'alert');
    return;
  }

  if (!proyectos.length) {
    cont.innerHTML = vacio('Sin proyectos todavía', 'Crea tu primer proyecto para dar seguimiento a avances e hitos.', 'proyectos');
    return;
  }

  cont.innerHTML = `<div class="proy-grid">${proyectos.map(tarjeta).join('')}</div>`;
  cont.querySelectorAll('[data-open]').forEach((c) =>
    c.addEventListener('click', () => (location.hash = `#proyectos/${c.dataset.open}`))
  );
}

function tarjeta(p) {
  const completados = (p.hitos || []).filter((h) => h.completado).length;
  return `<div class="card proy-card" data-open="${p.id}">
    <div class="card-b">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div>
          <div style="font-family:var(--display);font-weight:700;font-size:16px;line-height:1.2">${escapar(p.nombre)}</div>
          <div class="muted" style="font-size:12.5px;margin-top:3px">${escapar(p.cliente || 'Sin cliente')}</div>
        </div>
        ${chip(p.estado, ESTADO_PROYECTO)}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <span class="chip cat">${escapar(p.tipo || 'Obra')}</span>
        ${p.ubicacion ? `<span class="chip">${icon('pin', 12)} ${escapar(p.ubicacion)}</span>` : ''}
      </div>
      <div style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
          <span class="muted">Avance</span><span class="num" style="font-weight:600">${p.avance || 0}%</span>
        </div>
        <div class="bar ${p.estado === 'terminado' ? 'green' : ''}"><span style="width:${p.avance || 0}%"></span></div>
      </div>
      <div class="proy-foot">
        <span>${icon('check', 13)} ${completados}/${(p.hitos || []).length} hitos</span>
        ${p.presupuesto ? `<span class="num">${fmtMXN(p.presupuesto)}</span>` : '<span></span>'}
      </div>
    </div>
  </div>`;
}

/* -------------------------------- Detalle --------------------------------- */
async function detalle(root, header, id) {
  root.innerHTML = `<div class="empty"><span class="spinner dark"></span></div>`;
  let p, cotizaciones;
  try {
    [p, cotizaciones] = await Promise.all([api.proyecto(id), api.cotizaciones()]);
  } catch (e) {
    root.innerHTML = vacio('Proyecto no encontrado', e.message, 'alert');
    return;
  }
  const vinculadas = cotizaciones.filter((c) => c.proyectoId === id);

  header.set({
    eyebrow: ESTADO_PROYECTO[p.estado] || 'Proyecto',
    titulo: p.nombre,
    acciones: [
      { label: 'Volver', icon: 'back', variant: 'ghost', onClick: () => (location.hash = '#proyectos') },
      { label: 'Editar', icon: 'edit', variant: '', onClick: () => abrirForm(p, () => detalle(root, header, id)) },
      { label: 'Eliminar', icon: 'trash', variant: 'danger', onClick: borrar },
    ],
  });

  async function borrar() {
    const ok = await confirmar({
      title: 'Eliminar proyecto',
      message: `¿Eliminar el proyecto "${p.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.borrarProyecto(id);
      toast('Proyecto eliminado', 'ok');
      location.hash = '#proyectos';
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  root.innerHTML = `<div class="grid" style="gap:18px">
    <div class="card">
      <div class="card-b">
        <div class="meta-grid">
          ${metaItem('user', 'Cliente', p.cliente || '—')}
          ${metaItem('proyectos', 'Tipo', p.tipo || '—')}
          ${metaItem('pin', 'Ubicación', p.ubicacion || '—')}
          ${metaItem('calendar', 'Inicio', fmtFecha(p.fechaInicio))}
          ${metaItem('calendar', 'Fin estimado', fmtFecha(p.fechaFinEstimada))}
          ${metaItem('cotizador', 'Presupuesto', p.presupuesto ? fmtMXN(p.presupuesto) : '—')}
        </div>
        <div style="margin-top:20px;display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:220px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
              <span class="muted">Avance general</span><span class="num" style="font-weight:700" id="d-avance-lbl">${p.avance || 0}%</span>
            </div>
            <input type="range" id="d-avance" min="0" max="100" step="5" value="${p.avance || 0}" style="width:100%" />
          </div>
          <div class="field" style="margin:0;min-width:170px">
            <label>Estado</label>
            <select id="d-estado">${Object.entries(ESTADO_PROYECTO)
              .map(([k, v]) => `<option value="${k}" ${k === p.estado ? 'selected' : ''}>${v}</option>`)
              .join('')}</select>
          </div>
        </div>
      </div>
    </div>

    <div class="grid two-col">
      <div class="card">
        <div class="card-h">
          <h3>Hitos de obra</h3>
          <button class="btn sm" id="d-add-hito">${icon('plus', 15)} Agregar</button>
        </div>
        <div class="card-b" id="d-hitos"></div>
      </div>

      <div class="card">
        <div class="card-h">
          <h3>Cotizaciones</h3>
          <button class="btn sm" id="d-add-cot">${icon('plus', 15)} Nueva</button>
        </div>
        <div class="card-b" id="d-cots"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Notas</h3></div>
      <div class="card-b">
        <textarea id="d-notas" placeholder="Observaciones del proyecto…">${escapar(p.notas || '')}</textarea>
        <div style="margin-top:10px;text-align:right"><button class="btn sm" id="d-save-notas">${icon('save', 15)} Guardar notas</button></div>
      </div>
    </div>
  </div>`;

  // Avance
  const avInput = root.querySelector('#d-avance');
  const avLbl = root.querySelector('#d-avance-lbl');
  let avTimer;
  avInput.addEventListener('input', () => {
    avLbl.textContent = `${avInput.value}%`;
    clearTimeout(avTimer);
    avTimer = setTimeout(async () => {
      try {
        await api.actualizarProyecto(id, { avance: Number(avInput.value) });
        p.avance = Number(avInput.value);
      } catch (e) {
        toast(e.message, 'err');
      }
    }, 350);
  });

  // Estado
  root.querySelector('#d-estado').addEventListener('change', async (e) => {
    try {
      await api.actualizarProyecto(id, { estado: e.target.value });
      p.estado = e.target.value;
      toast('Estado actualizado', 'ok');
    } catch (err) {
      toast(err.message, 'err');
    }
  });

  // Notas
  root.querySelector('#d-save-notas').addEventListener('click', async (e) => {
    const fin = cargando(e.currentTarget, '');
    try {
      await api.actualizarProyecto(id, { notas: root.querySelector('#d-notas').value });
      fin();
      toast('Notas guardadas', 'ok');
    } catch (err) {
      fin();
      toast(err.message, 'err');
    }
  });

  // Hitos
  function pintarHitos() {
    const cont = root.querySelector('#d-hitos');
    const hitos = p.hitos || [];
    const done = hitos.filter((h) => h.completado).length;
    const sugerido = hitos.length ? Math.round((done / hitos.length) * 100) : 0;
    cont.innerHTML =
      (hitos.length
        ? hitos
            .map(
              (h, i) => `<div class="hito ${h.completado ? 'done' : ''}">
        <div class="checkbox ${h.completado ? 'done' : ''}" data-toggle="${i}">${h.completado ? icon('check', 13) : ''}</div>
        <div class="h-name">${escapar(h.nombre)}${h.fecha ? `<span class="muted" style="font-size:11px"> · ${fmtFecha(h.fecha)}</span>` : ''}</div>
        <button class="btn ghost icon-btn" data-del-hito="${i}" title="Quitar">${icon('x', 15)}</button>
      </div>`
            )
            .join('')
        : `<div class="muted" style="text-align:center;padding:14px 0;font-size:13px">Sin hitos. Agrega las etapas de la obra.</div>`) +
      (hitos.length
        ? `<div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:12px">
            <span class="muted">${done}/${hitos.length} completados</span>
            <button class="btn sm" id="d-aplicar-avance">Fijar avance a ${sugerido}%</button>
          </div>`
        : '');

    cont.querySelectorAll('[data-toggle]').forEach((b) =>
      b.addEventListener('click', () => toggleHito(Number(b.dataset.toggle)))
    );
    cont.querySelectorAll('[data-del-hito]').forEach((b) =>
      b.addEventListener('click', () => delHito(Number(b.dataset.delHito)))
    );
    const ap = cont.querySelector('#d-aplicar-avance');
    if (ap)
      ap.addEventListener('click', async () => {
        avInput.value = sugerido;
        avLbl.textContent = `${sugerido}%`;
        try {
          await api.actualizarProyecto(id, { avance: sugerido });
          p.avance = sugerido;
          toast('Avance actualizado', 'ok');
        } catch (e) {
          toast(e.message, 'err');
        }
      });
  }

  async function guardarHitos() {
    try {
      await api.actualizarProyecto(id, { hitos: p.hitos });
    } catch (e) {
      toast(e.message, 'err');
    }
  }
  async function toggleHito(i) {
    p.hitos[i].completado = !p.hitos[i].completado;
    if (p.hitos[i].completado && !p.hitos[i].fecha) p.hitos[i].fecha = new Date().toISOString().slice(0, 10);
    pintarHitos();
    await guardarHitos();
  }
  async function delHito(i) {
    p.hitos.splice(i, 1);
    pintarHitos();
    await guardarHitos();
  }
  root.querySelector('#d-add-hito').addEventListener('click', () => {
    const m = openModal({
      title: 'Nuevo hito',
      bodyHTML: `<div class="field"><label>Nombre del hito *</label><input id="h-nombre" placeholder="Ej. Cimentación" /></div>
        <div class="field"><label>Fecha (opcional)</label><input id="h-fecha" type="date" /></div>`,
      footerHTML: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok>Agregar</button>`,
    });
    m.q('#h-nombre').focus();
    m.q('[data-ok]').addEventListener('click', async () => {
      const nombre = m.q('#h-nombre').value.trim();
      if (!nombre) {
        toast('Escribe el nombre del hito', 'err');
        return;
      }
      p.hitos = p.hitos || [];
      p.hitos.push({ nombre, completado: false, fecha: m.q('#h-fecha').value || '' });
      m.close();
      pintarHitos();
      await guardarHitos();
    });
  });

  // Cotizaciones vinculadas
  const cotsCont = root.querySelector('#d-cots');
  if (!vinculadas.length) {
    cotsCont.innerHTML = `<div class="muted" style="text-align:center;padding:14px 0;font-size:13px">Sin cotizaciones vinculadas.</div>`;
  } else {
    cotsCont.innerHTML = vinculadas
      .map(
        (c) => `<div class="cot-mini" data-cot="${c.id}">
        <div>
          <div style="font-weight:600;font-size:13.5px">${escapar(c.nombre)}</div>
          <div class="muted" style="font-size:11px">${escapar(c.folio)} · ${chip(c.estado, ESTADO_COT)}</div>
        </div>
        <div class="num" style="font-weight:700">${fmtMXN(c.total)}</div>
      </div>`
      )
      .join('');
    cotsCont.querySelectorAll('[data-cot]').forEach((el) =>
      el.addEventListener('click', () => (location.hash = `#cotizador/${el.dataset.cot}`))
    );
  }
  root.querySelector('#d-add-cot').addEventListener('click', () => {
    sessionStorage.setItem('cot_proyecto_prefill', id);
    location.hash = '#cotizador/nuevo';
  });

  pintarHitos();
}

/* ----------------------------- Formulario P ------------------------------- */
function abrirForm(p, alGuardar) {
  const esEdicion = !!p;
  const datos = p || {};
  const m = openModal({
    title: esEdicion ? 'Editar proyecto' : 'Nuevo proyecto',
    wide: true,
    bodyHTML: `
      <datalist id="dl-tipos">${TIPOS.map((t) => `<option value="${t}"></option>`).join('')}</datalist>
      <div class="field"><label>Nombre del proyecto *</label><input id="p-nombre" value="${escapar(datos.nombre || '')}" placeholder="Ej. Casa habitación - Lomas del Sol" /></div>
      <div class="row2">
        <div class="field"><label>Cliente</label><input id="p-cliente" value="${escapar(datos.cliente || '')}" /></div>
        <div class="field"><label>Tipo de obra</label><input id="p-tipo" list="dl-tipos" value="${escapar(datos.tipo || 'Casa')}" /></div>
      </div>
      <div class="field"><label>Ubicación</label><input id="p-ubicacion" value="${escapar(datos.ubicacion || '')}" placeholder="Ciudad, estado" /></div>
      <div class="row3">
        <div class="field"><label>Estado</label><select id="p-estado">${Object.entries(ESTADO_PROYECTO)
          .map(([k, v]) => `<option value="${k}" ${k === (datos.estado || 'planeacion') ? 'selected' : ''}>${v}</option>`)
          .join('')}</select></div>
        <div class="field"><label>Avance (%)</label><input id="p-avance" class="num" type="number" min="0" max="100" value="${
          datos.avance || 0
        }" /></div>
        <div class="field"><label>Presupuesto (MXN)</label><input id="p-presupuesto" class="num" type="number" min="0" step="0.01" value="${
          datos.presupuesto || ''
        }" placeholder="0.00" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>Fecha de inicio</label><input id="p-inicio" type="date" value="${fmtFechaInput(datos.fechaInicio)}" /></div>
        <div class="field"><label>Fin estimado</label><input id="p-fin" type="date" value="${fmtFechaInput(datos.fechaFinEstimada)}" /></div>
      </div>
      <div class="field" style="margin:0"><label>Notas</label><textarea id="p-notas" placeholder="Opcional">${escapar(datos.notas || '')}</textarea></div>`,
    footerHTML: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok>${icon('save', 16)} Guardar</button>`,
  });
  m.q('#p-nombre').focus();
  m.q('[data-ok]').addEventListener('click', async (e) => {
    const payload = {
      nombre: m.q('#p-nombre').value.trim(),
      cliente: m.q('#p-cliente').value.trim(),
      tipo: m.q('#p-tipo').value.trim() || 'Casa',
      ubicacion: m.q('#p-ubicacion').value.trim(),
      estado: m.q('#p-estado').value,
      avance: Number(m.q('#p-avance').value) || 0,
      presupuesto: Number(m.q('#p-presupuesto').value) || 0,
      fechaInicio: m.q('#p-inicio').value || '',
      fechaFinEstimada: m.q('#p-fin').value || '',
      notas: m.q('#p-notas').value.trim(),
    };
    if (!payload.nombre) {
      toast('El nombre del proyecto es obligatorio', 'err');
      return;
    }
    const fin = cargando(e.currentTarget, 'Guardando…');
    try {
      if (esEdicion) await api.actualizarProyecto(p.id, payload);
      else await api.crearProyecto(payload);
      m.close();
      toast(esEdicion ? 'Proyecto actualizado' : 'Proyecto creado', 'ok');
      alGuardar && alGuardar();
    } catch (err) {
      fin();
      toast(err.message || 'No se pudo guardar', 'err');
    }
  });
}

function metaItem(ic, label, valor) {
  return `<div class="meta-item">
    <div class="meta-ic">${icon(ic, 16)}</div>
    <div><div class="meta-lbl">${escapar(label)}</div><div class="meta-val">${escapar(valor)}</div></div>
  </div>`;
}
