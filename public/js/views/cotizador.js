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
  ESTADO_COT,
} from '../ui.js';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function calcularLocal(cot) {
  const partidas = (cot.partidas || []).map((p) => {
    const cantidad = Number(p.cantidad) || 0;
    const precioUnitario = Number(p.precioUnitario) || 0;
    return { ...p, cantidad, precioUnitario, importe: r2(cantidad * precioUnitario) };
  });
  const subtotalMateriales = r2(partidas.reduce((s, p) => s + p.importe, 0));
  const manoObra = r2(subtotalMateriales * ((Number(cot.manoObraPct) || 0) / 100));
  const indirectos = r2((subtotalMateriales + manoObra) * ((Number(cot.indirectosPct) || 0) / 100));
  const baseUtilidad = subtotalMateriales + manoObra + indirectos;
  const utilidad = r2(baseUtilidad * ((Number(cot.utilidadPct) || 0) / 100));
  const subtotal = r2(baseUtilidad + utilidad - (Number(cot.descuento) || 0));
  const iva = r2(subtotal * ((cot.ivaPct != null ? Number(cot.ivaPct) : 16) / 100));
  const total = r2(subtotal + iva);
  return { partidas, subtotalMateriales, manoObra, indirectos, utilidad, subtotal, iva, total };
}

export async function render({ root, header, params }) {
  const sub = params && params[0];
  if (sub) return editor(root, header, sub);
  return lista(root, header);
}

/* --------------------------------- Lista ---------------------------------- */
async function lista(root, header) {
  header.set({
    eyebrow: 'Presupuestos',
    titulo: 'Cotizador',
    acciones: [
      { label: 'Nueva cotización', icon: 'plus', variant: 'amber', onClick: () => (location.hash = '#cotizador/nuevo') },
    ],
  });

  root.innerHTML = `<div class="card"><div class="card-b" id="cot-list" style="padding:0"><div class="empty"><span class="spinner dark"></span></div></div></div>`;
  const cont = root.querySelector('#cot-list');

  let cots, proyectos;
  try {
    [cots, proyectos] = await Promise.all([api.cotizaciones(), api.proyectos()]);
  } catch (e) {
    cont.innerHTML = vacio('Error al cargar', e.message, 'alert');
    return;
  }
  const nombreProy = (id) => (proyectos.find((p) => p.id === id) || {}).nombre || '';

  if (!cots.length) {
    cont.innerHTML = vacio(
      'Aún no hay cotizaciones',
      'Crea tu primera cotización para calcular materiales, mano de obra e indirectos.',
      'cotizador'
    );
    return;
  }

  cont.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>Folio</th><th>Concepto</th><th>Cliente / Proyecto</th>
      <th class="num">Total</th><th>Estado</th><th>Fecha</th><th></th>
    </tr></thead>
    <tbody>${cots
      .map(
        (c) => `<tr>
        <td class="num muted" style="font-size:12px">${escapar(c.folio || '—')}</td>
        <td style="font-weight:600">${escapar(c.nombre)}</td>
        <td>${escapar(c.cliente || '—')}${
          c.proyectoId ? `<div class="muted" style="font-size:11.5px">${escapar(nombreProy(c.proyectoId))}</div>` : ''
        }</td>
        <td class="num" style="font-weight:700">${fmtMXN(c.total)}</td>
        <td>${chip(c.estado, ESTADO_COT)}</td>
        <td class="muted" style="font-size:12px">${fmtFecha(c.fecha)}</td>
        <td><div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn ghost icon-btn" data-abrir="${c.id}" title="Abrir">${icon('edit', 16)}</button>
          <button class="btn ghost icon-btn" data-borrar="${c.id}" title="Eliminar">${icon('trash', 16)}</button>
        </div></td>
      </tr>`
      )
      .join('')}</tbody>
  </table></div>`;

  cont.querySelectorAll('[data-abrir]').forEach((b) =>
    b.addEventListener('click', () => (location.hash = `#cotizador/${b.dataset.abrir}`))
  );
  cont.querySelectorAll('[data-borrar]').forEach((b) =>
    b.addEventListener('click', async () => {
      const c = cots.find((x) => x.id === b.dataset.borrar);
      const ok = await confirmar({
        title: 'Eliminar cotización',
        message: `¿Eliminar la cotización "${c.nombre}" (${c.folio})?`,
        confirmText: 'Eliminar',
      });
      if (!ok) return;
      try {
        await api.borrarCotizacion(c.id);
        toast('Cotización eliminada', 'ok');
        lista(root, header);
      } catch (e) {
        toast(e.message, 'err');
      }
    })
  );
}

