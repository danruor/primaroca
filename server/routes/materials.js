import express from 'express';
import { load, update, newId } from '../db.js';
import {
  buscarEnInternet,
  precioActualParaMaterial,
  aplicarPrecio,
} from '../priceUpdater/index.js';

const router = express.Router();
const HOY = () => new Date().toISOString();

function normaliza(texto = '') {
  return texto
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// GET /api/materiales?q=&categoria=
router.get('/', async (req, res) => {
  const db = await load();
  let items = db.materiales;
  const { q, categoria } = req.query;
  if (categoria) items = items.filter((m) => m.categoria === categoria);
  if (q) {
    const nq = normaliza(q);
    items = items.filter(
      (m) => normaliza(m.nombre).includes(nq) || normaliza(m.sku).includes(nq)
    );
  }
  items = [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  res.json(items);
});

// GET /api/materiales/categorias
router.get('/categorias', async (_req, res) => {
  const db = await load();
  const mapa = new Map();
  for (const m of db.materiales) {
    mapa.set(m.categoria, (mapa.get(m.categoria) || 0) + 1);
  }
  const categorias = [...mapa.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  res.json(categorias);
});

// POST /api/materiales  (alta manual)
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }
  const precio = Number(b.precio) || 0;
  const fecha = HOY();
  const material = {
    id: newId('mat_'),
    sku: (b.sku || '').trim(),
    nombre: b.nombre.trim(),
    categoria: (b.categoria || 'Otros').trim(),
    unidad: (b.unidad || 'pieza').trim(),
    precio,
    moneda: 'MXN',
    fuente: b.urlFuente ? 'Catalogo en linea' : 'Captura manual',
    urlFuente: (b.urlFuente || '').trim(),
    manual: true,
    notas: (b.notas || '').trim(),
    ultimaActualizacion: fecha,
    historial: [{ fecha, precio, fuente: 'Alta manual' }],
  };
  await update((d) => d.materiales.push(material));
  res.status(201).json(material);
});

// POST /api/materiales/importar  (alta masiva: [{nombre,categoria,unidad,precio,sku}])
router.post('/importar', async (req, res) => {
  const lista = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(lista)) {
    return res.status(400).json({ error: 'Se esperaba una lista de materiales.' });
  }
  const fecha = HOY();
  const nuevos = lista
    .filter((b) => b && b.nombre && b.nombre.trim())
    .map((b) => {
      const precio = Number(b.precio) || 0;
      return {
        id: newId('mat_'),
        sku: (b.sku || '').trim(),
        nombre: b.nombre.trim(),
        categoria: (b.categoria || 'Otros').trim(),
        unidad: (b.unidad || 'pieza').trim(),
        precio,
        moneda: 'MXN',
        fuente: 'Importacion',
        urlFuente: (b.urlFuente || '').trim(),
        manual: true,
        notas: '',
        ultimaActualizacion: fecha,
        historial: [{ fecha, precio, fuente: 'Importacion' }],
      };
    });
  await update((d) => d.materiales.push(...nuevos));
  res.status(201).json({ agregados: nuevos.length });
});

// PUT /api/materiales/:id
router.put('/:id', async (req, res) => {
  const b = req.body || {};
  const resultado = await update((d) => {
    const m = d.materiales.find((x) => x.id === req.params.id);
    if (!m) return null;
    if (b.nombre != null) m.nombre = String(b.nombre).trim();
    if (b.sku != null) m.sku = String(b.sku).trim();
    if (b.categoria != null) m.categoria = String(b.categoria).trim();
    if (b.unidad != null) m.unidad = String(b.unidad).trim();
    if (b.urlFuente != null) m.urlFuente = String(b.urlFuente).trim();
    if (b.notas != null) m.notas = String(b.notas).trim();
    if (b.precio != null) {
      const nuevo = Number(b.precio) || 0;
      if (nuevo !== m.precio) {
        m.historial = m.historial || [];
        m.historial.push({ fecha: HOY(), precio: nuevo, fuente: 'Edicion manual' });
        m.precio = nuevo;
        m.ultimaActualizacion = HOY();
      }
    }
    return m;
  });
  if (!resultado) return res.status(404).json({ error: 'Material no encontrado.' });
  res.json(resultado);
});

// DELETE /api/materiales/:id
router.delete('/:id', async (req, res) => {
  let borrado = false;
  await update((d) => {
    const i = d.materiales.findIndex((x) => x.id === req.params.id);
    if (i >= 0) {
      d.materiales.splice(i, 1);
      borrado = true;
    }
  });
  if (!borrado) return res.status(404).json({ error: 'Material no encontrado.' });
  res.json({ ok: true });
});

// POST /api/materiales/:id/refrescar  (actualiza precio desde fuente)
router.post('/:id/refrescar', async (req, res) => {
  const db = await load();
  const material = db.materiales.find((x) => x.id === req.params.id);
  if (!material) return res.status(404).json({ error: 'Material no encontrado.' });

  const resultado = await precioActualParaMaterial(material);
  if (!resultado) {
    return res
      .status(502)
      .json({ error: 'No se pudo obtener un precio actualizado para este material.' });
  }
  const actualizado = await update((d) => {
    const m = d.materiales.find((x) => x.id === req.params.id);
    aplicarPrecio(m, resultado);
    return m;
  });
  res.json(actualizado);
});

// POST /api/materiales/refrescar  (actualiza todos; opcional ?categoria=)
router.post('/refrescar', async (req, res) => {
  const db = await load();
  const categoria = req.query.categoria;
  const objetivos = db.materiales.filter(
    (m) => (!categoria || m.categoria === categoria) && m.urlFuente
  );

  let actualizados = 0;
  let cambios = 0;
  const errores = [];

  // Procesa en serie para no saturar la fuente.
  for (const m of objetivos) {
    try {
      const resultado = await precioActualParaMaterial(m);
      if (resultado) {
        const hayCambio = await update((d) => {
          const target = d.materiales.find((x) => x.id === m.id);
          return aplicarPrecio(target, resultado);
        });
        actualizados++;
        if (hayCambio) cambios++;
      }
    } catch (e) {
      errores.push({ id: m.id, nombre: m.nombre, error: e.message });
    }
  }

  res.json({
    revisados: objetivos.length,
    actualizados,
    cambios,
    sinFuente: db.materiales.length - objetivos.length,
    errores,
  });
});

export default router;
