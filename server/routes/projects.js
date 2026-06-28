import express from 'express';
import { load, update, newId } from '../db.js';

const router = express.Router();
const HOY = () => new Date().toISOString();

const ESTADOS = ['planeacion', 'en_progreso', 'pausado', 'terminado'];

function limpiarHitos(hitos) {
  if (!Array.isArray(hitos)) return [];
  return hitos.map((h) => ({
    nombre: String(h.nombre || '').trim(),
    completado: Boolean(h.completado),
    fecha: h.fecha || '',
  }));
}

router.get('/', async (_req, res) => {
  const db = await load();
  const items = [...db.proyectos].sort(
    (a, b) => (b.creado || '').localeCompare(a.creado || '')
  );
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const db = await load();
  const p = db.proyectos.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  res.json(p);
});

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.nombre || !b.nombre.trim()) {
    return res.status(400).json({ error: 'El nombre del proyecto es obligatorio.' });
  }
  const proyecto = {
    id: newId('pro_'),
    nombre: b.nombre.trim(),
    cliente: (b.cliente || '').trim(),
    tipo: (b.tipo || 'Casa').trim(),
    ubicacion: (b.ubicacion || '').trim(),
    estado: ESTADOS.includes(b.estado) ? b.estado : 'planeacion',
    avance: Math.max(0, Math.min(100, Number(b.avance) || 0)),
    fechaInicio: b.fechaInicio || '',
    fechaFinEstimada: b.fechaFinEstimada || '',
    presupuesto: Number(b.presupuesto) || 0,
    cotizacionId: b.cotizacionId || null,
    hitos: limpiarHitos(b.hitos),
    notas: (b.notas || '').trim(),
    creado: HOY(),
  };
  await update((d) => d.proyectos.push(proyecto));
  res.status(201).json(proyecto);
});

router.put('/:id', async (req, res) => {
  const b = req.body || {};
  const out = await update((d) => {
    const p = d.proyectos.find((x) => x.id === req.params.id);
    if (!p) return null;
    if (b.nombre != null) p.nombre = String(b.nombre).trim();
    if (b.cliente != null) p.cliente = String(b.cliente).trim();
    if (b.tipo != null) p.tipo = String(b.tipo).trim();
    if (b.ubicacion != null) p.ubicacion = String(b.ubicacion).trim();
    if (b.estado != null && ESTADOS.includes(b.estado)) p.estado = b.estado;
    if (b.avance != null) p.avance = Math.max(0, Math.min(100, Number(b.avance) || 0));
    if (b.fechaInicio != null) p.fechaInicio = b.fechaInicio;
    if (b.fechaFinEstimada != null) p.fechaFinEstimada = b.fechaFinEstimada;
    if (b.presupuesto != null) p.presupuesto = Number(b.presupuesto) || 0;
    if (b.cotizacionId !== undefined) p.cotizacionId = b.cotizacionId || null;
    if (b.hitos != null) p.hitos = limpiarHitos(b.hitos);
    if (b.notas != null) p.notas = String(b.notas).trim();
    return p;
  });
  if (!out) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  res.json(out);
});

router.delete('/:id', async (req, res) => {
  let borrado = false;
  await update((d) => {
    const i = d.proyectos.findIndex((x) => x.id === req.params.id);
    if (i >= 0) {
      d.proyectos.splice(i, 1);
      borrado = true;
    }
  });
  if (!borrado) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  res.json({ ok: true });
});

export default router;
