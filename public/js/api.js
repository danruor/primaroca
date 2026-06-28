// Capa de acceso a la API. Envoltura ligera sobre fetch.

async function req(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  const res = await fetch(`/api${ruta}`, opciones);
  let data = null;
  const texto = await res.text();
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      data = texto;
    }
  }
  if (!res.ok) {
    const msg = (data && data.error) || `Error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const get = (r) => req('GET', r);
const post = (r, b) => req('POST', r, b);
const put = (r, b) => req('PUT', r, b);
const del = (r) => req('DELETE', r);

function qs(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

export const api = {
  salud: () => get('/health'),
  dashboard: () => get('/dashboard'),

  // Materiales
  materiales: (filtros) => get(`/materiales${qs(filtros)}`),
  categorias: () => get('/materiales/categorias'),
  crearMaterial: (m) => post('/materiales', m),
  importarMateriales: (lista) => post('/materiales/importar', lista),
  actualizarMaterial: (id, m) => put(`/materiales/${id}`, m),
  borrarMaterial: (id) => del(`/materiales/${id}`),
  refrescarMaterial: (id) => post(`/materiales/${id}/refrescar`),
  refrescarTodos: (categoria) => post(`/materiales/refrescar${qs({ categoria })}`),

  // Precios (busqueda en internet)
  buscarPrecio: (q) => get(`/precios/buscar${qs({ q })}`),

  // Proyectos
  proyectos: () => get('/proyectos'),
  proyecto: (id) => get(`/proyectos/${id}`),
  crearProyecto: (p) => post('/proyectos', p),
  actualizarProyecto: (id, p) => put(`/proyectos/${id}`, p),
  borrarProyecto: (id) => del(`/proyectos/${id}`),

  // Cotizaciones
  cotizaciones: () => get('/cotizaciones'),
  cotizacion: (id) => get(`/cotizaciones/${id}`),
  crearCotizacion: (c) => post('/cotizaciones', c),
  actualizarCotizacion: (id, c) => put(`/cotizaciones/${id}`, c),
  borrarCotizacion: (id) => del(`/cotizaciones/${id}`),

  // Configuracion
  configuracion: () => get('/configuracion'),
  guardarConfiguracion: (c) => put('/configuracion', c),
};
