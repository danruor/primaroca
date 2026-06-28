import { api } from '../api.js';
import { icon, toast, escapar, cargando } from '../ui.js';

export async function render({ root, header }) {
  let cfg;
  try {
    cfg = await api.configuracion();
  } catch (e) {
    header.set({ eyebrow: 'Configuración', titulo: 'Ajustes', acciones: [] });
    root.innerHTML = `<div class="empty">${icon('alert', 40)}<h3>No se pudo cargar la configuración</h3><p>${escapar(
      e.message
    )}</p></div>`;
    return;
  }

  const emp = cfg.empresa || {};
  const def = cfg.defaults || {};
  const fuentes = cfg.fuentesPrecios || [];

  header.set({
    eyebrow: 'Configuración',
    titulo: 'Ajustes',
    acciones: [
      { label: 'Guardar cambios', icon: 'save', variant: 'amber', id: 'btn-guardar', onClick: guardar },
    ],
  });

  root.innerHTML = `
  <div class="grid two-col" style="gap:18px; align-items:start">

    <div class="card">
      <div class="card-h"><h3>Datos de la empresa</h3></div>
      <div class="card-b">
        <div class="field"><label>Nombre de la empresa</label>
          <input id="e-nombre" value="${escapar(emp.nombre || '')}" placeholder="Mi Constructora" /></div>
        <div class="row2">
          <div class="field"><label>RFC</label>
            <input id="e-rfc" value="${escapar(emp.rfc || '')}" placeholder="XAXX010101000" /></div>
          <div class="field"><label>Teléfono</label>
            <input id="e-telefono" value="${escapar(emp.telefono || '')}" placeholder="999 000 0000" /></div>
        </div>
        <div class="field"><label>Correo</label>
          <input id="e-correo" type="email" value="${escapar(emp.correo || '')}" placeholder="contacto@empresa.mx" /></div>
        <div class="field" style="margin:0"><label>Dirección</label>
          <textarea id="e-direccion" placeholder="Calle, número, colonia, ciudad…">${escapar(emp.direccion || '')}</textarea></div>
        <p class="muted" style="font-size:12px; margin:12px 0 0">Estos datos aparecen en el encabezado de tus cotizaciones impresas.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Valores por defecto del cotizador</h3></div>
      <div class="card-b">
        <p class="muted" style="font-size:12px; margin:0 0 14px">Se aplican automáticamente al crear una nueva cotización. Puedes ajustarlos en cada cotización.</p>
        <div class="row2">
          <div class="field"><label>Moneda</label>
            <select id="c-moneda">
              <option value="MXN"${(cfg.moneda || 'MXN') === 'MXN' ? ' selected' : ''}>MXN — Peso mexicano</option>
              <option value="USD"${cfg.moneda === 'USD' ? ' selected' : ''}>USD — Dólar</option>
            </select></div>
          <div class="field"><label>IVA</label>
            <div class="inline-suffix"><input id="c-iva" class="num" type="number" min="0" max="100" step="1" value="${
              cfg.ivaPct ?? 16
            }" /><span>%</span></div></div>
        </div>
        <div class="row3" style="margin-top:2px">
          <div class="field"><label>Mano de obra</label>
            <div class="inline-suffix"><input id="d-mano" class="num" type="number" min="0" step="1" value="${
              def.manoObraPct ?? 35
            }" /><span>%</span></div></div>
          <div class="field"><label>Indirectos</label>
            <div class="inline-suffix"><input id="d-ind" class="num" type="number" min="0" step="1" value="${
              def.indirectosPct ?? 12
            }" /><span>%</span></div></div>
          <div class="field"><label>Utilidad</label>
            <div class="inline-suffix"><input id="d-util" class="num" type="number" min="0" step="1" value="${
              def.utilidadPct ?? 15
            }" /><span>%</span></div></div>
        </div>
        <p class="muted" style="font-size:11.5px; margin:10px 0 0">Mano de obra, indirectos y utilidad se calculan como porcentaje sobre el costo de materiales.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-h">
        <h3>Precios de materiales</h3>
        <button class="btn ghost sm" id="btn-refrescar">${icon('refresh', 15)}<span>Actualizar todos</span></button>
      </div>
      <div class="card-b">
        <p class="muted" style="font-size:13px; margin:0 0 12px; line-height:1.5">
          El catálogo incluye precios de referencia del mercado mexicano. Puedes editarlos a mano en cualquier momento desde
          la pestaña <strong>Materiales</strong>, o intentar refrescarlos automáticamente desde fuentes públicas en línea.
        </p>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px">
          ${
            fuentes.length
              ? fuentes
                  .map(
                    (f) => `<div class="chip" style="align-self:flex-start">${icon('globe', 13)} ${escapar(
                      f.nombre || f.id
                    )}${f.activa ? '' : ' (inactiva)'}</div>`
                  )
                  .join('')
              : '<span class="muted" style="font-size:12px">Sin fuentes configuradas.</span>'
          }
        </div>
        <div class="card" style="box-shadow:none; border:1px dashed var(--line); background:transparent">
          <div class="card-b" style="padding:14px">
            <strong style="font-size:13px">Búsqueda avanzada (opcional)</strong>
            <p class="muted" style="font-size:12px; margin:6px 0 0; line-height:1.5">
              Para una búsqueda de precios más amplia puedes activar Google Custom Search definiendo las variables de entorno
              <code>SEARCH_API_KEY</code> y <code>SEARCH_ENGINE_ID</code> en Railway. Sin ellas, la actualización usa el
              catálogo público integrado.
            </p>
          </div>
        </div>
        <p class="muted" style="font-size:11.5px; margin:12px 0 0; line-height:1.5">
          ⚠️ Los precios en línea son <strong>referenciales</strong> y pueden variar por región, proveedor y volumen.
          Verifica siempre con tu proveedor antes de cerrar una cotización.
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Instalar en iPad / iPhone</h3></div>
      <div class="card-b">
        <p class="muted" style="font-size:13px; margin:0 0 10px; line-height:1.5">
          Esta app funciona como aplicación instalable. Para agregarla a la pantalla de inicio de tu iPad:
        </p>
        <ol style="margin:0; padding-left:20px; font-size:13px; line-height:1.7; color:var(--ink-2)">
          <li>Abre la app en <strong>Safari</strong>.</li>
          <li>Toca el botón <strong>Compartir</strong> ${icon('upload', 13)} (cuadro con flecha hacia arriba).</li>
          <li>Elige <strong>“Agregar a inicio”</strong>.</li>
          <li>Confirma el nombre y toca <strong>Agregar</strong>.</li>
        </ol>
        <p class="muted" style="font-size:12px; margin:12px 0 0">Se abrirá a pantalla completa, como una app nativa.</p>
      </div>
    </div>

  </div>`;

  // Refrescar todos los precios
  root.querySelector('#btn-refrescar').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const fin = cargando(btn, 'Actualizando…');
    try {
      const r = await api.refrescarTodos();
      const n = r?.actualizados ?? r?.cambios ?? 0;
      toast(n ? `Se actualizaron ${n} precios` : 'Precios revisados, sin cambios', 'ok');
    } catch (e) {
      toast('No se pudieron actualizar los precios', 'err');
      console.error(e);
    } finally {
      fin();
    }
  });
}

