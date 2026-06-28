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
  sparkline,
} from '../ui.js';

const UNIDADES = ['pieza', 'm', 'm2', 'm3', 'kg', 'ton', 'saco', 'bulto', 'bote', 'litro', 'galón', 'rollo', 'lámina', 'millar', 'juego'];

let S = { q: '', categoria: '', materiales: [], categorias: [], cargando: false };
let debounce;

export async function render({ root, header }) {
  S = { q: '', categoria: '', materiales: [], categorias: [], cargando: false };

  header.set({
    eyebrow: 'Catálogo de precios',
    titulo: 'Materiales',
    acciones: [
      { label: 'Buscar en internet', icon: 'globe', variant: 'ghost', onClick: abrirBusquedaInternet },
      { label: 'Actualizar precios', icon: 'refresh', variant: '', id: 'btn-refresh-all', onClick: refrescarTodos },
      { label: 'Agregar material', icon: 'plus', variant: 'amber', onClick: () => abrirFormMaterial(null) },
    ],
  });

  root.innerHTML = `
    <div class="toolbar">
      <div class="search">
        ${icon('search', 17)}
        <input id="mat-q" type="search" placeholder="Buscar por nombre o SKU…" autocomplete="off" />
      </div>
      <div class="pill-tabs" id="mat-cats"></div>
      <div style="flex:1"></div>
      <button class="btn sm" id="mat-import">${icon('upload', 16)} Importar CSV</button>
      <button class="btn sm" id="mat-export">${icon('download', 16)} Exportar</button>
      <input type="file" id="mat-file" accept=".csv,text/csv" hidden />
    </div>
    <div class="card">
      <div class="card-b" id="mat-tabla" style="padding:0">
        <div class="empty"><span class="spinner dark"></span></div>
      </div>
    </div>`;

  root.querySelector('#mat-q').addEventListener('input', (e) => {
    S.q = e.target.value;
    clearTimeout(debounce);
    debounce = setTimeout(cargarMateriales, 220);
  });
  root.querySelector('#mat-export').addEventListener('click', exportarCSV);
  root.querySelector('#mat-import').addEventListener('click', () => root.querySelector('#mat-file').click());
  root.querySelector('#mat-file').addEventListener('change', importarCSV);

  contenedor = root;
  await cargarCategorias();
  await cargarMateriales();
}

let contenedor;

async function cargarCategorias() {
  try {
    S.categorias = await api.categorias();
  } catch {
    S.categorias = [];
  }
  pintarCategorias();
}

function pintarCategorias() {
  const cont = contenedor.querySelector('#mat-cats');
  if (!cont) return;
  const total = S.categorias.reduce((s, c) => s + c.total, 0);
  const tab = (val, label, n) =>
    `<button data-cat="${escapar(val)}" class="${S.categoria === val ? 'active' : ''}">${escapar(label)}${
      n != null ? ` <span class="muted">${n}</span>` : ''
    }</button>`;
  cont.innerHTML =
    tab('', 'Todas', total) + S.categorias.map((c) => tab(c.nombre, c.nombre, c.total)).join('');
  cont.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      S.categoria = b.dataset.cat;
      pintarCategorias();
      cargarMateriales();
    })
  );
}

async function cargarMateriales() {
  const cont = contenedor.querySelector('#mat-tabla');
  try {
    S.materiales = await api.materiales({ q: S.q, categoria: S.categoria });
  } catch (e) {
    cont.innerHTML = vacio('Error al cargar', e.message, 'alert');
    return;
  }
  pintarTabla();
}

