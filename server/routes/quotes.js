import express from 'express';
import { load, update, newId } from '../db.js';

const router = express.Router();
const HOY = () => new Date().toISOString();
const ESTADOS = ['borrador', 'enviada', 'aprobada', 'rechazada'];

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Calcula importes por partida y totales de la cotizacion.
export function calcular(cot) {
  const partidas = (cot.partidas || []).map((p) => {
    const cantidad = Number(p.cantidad) || 0;
    const precioUnitario = Number(p.precioUnitario) || 0;
    return {
      materialId: p.materialId || null,
      descripcion: String(p.descripcion || '').trim(),
      unidad: (p.unidad || 'pieza').trim(),
      cantidad,
      precioUnitario,
      importe: r2(cantidad * precioUnitario),
    };
  });

  const manoObraPct = Number(cot.manoObraPct) || 0;
  const indirectosPct = Number(cot.indirectosPct) || 0;
  const utilidadPct = Number(cot.utilidadPct) || 0;
  const ivaPct = cot.ivaPct != null ? Number(cot.ivaPct) : 16;
  const descuento = Number(cot.descuento) || 0;

  const subtotalMateriales = r2(partidas.reduce((s, p) => s + p.importe, 0));
  const manoObra = r2(subtotalMateriales * (manoObraPct / 100));
  const indirectos = r2((subtotalMateriales + manoObra) * (indirectosPct / 100));
  const baseUtilidad = subtotalMateriales + manoObra + indirectos;
  const utilidad = r2(baseUtilidad * (utilidadPct / 100));
  const subtotal = r2(baseUtilidad + utilidad - descuento);
  const iva = r2(subtotal * (ivaPct / 100));
  const total = r2(subtotal + iva);

  return {
    partidas,
    manoObraPct,
    indirectosPct,
    utilidadPct,
    ivaPct,
    descuento: r2(descuento),
    subtotalMateriales,
    manoObra,
    indirectos,
    utilidad,
    subtotal,
    iva,
    total,
  };
}

async function siguienteFolio() {
  const db = await load();
  const anio = new Date().getFullYear();
  const n = db.cotizaciones.filter((c) => (c.folio || '').includes(`-${anio}-`)).length + 1;
  return `COT-${anio}-${String(n).padStart(3, '0')}`;
}

router.get('/', async (_req, res) => {
  const db = await load();
  const items = [...db.cotizaciones].sort(
    (a, b) => (b.fecha || '').localeCompare(a.fecha || '')
  );
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const db = await load();
  const c = db.cotizaciones.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Cotizacion no encontrada.' });
  res.json(c);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  const calc = calcular(b);
  const cot = {
    id: newId('cot_'),
    folio: b.folio || (await siguienteFolio()),
    nombre: (b.nombre || 'Cotizacion sin titulo').trim(),
    proyectoId: b.proyectoId || null,
    cliente: (b.cliente || '').trim(),
    fecha: b.fecha || HOY(),
    estado: ESTADOS.includes(b.estado) ? b.estado : 'borrador',
    notas: (b.notas || '').trim(),
    ...calc,
    creado: HOY(),
  };
  await update((d) => d.cotizaciones.push(cot));
  res.status(201).json(cot);
});

router.put('/:id', async (req, res) => {
  const b = req.body || {};
  const out = await update((d) => {
    const c = d.cotizaciones.find((x) => x.id === req.params.id);
    if (!c) return null;
    if (b.nombre != null) c.nombre = String(b.nombre).trim();
    if (b.cliente != null) c.cliente = String(b.cliente).trim();
    if (b.proyectoId !== undefined) c.proyectoId = b.proyectoId || null;
    if (b.fecha != null) c.fecha = b.fecha;
    if (b.estado != null && ESTADOS.includes(b.estado)) c.estado = b.estado;
    if (b.notas != null) c.notas = String(b.notas).trim();
    // Recalcula si llegan partidas o porcentajes.
    const recalcular =
      b.partidas != null ||
      b.manoObraPct != null ||
      b.indirectosPct != null ||
      b.utilidadPct != null ||
      b.ivaPct != null ||
      b.descuento != null;
    if (recalcular) {
      const fuente = {
        partidas: b.partidas != null ? b.partidas : c.partidas,
        manoObraPct: b.manoObraPct != null ? b.manoObraPct : c.manoObraPct,
        indirectosPct: b.indirectosPct != null ? b.indirectosPct : c.indirectosPct,
        utilidadPct: b.utilidadPct != null ? b.utilidadPct : c.utilidadPct,
        ivaPct: b.ivaPct != null ? b.ivaPct : c.ivaPct,
        descuento: b.descuento != null ? b.descuento : c.descuento,
      };
      Object.assign(c, calcular(fuente));
    }
    return c;
  });
  if (!out) return res.status(404).json({ error: 'Cotizacion no encontrada.' });
  res.json(out);
});

router.delete('/:id', async (req, res) => {
  let borrado = false;
  await update((d) => {
    const i = d.cotizaciones.findIndex((x) => x.id === req.params.id);
    if (i >= 0) {
      d.cotizaciones.splice(i, 1);
      borrado = true;
    }
  });
  if (!borrado) return res.status(404).json({ error: 'Cotizacion no encontrada.' });
  res.json({ ok: true });
});

export default router;