async function guardar() {
  const val = (id) => document.getElementById(id)?.value?.trim() ?? '';
  const numero = (id, def = 0) => {
    const n = Number(document.getElementById(id)?.value);
    return isNaN(n) ? def : n;
  };

  const payload = {
    empresa: {
      nombre: val('e-nombre'),
      rfc: val('e-rfc'),
      telefono: val('e-telefono'),
      correo: val('e-correo'),
      direccion: val('e-direccion'),
    },
    moneda: document.getElementById('c-moneda')?.value || 'MXN',
    ivaPct: numero('c-iva', 16),
    defaults: {
      manoObraPct: numero('d-mano', 35),
      indirectosPct: numero('d-ind', 12),
      utilidadPct: numero('d-util', 15),
    },
  };

  const btn = document.getElementById('btn-guardar');
  const fin = btn ? cargando(btn, 'Guardando…') : () => {};
  try {
    await api.guardarConfiguracion(payload);
    // Refleja el nombre en la marca lateral
    const marca = document.getElementById('brand-name');
    if (marca && payload.empresa.nombre) marca.textContent = payload.empresa.nombre;
    toast('Configuración guardada', 'ok');
  } catch (e) {
    toast('No se pudo guardar', 'err');
    console.error(e);
  } finally {
    fin();
  }
}