function pintarTabla() {
  const cont = contenedor.querySelector('#mat-tabla');
  if (!S.materiales.length) {
    cont.innerHTML = vacio(
      S.q || S.categoria ? 'Sin resultados' : 'Catálogo vacío',
      S.q || S.categoria ? 'Prueba con otra búsqueda o categoría.' : 'Agrega tu primer material o búscalo en internet.',
      'materiales'
    );
    return;
  }
  cont.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>SKU</th><th>Material</th><th>Categoría</th><th>Unidad</th>
      <th class="num">Precio</th><th>Tendencia</th><th>Actualizado</th><th></th>
    </tr></thead>
    <tbody>${S.materiales.map(filaMaterial).join('')}</tbody>
  </table></div>`;

  cont.querySelectorAll('[data-accion]').forEach((b) =>
    b.addEventListener('click', () => accionFila(b.dataset.accion, b.dataset.id, b))
  );
}

function filaMaterial(m) {
  const precios = (m.historial || []).map((h) => h.precio);
  const tieneFuente = !!m.urlFuente;
  return `<tr data-row="${m.id}">
    <td class="num muted" style="font-size:12px">${escapar(m.sku || '—')}</td>
    <td>
      <div style="font-weight:600">${escapar(m.nombre)}</div>
      ${m.notas ? `<div class="muted" style="font-size:11.5px">${escapar(m.notas)}</div>` : ''}
    </td>
    <td><span class="chip cat">${escapar(m.categoria)}</span></td>
    <td class="muted">${escapar(m.unidad)}</td>
    <td class="num" style="font-weight:600">${fmtMXN(m.precio)}</td>
    <td>${sparkline(precios)}</td>
    <td class="muted" style="font-size:12px">
      ${fmtFecha(m.ultimaActualizacion)}
      ${
        tieneFuente
          ? `<a href="${escapar(m.urlFuente)}" target="_blank" rel="noopener" title="Ver fuente" style="color:var(--blue);display:inline-flex;vertical-align:middle;margin-left:4px">${icon(
              'external',
              13
            )}</a>`
          : ''
      }
    </td>
    <td>
      <div style="display:flex;gap:4px;justify-content:flex-end">
        ${
          tieneFuente
            ? `<button class="btn ghost icon-btn" data-accion="refrescar" data-id="${m.id}" title="Actualizar desde fuente">${icon(
                'refresh',
                16
              )}</button>`
            : ''
        }
        <button class="btn ghost icon-btn" data-accion="editar" data-id="${m.id}" title="Editar">${icon('edit', 16)}</button>
        <button class="btn ghost icon-btn" data-accion="borrar" data-id="${m.id}" title="Eliminar">${icon('trash', 16)}</button>
      </div>
    </td>
  </tr>`;
}

function accionFila(accion, id, boton) {
  const m = S.materiales.find((x) => x.id === id);
  if (!m) return;
  if (accion === 'editar') return abrirFormMaterial(m);
  if (accion === 'borrar') return borrarMaterial(m);
  if (accion === 'refrescar') return refrescarUno(m, boton);
}

async function refrescarUno(m, boton) {
  const fin = cargando(boton);
  try {
    const actualizado = await api.refrescarMaterial(m.id);
    const cambio = actualizado.precio !== m.precio;
    Object.assign(m, actualizado);
    pintarTabla();
    toast(
      cambio
        ? `${m.nombre}: ${fmtMXN(actualizado.precio)} (actualizado)`
        : `${m.nombre}: sin cambios (${fmtMXN(actualizado.precio)})`,
      'ok'
    );
  } catch (e) {
    fin();
    toast(e.message || 'No se pudo actualizar', 'err');
  }
}

async function refrescarTodos(ev, boton) {
  const b = boton || document.querySelector('#btn-refresh-all');
  const fin = cargando(b, 'Actualizando…');
  try {
    const r = await api.refrescarTodos(S.categoria || undefined);
    await cargarMateriales();
    fin();
    if (r.revisados === 0) {
      toast('Ningún material tiene fuente en línea para actualizar. Agrega una URL de fuente al material.', 'err');
    } else {
      toast(`Revisados ${r.revisados} · ${r.cambios} con cambio de precio.`, 'ok');
    }
  } catch (e) {
    fin();
    toast(e.message || 'Error al actualizar precios', 'err');
  }
}

async function borrarMaterial(m) {
  const ok = await confirmar({
    title: 'Eliminar material',
    message: `¿Eliminar "${m.nombre}" del catálogo? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
  });
  if (!ok) return;
  try {
    await api.borrarMaterial(m.id);
    toast('Material eliminado', 'ok');
    await cargarCategorias();
    await cargarMateriales();
  } catch (e) {
    toast(e.message || 'No se pudo eliminar', 'err');
  }
}