/* -------------------------------- Editor ---------------------------------- */
async function editor(root, header, sub) {
  root.innerHTML = `<div class="empty"><span class="spinner dark"></span></div>`;

  let proyectos = [];
  let config = {};
  try {
    [proyectos, config] = await Promise.all([api.proyectos(), api.configuracion()]);
  } catch (e) {
    root.innerHTML = vacio('Error al cargar', e.message, 'alert');
    return;
  }
  const d = config.defaults || { manoObraPct: 35, indirectosPct: 12, utilidadPct: 15 };

  let cot;
  if (sub === 'nuevo') {
    cot = {
      id: null,
      folio: '',
      nombre: '',
      cliente: '',
      proyectoId: '',
      estado: 'borrador',
      fecha: new Date().toISOString(),
      notas: '',
      partidas: [],
      manoObraPct: d.manoObraPct,
      indirectosPct: d.indirectosPct,
      utilidadPct: d.utilidadPct,
      ivaPct: config.ivaPct != null ? config.ivaPct : 16,
      descuento: 0,
    };
  } else {
    try {
      cot = await api.cotizacion(sub);
    } catch (e) {
      root.innerHTML = vacio('Cotización no encontrada', e.message, 'alert');
      return;
    }
  }

  header.set({
    eyebrow: cot.folio ? `Cotización ${cot.folio}` : 'Nueva cotización',
    titulo: cot.id ? cot.nombre || 'Cotización' : 'Nueva cotización',
    acciones: [
      { label: 'Volver', icon: 'back', variant: 'ghost', onClick: () => (location.hash = '#cotizador') },
      { label: 'Imprimir', icon: 'printer', variant: '', id: 'cot-print-btn', onClick: () => imprimir(leerTodo(), config, proyectos) },
      { label: 'Guardar', icon: 'save', variant: 'amber', id: 'cot-save-btn', onClick: guardar },
    ],
  });

  const optProy = `<option value="">— Sin proyecto —</option>${proyectos
    .map((p) => `<option value="${p.id}" ${p.id === cot.proyectoId ? 'selected' : ''}>${escapar(p.nombre)}</option>`)
    .join('')}`;
  const optEstado = Object.entries(ESTADO_COT)
    .map(([k, v]) => `<option value="${k}" ${k === cot.estado ? 'selected' : ''}>${v}</option>`)
    .join('');

  root.innerHTML = `<div class="cot-editor">
    <div class="cot-main">
      <div class="card">
        <div class="card-b">
          <div class="field"><label>Concepto / Título</label><input id="c-nombre" value="${escapar(
            cot.nombre
          )}" placeholder="Ej. Construcción de casa habitación 120 m²" /></div>
          <div class="row3">
            <div class="field"><label>Cliente</label><input id="c-cliente" value="${escapar(cot.cliente)}" placeholder="Nombre del cliente" /></div>
            <div class="field"><label>Proyecto vinculado</label><select id="c-proyecto">${optProy}</select></div>
            <div class="field"><label>Estado</label><select id="c-estado">${optEstado}</select></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-h">
          <h3>Partidas</h3>
          <div style="display:flex;gap:8px">
            <button class="btn sm" id="c-add-cat">${icon('materiales', 15)} Del catálogo</button>
            <button class="btn sm" id="c-add-man">${icon('plus', 15)} Partida manual</button>
          </div>
        </div>
        <div class="card-b">
          <div class="lineitem li-head">
            <div>Descripción</div><div>Cantidad</div><div class="li-price">P. unitario</div><div>Importe</div><div></div>
          </div>
          <div id="c-partidas"></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-b">
          <div class="field" style="margin:0"><label>Notas / Condiciones</label><textarea id="c-notas" placeholder="Vigencia, condiciones de pago, tiempos de entrega…">${escapar(
            cot.notas || ''
          )}</textarea></div>
        </div>
      </div>
    </div>

    <aside class="cot-aside">
      <div class="card cot-totales">
        <div class="card-h"><h3>Resumen</h3></div>
        <div class="card-b">
          <div class="totales">
            <div class="line"><span>Subtotal materiales</span><span class="num" id="t-submat">$0.00</span></div>
            <div class="line">
              <span>Mano de obra <input class="pct" id="c-mo" type="number" min="0" step="1" value="${cot.manoObraPct}" />%</span>
              <span class="num" id="t-mo">$0.00</span>
            </div>
            <div class="line">
              <span>Indirectos <input class="pct" id="c-ind" type="number" min="0" step="1" value="${cot.indirectosPct}" />%</span>
              <span class="num" id="t-ind">$0.00</span>
            </div>
            <div class="line">
              <span>Utilidad <input class="pct" id="c-uti" type="number" min="0" step="1" value="${cot.utilidadPct}" />%</span>
              <span class="num" id="t-uti">$0.00</span>
            </div>
            <div class="line">
              <span>Descuento</span>
              <span class="inline-suffix" style="max-width:130px"><input class="num" id="c-desc" type="number" min="0" step="0.01" value="${
                cot.descuento || 0
              }" /></span>
            </div>
            <div class="line"><span>Subtotal</span><span class="num" id="t-subtotal">$0.00</span></div>
            <div class="line">
              <span>IVA <input class="pct" id="c-iva" type="number" min="0" step="1" value="${cot.ivaPct}" />%</span>
              <span class="num" id="t-iva">$0.00</span>
            </div>
            <div class="line total"><span>Total</span><span class="num" id="t-total">$0.00</span></div>
          </div>
        </div>
      </div>
    </aside>
  </div>`;

  // --------- Lógica interna ----------
  function leerPartidasDOM() {
    return [...root.querySelectorAll('#c-partidas .lineitem')].map((row) => ({
      materialId: row.dataset.materialId || null,
      descripcion: row.querySelector('.p-desc').value.trim(),
      unidad: row.querySelector('.p-uni').value.trim() || 'pieza',
      cantidad: Number(row.querySelector('.p-cant').value) || 0,
      precioUnitario: Number(row.querySelector('.p-precio').value) || 0,
    }));
  }

  function leerTodo() {
    return {
      id: cot.id,
      folio: cot.folio,
      nombre: root.querySelector('#c-nombre').value.trim(),
      cliente: root.querySelector('#c-cliente').value.trim(),
      proyectoId: root.querySelector('#c-proyecto').value || null,
      estado: root.querySelector('#c-estado').value,
      fecha: cot.fecha,
      notas: root.querySelector('#c-notas').value.trim(),
      partidas: leerPartidasDOM(),
      manoObraPct: Number(root.querySelector('#c-mo').value) || 0,
      indirectosPct: Number(root.querySelector('#c-ind').value) || 0,
      utilidadPct: Number(root.querySelector('#c-uti').value) || 0,
      ivaPct: Number(root.querySelector('#c-iva').value) || 0,
      descuento: Number(root.querySelector('#c-desc').value) || 0,
    };
  }

  function filaPartida(p) {
    return `<div class="lineitem" data-material-id="${p.materialId || ''}">
      <div>
        <input class="p-desc" value="${escapar(p.descripcion || '')}" placeholder="Descripción de la partida" />
        <input class="p-uni" value="${escapar(p.unidad || 'pieza')}" placeholder="unidad" style="margin-top:4px;font-size:11px;max-width:120px;color:var(--ink-3)" />
      </div>
      <input class="p-cant num" type="number" min="0" step="0.01" value="${
        p.cantidad != null ? p.cantidad : ''
      }" placeholder="0" />
      <input class="p-precio num li-price" type="number" min="0" step="0.01" value="${
        p.precioUnitario != null ? p.precioUnitario : ''
      }" placeholder="0.00" />
      <div class="num p-importe" style="font-weight:600">$0.00</div>
      <button class="btn ghost icon-btn p-del" title="Quitar">${icon('x', 16)}</button>
    </div>`;
  }

  function renderPartidas() {
    const cont = root.querySelector('#c-partidas');
    if (!cot.partidas.length) {
      cont.innerHTML = `<div class="muted" style="padding:18px 0;text-align:center;font-size:13px">Sin partidas. Agrega materiales del catálogo o captura una partida manual.</div>`;
    } else {
      cont.innerHTML = cot.partidas.map(filaPartida).join('');
      cont.querySelectorAll('.p-del').forEach((b) =>
        b.addEventListener('click', () => {
          cot.partidas = leerPartidasDOM();
          const idx = [...cont.querySelectorAll('.lineitem')].indexOf(b.closest('.lineitem'));
          cot.partidas.splice(idx, 1);
          renderPartidas();
        })
      );
    }
    recompute();
  }

  function recompute() {
    const datos = leerTodo();
    const t = calcularLocal(datos);
    const rows = [...root.querySelectorAll('#c-partidas .lineitem')];
    rows.forEach((row, i) => {
      const cell = row.querySelector('.p-importe');
      if (cell && t.partidas[i]) cell.textContent = fmtMXN(t.partidas[i].importe);
    });
    root.querySelector('#t-submat').textContent = fmtMXN(t.subtotalMateriales);
    root.querySelector('#t-mo').textContent = fmtMXN(t.manoObra);
    root.querySelector('#t-ind').textContent = fmtMXN(t.indirectos);
    root.querySelector('#t-uti').textContent = fmtMXN(t.utilidad);
    root.querySelector('#t-subtotal').textContent = fmtMXN(t.subtotal);
    root.querySelector('#t-iva').textContent = fmtMXN(t.iva);
    root.querySelector('#t-total').textContent = fmtMXN(t.total);
  }

  root.addEventListener('input', (e) => {
    if (e.target.matches('.p-cant, .p-precio, .pct, #c-desc')) recompute();
  });

  root.querySelector('#c-add-man').addEventListener('click', () => {
    cot.partidas = leerPartidasDOM();
    cot.partidas.push({ descripcion: '', unidad: 'pieza', cantidad: 1, precioUnitario: 0 });
    renderPartidas();
  });
  root.querySelector('#c-add-cat').addEventListener('click', () => abrirPicker());

  function abrirPicker() {
    const m = openModal({
      title: 'Agregar del catálogo',
      wide: true,
      bodyHTML: `
        <div class="toolbar" style="margin-bottom:8px">
          <div class="search" style="max-width:none">${icon('search', 17)}<input id="pk-q" type="search" placeholder="Buscar material…" /></div>
        </div>
        <div id="pk-list" style="max-height:48vh;overflow:auto"><div class="empty"><span class="spinner dark"></span></div></div>`,
      footerHTML: `<span class="muted" id="pk-count" style="margin-right:auto;font-size:12px;align-self:center"></span><button class="btn primary" data-close>Listo</button>`,
    });
    let agregados = 0;
    let deb;
    const buscar = async () => {
      const q = m.q('#pk-q').value.trim();
      const lista = m.q('#pk-list');
      try {
        const items = await api.materiales({ q });
        if (!items.length) {
          lista.innerHTML = vacio('Sin materiales', 'Prueba con otra búsqueda.', 'materiales');
          return;
        }
        lista.innerHTML = `<div class="candidates">${items
          .slice(0, 50)
          .map(
            (it) => `<div class="candidate">
              <div class="c-name"><div style="font-weight:600">${escapar(it.nombre)}</div>
                <div class="muted" style="font-size:11px">${escapar(it.categoria)} · ${escapar(it.unidad)}</div></div>
              <div style="display:flex;align-items:center;gap:12px">
                <div class="c-price">${fmtMXN(it.precio)}</div>
                <button class="btn amber sm" data-add='${escapar(JSON.stringify({ id: it.id, n: it.nombre, u: it.unidad, p: it.precio }))}'>${icon(
              'plus',
              15
            )}</button>
              </div>
            </div>`
          )
          .join('')}</div>`;
        lista.querySelectorAll('[data-add]').forEach((b) =>
          b.addEventListener('click', () => {
            const it = JSON.parse(b.dataset.add);
            cot.partidas = leerPartidasDOM();
            cot.partidas.push({
              materialId: it.id,
              descripcion: it.n,
              unidad: it.u,
              cantidad: 1,
              precioUnitario: it.p,
            });
            renderPartidas();
            agregados++;
            m.q('#pk-count').textContent = `${agregados} agregada(s)`;
            toast(`Agregado: ${it.n}`, 'ok');
          })
        );
      } catch (e) {
        lista.innerHTML = vacio('Error', e.message, 'alert');
      }
    };
    m.q('#pk-q').addEventListener('input', () => {
      clearTimeout(deb);
      deb = setTimeout(buscar, 200);
    });
    m.q('#pk-q').focus();
    buscar();
  }

  async function guardar() {
    const datos = leerTodo();
    if (!datos.nombre) {
      toast('Escribe un concepto / título para la cotización', 'err');
      return;
    }
    const boton = document.querySelector('#cot-save-btn');
    const fin = cargando(boton, 'Guardando…');
    try {
      if (cot.id) {
        const guardada = await api.actualizarCotizacion(cot.id, datos);
        cot = guardada;
        fin();
        recompute();
        toast(`Cotización guardada (${guardada.folio})`, 'ok');
      } else {
        const guardada = await api.crearCotizacion(datos);
        toast(`Cotización creada (${guardada.folio})`, 'ok');
        location.hash = `#cotizador/${guardada.id}`;
      }
    } catch (e) {
      fin();
      toast(e.message || 'No se pudo guardar', 'err');
    }
  }

  // expose for header actions defined before closures
  root._leerTodo = leerTodo;
  renderPartidas();
}

