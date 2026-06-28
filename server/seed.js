import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { load, update, newId } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORCE = process.argv.includes('--force');
const HOY = () => new Date().toISOString();

export const CONFIG_DEFAULT = {
  empresa: {
    nombre: 'Mi Constructora',
    rfc: '',
    direccion: '',
    telefono: '',
    correo: '',
  },
  moneda: 'MXN',
  ivaPct: 16,
  defaults: {
    manoObraPct: 35,
    indirectosPct: 12,
    utilidadPct: 15,
  },
  // Fuentes publicas para refrescar precios automaticamente (best-effort).
  fuentesPrecios: [
    {
      id: 'prestashop-mx',
      nombre: 'Precios de Materiales de Construccion (MX)',
      activa: true,
    },
  ],
};

async function leerSeedMateriales() {
  const ruta = path.join(__dirname, 'data', 'seed-materials.json');
  const raw = await fs.readFile(ruta, 'utf8');
  return JSON.parse(raw);
}

function aMaterial(item) {
  const fecha = HOY();
  return {
    id: newId('mat_'),
    sku: item.sku || '',
    nombre: item.nombre,
    categoria: item.categoria || 'Sin categoria',
    unidad: item.unidad || 'pieza',
    precio: Number(item.precio) || 0,
    moneda: 'MXN',
    fuente: item.urlFuente ? 'Catalogo en linea' : 'Referencia de mercado (MX)',
    urlFuente: item.urlFuente || '',
    manual: false,
    notas: '',
    ultimaActualizacion: fecha,
    historial: [{ fecha, precio: Number(item.precio) || 0, fuente: 'Precio inicial de referencia' }],
  };
}

function proyectoEjemplo(cotizacionId) {
  return {
    id: newId('pro_'),
    nombre: 'Casa habitacion - Lomas del Sol',
    cliente: 'Familia Ramirez',
    tipo: 'Casa',
    ubicacion: 'Cuernavaca, Morelos',
    estado: 'en_progreso',
    avance: 45,
    fechaInicio: '2026-04-01',
    fechaFinEstimada: '2026-11-30',
    presupuesto: 1850000,
    cotizacionId: cotizacionId || null,
    hitos: [
      { nombre: 'Cimentacion', completado: true, fecha: '2026-04-20' },
      { nombre: 'Estructura y losa', completado: true, fecha: '2026-06-15' },
      { nombre: 'Albanileria y muros', completado: false, fecha: '' },
      { nombre: 'Instalaciones', completado: false, fecha: '' },
      { nombre: 'Acabados', completado: false, fecha: '' },
      { nombre: 'Entrega', completado: false, fecha: '' },
    ],
    notas: 'Proyecto de ejemplo. Puedes editarlo o eliminarlo.',
    creado: HOY(),
  };
}

export async function seedIfEmpty() {
  const db = await load();
  const vacio = db.materiales.length === 0 && db.proyectos.length === 0 && !db.configuracion;
  if (!vacio && !FORCE) return { sembrado: false };

  const seed = await leerSeedMateriales();
  const materiales = seed.map(aMaterial);

  await update((d) => {
    if (FORCE) {
      d.materiales = [];
      d.proyectos = [];
      d.cotizaciones = [];
    }
    d.materiales = materiales;
    d.configuracion = d.configuracion || structuredClone(CONFIG_DEFAULT);
    const proyecto = proyectoEjemplo(null);
    d.proyectos.push(proyecto);
    d.meta = d.meta || {};
    d.meta.sembrado = HOY();
  });

  return { sembrado: true, materiales: materiales.length };
}

// Permite ejecutar `npm run seed` directamente.
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedIfEmpty()
    .then((r) => {
      console.log('[seed]', r.sembrado ? `Sembrado: ${r.materiales} materiales + proyecto de ejemplo.` : 'La base ya tenia datos (usa --force para reiniciar).');
      process.exit(0);
    })
    .catch((e) => {
      console.error('[seed] Error:', e);
      process.exit(1);
    });
}