/* ----------------------------- Formulario M ------------------------------- */
function abrirFormMaterial(m, prefill) {
  const datos = m || prefill || {};
  const esEdicion = !!m;
  const listaCats = [...new Set(S.categorias.map((c) => c.nombre))];
  const m_ = openModal({
    title: esEdicion ? 'Editar material' : 'Nuevo material',
    bodyHTML: `
      <datalist id="dl-cats">${listaCats.map((c) => `<option value="${escapar(c)}"></option>`).join('')}</datalist>
      <datalist id="dl-uni">${UNIDADES.map((u) => `<option value="${u}"></option>`).join('')}</datalist>
      <div class="field">
        <label>Nombre del material *</label>
        <input id="f-nombre" value="${escapar(datos.nombre || '')}" placeholder="Ej. Cemento gris 50 kg" />
      </div>
      <div class="row2">
        <div class="field"><label>SKU / Clave</label><input id="f-sku" value="${escapar(datos.sku || '')}" placeholder="Opcional" /></div>
        <div class="field"><label>Categoría</label><input id="f-categoria" list="dl-cats" value="${escapar(datos.categoria || '')}" placeholder="Ej. Cemento" /></div>
      </div>
      <div class="row2">
        <div class="field"><label>Unidad</label><input id="f-unidad" list="dl-uni" value="${escapar(datos.unidad || 'pieza')}" /></div>
        <div class="field"><label>Precio (MXN)</label><div class="inline-suffix"><input id="f-precio" class="num" type="number" min="0" step="0.01" value="${
          datos.precio != null ? datos.precio : ''
        }" placeholder="0.00" /><span>MXN</span></div></div>
      </div>
      <div class="field">
        <label>URL de fuente (para actualizar precio automáticamente)</label>
        <input id="f-url" value="${escapar(datos.urlFuente || '')}" placeholder="https://… (opcional)" />
      </div>
      <div class="field"><label>Notas</label><input id="f-notas" value="${escapar(datos.notas || '')}" placeholder="Opcional" /></div>`,
    footerHTML: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-guardar>${icon(
      'save',
      16
    )} Guardar</button>`,
  });

  m_.q('#f-nombre').focus();
  m_.q('[data-guardar]').addEventListener('click', async (e) => {
    const payload = {
      nombre: m_.q('#f-nombre').value.trim(),
      sku: m_.q('#f-sku').value.trim(),
      categoria: m_.q('#f-categoria').value.trim() || 'Otros',
      unidad: m_.q('#f-unidad').value.trim() || 'pieza',
      precio: Number(m_.q('#f-precio').value) || 0,
      urlFuente: m_.q('#f-url').value.trim(),
      notas: m_.q('#f-notas').value.trim(),
    };
    if (!payload.nombre) {
      toast('El nombre es obligatorio', 'err');
      return;
    }
    const fin = cargando(e.currentTarget, 'Guardando…');
    try {
      if (esEdicion) {
        await api.actualizarMaterial(m.id, payload);
      } else {
        await api.crearMaterial(payload);
      }
      m_.close();
      toast(esEdicion ? 'Material actualizado' : 'Material agregado', 'ok');
      await cargarCategorias();
      await cargarMateriales();
    } catch (err) {
      fin();
      toast(err.message || 'No se pudo guardar', 'err');
    }
  });
}

/* -------------------------- Búsqueda en internet -------------------------- */
function abrirBusquedaInternet() {
  const m = openModal({
    title: 'Buscar precio en internet',
    wide: true,
    bodyHTML: `
      <p class="muted" style="margin:0 0 14px;font-size:13px;line-height:1.5">
        Busca un material en catálogos públicos de construcción en México y agrégalo con su precio de referencia.
      </p>
      <div class="toolbar" style="margin-bottom:0">
        <div class="search" style="max-width:none">
          ${icon('search', 17)}
          <input id="bi-q" type="search" placeholder="Ej. cemento, varilla 3/8, impermeabilizante…" />
        </div>
        <button class="btn primary" id="bi-go">${icon('globe', 16)} Buscar</button>
      </div>
      <div id="bi-res" style="margin-top:8px"></div>`,
    footerHTML: `<button class="btn" data-close>Cerrar</button>`,
  });

  const input = m.q('#bi-q');
  const res = m.q('#bi-res');
  input.focus();

  const buscar = async (e) => {
    const q = input.value.trim();
    if (q.length < 3) {
      toast('Escribe al menos 3 caracteres', 'err');
      return;
    }
    const boton = m.q('#bi-go');
    const fin = cargando(boton, 'Buscando…');
    res.innerHTML = '';
    try {
      const data = await api.buscarPrecio(q);
      fin();
      const cands = data.candidatos || [];
      if (!cands.length) {
        res.innerHTML = vacio(
          'Sin resultados en línea',
          'No se encontraron precios en los catálogos públicos. Puedes agregarlo manualmente.',
          'globe'
        );
        return;
      }
      res.innerHTML = `<div class="candidates">${cands
        .map(
          (c, i) => `<div class="candidate">
            <div class="c-name">
              <div style="font-weight:600">${escapar(c.nombre)}</div>
              <div class="muted" style="font-size:11px">${escapar(c.fuente || 'Catálogo')}${
            c.url
              ? ` · <a href="${escapar(c.url)}" target="_blank" rel="noopener">ver fuente ${icon('external', 11)}</a>`
              : ''
          }</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px">
              <div class="c-price">${fmtMXN(c.precio)}</div>
              <button class="btn amber sm" data-usar="${i}">${icon('plus', 15)} Usar</button>
            </div>
          </div>`
        )
        .join('')}</div>`;
      res.querySelectorAll('[data-usar]').forEach((b) =>
        b.addEventListener('click', () => {
          const c = cands[Number(b.dataset.usar)];
          m.close();
          abrirFormMaterial(null, {
            nombre: c.nombre,
            precio: c.precio,
            urlFuente: c.url || '',
            categoria: '',
          });
        })
      );
    } catch (err) {
      fin();
      res.innerHTML = vacio('No se pudo completar la búsqueda', err.message, 'alert');
    }
  };

  m.q('#bi-go').addEventListener('click', buscar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscar();
  });
}

/* -------------------------------- CSV ------------------------------------- */
function celdaCSV(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportarCSV() {
  if (!S.materiales.length) {
    toast('No hay materiales para exportar', 'err');
    return;
  }
  const cols = ['sku', 'nombre', 'categoria', 'unidad', 'precio', 'moneda', 'fuente', 'ultimaActualizacion'];
  const lineas = [cols.join(',')];
  for (const m of S.materiales) {
    lineas.push(cols.map((c) => celdaCSV(m[c])).join(','));
  }
  const blob = new Blob(['\ufeff' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `materiales-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`${S.materiales.length} materiales exportados`, 'ok');
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function importarCSV(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  let text;
  try {
    text = await file.text();
  } catch {
    toast('No se pudo leer el archivo', 'err');
    return;
  }
  const rows = parseCSV(text.replace(/^\ufeff/, ''));
  if (!rows.length) {
    toast('El archivo está vacío', 'err');
    return;
  }
  const campos = ['nombre', 'categoria', 'unidad', 'precio', 'sku'];
  const cabecera = rows[0].map(norm);
  const tieneCabecera = cabecera.some((h) => campos.includes(h));
  let idx = { nombre: 0, categoria: 1, unidad: 2, precio: 3, sku: 4 };
  let datos = rows;
  if (tieneCabecera) {
    idx = {};
    campos.forEach((c) => {
      idx[c] = cabecera.indexOf(c);
    });
    datos = rows.slice(1);
  }
  const items = datos
    .map((r) => ({
      nombre: idx.nombre >= 0 ? (r[idx.nombre] || '').trim() : '',
      categoria: idx.categoria >= 0 ? (r[idx.categoria] || '').trim() : '',
      unidad: idx.unidad >= 0 ? (r[idx.unidad] || '').trim() : '',
      precio: idx.precio >= 0 ? Number(String(r[idx.precio] || '').replace(/[^0-9.]/g, '')) || 0 : 0,
      sku: idx.sku >= 0 ? (r[idx.sku] || '').trim() : '',
    }))
    .filter((x) => x.nombre);

  if (!items.length) {
    toast('No se encontraron materiales válidos (se requiere columna "nombre")', 'err');
    return;
  }
  try {
    const r = await api.importarMateriales(items);
    toast(`${r.agregados} materiales importados`, 'ok');
    await cargarCategorias();
    await cargarMateriales();
  } catch (err) {
    toast(err.message || 'No se pudo importar', 'err');
  }
}