/* -------------------------------- Imprimir -------------------------------- */
function imprimir(cot, config, proyectos) {
  const t = calcularLocal(cot);
  const emp = (config && config.empresa) || {};
  const proy = proyectos.find((p) => p.id === cot.proyectoId);
  const win = window.open('', '_blank');
  if (!win) {
    toast('Permite las ventanas emergentes para imprimir/exportar.', 'err');
    return;
  }
  const filas = t.partidas
    .map(
      (p, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${escapar(p.descripcion || '')}</td>
      <td class="c">${escapar(p.unidad || '')}</td>
      <td class="r">${(Number(p.cantidad) || 0).toLocaleString('es-MX')}</td>
      <td class="r">${fmtMXN(p.precioUnitario)}</td>
      <td class="r">${fmtMXN(p.importe)}</td>
    </tr>`
    )
    .join('');

  const linea = (l, v, fuerte) =>
    `<tr><td colspan="5" class="r ${fuerte ? 'b' : ''}">${l}</td><td class="r ${fuerte ? 'b' : ''}">${v}</td></tr>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>${escapar(cot.folio || 'Cotización')} — ${escapar(cot.nombre || '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #14171c; margin: 0; padding: 40px; font-size: 13px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #232a32; padding-bottom: 16px; margin-bottom: 6px; }
    .emp h1 { font-size: 20px; margin: 0 0 4px; }
    .emp p { margin: 1px 0; color: #525a63; font-size: 12px; }
    .doc { text-align: right; }
    .doc .folio { font-size: 18px; font-weight: 800; color: #b97c00; }
    .doc .badge { display: inline-block; background: #f5a300; color: #2a1d00; padding: 3px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; text-transform: uppercase; margin-top: 6px; }
    .meta { display: flex; gap: 40px; margin: 18px 0; }
    .meta div b { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #8a929b; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #232a32; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e5e9; }
    td.r, th.r { text-align: right; } td.c, th.c { text-align: center; }
    tfoot td { border: none; padding: 5px 10px; }
    tfoot .b { font-weight: 700; }
    tfoot tr:last-child td { font-size: 16px; border-top: 2px solid #232a32; padding-top: 10px; }
    .notas { margin-top: 22px; padding: 12px 14px; background: #f5f6f8; border-left: 3px solid #f5a300; font-size: 12px; color: #525a63; white-space: pre-wrap; }
    .foot { margin-top: 40px; text-align: center; color: #8a929b; font-size: 11px; }
    @media print { body { padding: 0; } .noprint { display: none; } }
    .noprint { text-align: center; margin-bottom: 16px; }
    .noprint button { background: #232a32; color: #fff; border: 0; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; }
  </style></head><body>
  <div class="noprint"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
  <div class="head">
    <div class="emp">
      <h1>${escapar(emp.nombre || 'Mi Constructora')}</h1>
      ${emp.rfc ? `<p>RFC: ${escapar(emp.rfc)}</p>` : ''}
      ${emp.direccion ? `<p>${escapar(emp.direccion)}</p>` : ''}
      ${emp.telefono ? `<p>Tel: ${escapar(emp.telefono)}</p>` : ''}
      ${emp.correo ? `<p>${escapar(emp.correo)}</p>` : ''}
    </div>
    <div class="doc">
      <div class="folio">${escapar(cot.folio || 'COTIZACIÓN')}</div>
      <div class="badge">${escapar(ESTADO_COT[cot.estado] || cot.estado)}</div>
    </div>
  </div>
  <div class="meta">
    <div><b>Cliente</b>${escapar(cot.cliente || '—')}</div>
    ${proy ? `<div><b>Proyecto</b>${escapar(proy.nombre)}</div>` : ''}
    <div><b>Fecha</b>${fmtFecha(cot.fecha)}</div>
  </div>
  <h2 style="font-size:15px;margin:6px 0 0">${escapar(cot.nombre || '')}</h2>
  <table>
    <thead><tr><th class="c">#</th><th>Descripción</th><th class="c">Unidad</th><th class="r">Cant.</th><th class="r">P. Unit.</th><th class="r">Importe</th></tr></thead>
    <tbody>${filas || '<tr><td colspan="6" class="c">Sin partidas</td></tr>'}</tbody>
    <tfoot>
      ${linea('Subtotal materiales', fmtMXN(t.subtotalMateriales))}
      ${cot.manoObraPct ? linea(`Mano de obra (${cot.manoObraPct}%)`, fmtMXN(t.manoObra)) : ''}
      ${cot.indirectosPct ? linea(`Indirectos (${cot.indirectosPct}%)`, fmtMXN(t.indirectos)) : ''}
      ${cot.utilidadPct ? linea(`Utilidad (${cot.utilidadPct}%)`, fmtMXN(t.utilidad)) : ''}
      ${cot.descuento ? linea('Descuento', '-' + fmtMXN(cot.descuento)) : ''}
      ${linea('Subtotal', fmtMXN(t.subtotal), true)}
      ${linea(`IVA (${cot.ivaPct}%)`, fmtMXN(t.iva))}
      ${linea('TOTAL', fmtMXN(t.total), true)}
    </tfoot>
  </table>
  ${cot.notas ? `<div class="notas">${escapar(cot.notas)}</div>` : ''}
  <div class="foot">Cotización generada el ${fmtFecha(new Date().toISOString())} · Precios en MXN · Vigencia sujeta a confirmación.</div>
  </body></html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
}
