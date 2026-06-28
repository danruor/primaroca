import { api } from '../api.js';
import {
  fmtMXN,
  fmtNum,
  fmtFecha,
  icon,
  barras,
  vacio,
  escapar,
  ESTADO_PROYECTO,
} from '../ui.js';

export async function render({ root, header }) {
  header.set({
    eyebrow: 'Panel general',
    titulo: 'Dashboard',
    acciones: [
      {
        label: 'Nueva cotización',
        icon: 'plus',
        variant: 'amber',
        onClick: () => (location.hash = '#cotizador'),
      },
    ],
  });

  root.innerHTML = `<div class="grid" style="gap:18px">
    <div class="kpis" id="dash-kpis">${cargandoKpis()}</div>
    <div class="grid two-col">
      <div class="card">
        <div class="card-h"><h3>Avance de proyectos</h3><span class="muted" style="font-size:12px" id="dash-proy-count"></span></div>
        <div class="card-b" id="dash-avance"><div class="empty"><span class="spinner dark"></span></div></div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Catálogo por categoría</h3></div>
        <div class="card-b" id="dash-cat"><div class="empty"><span class="spinner dark"></span></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-h">
        <h3>Cambios de precio recientes</h3>
        <span class="chip">Últimos 30 días</span>
      </div>
      <div class="card-b" id="dash-cambios"><div class="empty"><span class="spinner dark"></span></div></div>
    </div>
  </div>`;

  let data;
  try {
    data = await api.dashboard();
  } catch (e) {
    root.querySelector('#dash-kpis').innerHTML = '';
    root.querySelector('#dash-avance').innerHTML = vacio('No se pudo cargar', e.message, 'alert');
    return;
  }

  const k = data.kpis;
  root.querySelector('#dash-kpis').innerHTML = `
    ${kpi('Proyectos activos', fmtNum(k.proyectosActivos), `${fmtNum(k.proyectosTotales)} en total`, 'amber')}
    ${kpi('Avance promedio', `${k.avancePromedio}<small>%</small>`, 'proyectos en progreso', 'steel')}
    ${kpi('Cotizado vigente', fmtMXN(k.cotizadoAprobado), `${fmtNum(k.cotizacionesBorrador)} en borrador`, 'green')}
    ${kpi(
      'Materiales',
      fmtNum(k.totalMateriales),
      k.desactualizados ? `${fmtNum(k.desactualizados)} sin actualizar` : 'catálogo al día',
      k.desactualizados ? 'red' : ''
    )}`;

  // Avance por proyecto
  const proy = data.avancePorProyecto || [];
  root.querySelector('#dash-proy-count').textContent = proy.length ? `${proy.length} proyectos` : '';
  root.querySelector('#dash-avance').innerHTML = proy.length
    ? barras(
        proy.map((p) => ({
          etiqueta: p.nombre,
          valor: p.avance,
          sufijo: `${p.avance}%`,
          color: p.estado === 'terminado' ? 'green' : '',
        })),
        { max: 100 }
      )
    : vacio('Sin proyectos todavía', 'Crea tu primer proyecto desde la pestaña Proyectos.', 'proyectos');

  // Categorías
  const cats = data.categorias || [];
  root.querySelector('#dash-cat').innerHTML = cats.length
    ? barras(cats.map((c) => ({ etiqueta: c.nombre, valor: c.total, sufijo: fmtNum(c.total) })))
    : vacio('Catálogo vacío', '', 'materiales');

  // Cambios de precio
  const cambios = data.cambiosRecientes || [];
  root.querySelector('#dash-cambios').innerHTML = cambios.length
    ? `<div class="table-wrap"><table>
        <thead><tr>
          <th>Material</th><th class="num">Anterior</th><th class="num">Actual</th>
          <th class="num">Variación</th><th>Fecha</th>
        </tr></thead>
        <tbody>${cambios
          .map((c) => {
            const sube = c.variacion > 0;
            const baja = c.variacion < 0;
            const cls = sube ? 'up' : baja ? 'down' : 'muted';
            const flecha = sube ? icon('up', 13) : baja ? icon('down', 13) : '';
            const signo = sube ? '+' : '';
            return `<tr>
              <td>${escapar(c.nombre)} <span class="muted">/ ${escapar(c.unidad)}</span></td>
              <td class="num muted">${fmtMXN(c.anterior)}</td>
              <td class="num">${fmtMXN(c.actual)}</td>
              <td class="num ${cls}" style="white-space:nowrap">${flecha} ${signo}${c.variacion}%</td>
              <td class="muted">${fmtFecha(c.fecha)}</td>
            </tr>`;
          })
          .join('')}</tbody>
      </table></div>`
    : vacio(
        'Sin cambios de precio recientes',
        'Cuando actualices precios de materiales desde internet o manualmente, aparecerán aquí.',
        'refresh'
      );
}

function kpi(label, value, sub, variante = '') {
  return `<div class="kpi ${variante}">
    <div class="label">${escapar(label)}</div>
    <div class="value">${value}</div>
    ${sub ? `<div class="sub">${escapar(sub)}</div>` : ''}
  </div>`;
}

function cargandoKpis() {
  return Array(4)
    .fill(0)
    .map(
      () =>
        '<div class="kpi"><div class="label">&nbsp;</div><div class="value"><span class="spinner dark"></span></div></div>'
    )
    .join('');
}
