import express from 'express';
import { load } from '../db.js';

const router = express.Router();
const DIAS = (d) => d * 24 * 60 * 60 * 1000;

router.get('/', async (_req, res) => {
  const db = await load();
  const ahora = Date.now();

  const proyectos = db.proyectos;
  const materiales = db.materiales;
  const cotizaciones = db.cotizaciones;

  const activos = proyectos.filter((p) => p.estado === 'en_progreso');
  const avancePromedio = activos.length
    ? Math.round(activos.reduce((s, p) => s + (p.avance || 0), 0) / activos.length)
    : 0;

  const cotizadoAprobado = cotizaciones
    .filter((c) => c.estado === 'aprobada' || c.estado === 'enviada')
    .reduce((s, c) => s + (c.total || 0), 0);

  // Cambios de precio en los ultimos 30 dias.
  let cambios30 = 0;
  const cambiosRecientes = [];
  for (const m of materiales) {
    const hist = m.historial || [];
    for (let i = 1; i < hist.length; i++) {
      const t = new Date(hist[i].fecha).getTime();
      if (ahora - t <= DIAS(30)) {
        cambios30++;
        const anterior = hist[i - 1].precio;
        const actual = hist[i].precio;
        cambiosRecientes.push({
          nombre: m.nombre,
          unidad: m.unidad,
          anterior,
          actual,
          variacion: anterior ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : 0,
          fecha: hist[i].fecha,
        });
      }
    }
  }
  cambiosRecientes.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  // Materiales sin actualizar hace mas de 30 dias.
  const desactualizados = materiales.filter(
    (m) => ahora - new Date(m.ultimaActualizacion || 0).getTime() > DIAS(30)
  ).length;

  // Distribucion por categoria.
  const porCategoria = {};
  for (const m of materiales) {
    porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + 1;
  }
  const categorias = Object.entries(porCategoria)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  res.json({
    kpis: {
      proyectosActivos: activos.length,
      proyectosTotales: proyectos.length,
      avancePromedio,
      cotizadoAprobado,
      cotizacionesBorrador: cotizaciones.filter((c) => c.estado === 'borrador').length,
      totalMateriales: materiales.length,
      cambios30,
      desactualizados,
    },
    avancePorProyecto: proyectos
      .map((p) => ({ nombre: p.nombre, avance: p.avance || 0, estado: p.estado }))
      .slice(0, 12),
    categorias,
    cambiosRecientes: cambiosRecientes.slice(0, 8),
  });
});

export default router;
