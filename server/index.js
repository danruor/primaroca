import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { isPersistent, dbPath, load } from './db.js';
import { seedIfEmpty } from './seed.js';
import { precioActualParaMaterial, aplicarPrecio } from './priceUpdater/index.js';
import { update } from './db.js';

import materialesRouter from './routes/materials.js';
import preciosRouter from './routes/prices.js';
import proyectosRouter from './routes/projects.js';
import cotizacionesRouter from './routes/quotes.js';
import configuracionRouter from './routes/settings.js';
import dashboardRouter from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

// --- API ---
app.get('/api/health', async (_req, res) => {
  res.json({ ok: true, persistente: isPersistent(), db: dbPath() });
});
app.use('/api/materiales', materialesRouter);
app.use('/api/precios', preciosRouter);
app.use('/api/proyectos', proyectosRouter);
app.use('/api/cotizaciones', cotizacionesRouter);
app.use('/api/configuracion', configuracionRouter);
app.use('/api/dashboard', dashboardRouter);

// --- Archivos estaticos (PWA) ---
app.use(express.static(PUBLIC_DIR));

// SPA fallback: cualquier ruta que no sea /api sirve index.html.
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Manejo de errores.
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// --- Refresco programado opcional ---
async function refrescarTodos() {
  const db = await load();
  const objetivos = db.materiales.filter((m) => m.urlFuente);
  let cambios = 0;
  for (const m of objetivos) {
    try {
      const r = await precioActualParaMaterial(m);
      if (r) {
        const hayCambio = await update((d) => {
          const t = d.materiales.find((x) => x.id === m.id);
          return aplicarPrecio(t, r);
        });
        if (hayCambio) cambios++;
      }
    } catch {
      /* continua */
    }
  }
  console.log(`[cron] Precios revisados: ${objetivos.length}, con cambio: ${cambios}`);
}

function programarRefresco() {
  const horas = Number(process.env.PRICE_REFRESH_HOURS) || 0;
  if (horas > 0) {
    const ms = horas * 60 * 60 * 1000;
    setInterval(() => {
      refrescarTodos().catch((e) => console.error('[cron]', e));
    }, ms);
    console.log(`[cron] Refresco automatico de precios cada ${horas} h activado.`);
  }
}

// --- Arranque ---
(async () => {
  const r = await seedIfEmpty();
  if (r.sembrado) console.log(`[seed] Datos iniciales cargados (${r.materiales} materiales).`);
  if (!isPersistent()) {
    console.warn(
      '[aviso] DATA_DIR no esta configurado: los datos NO persisten entre despliegues. ' +
        'En Railway crea un Volume montado en /data y define DATA_DIR=/data.'
    );
  }
  programarRefresco();
  app.listen(PORT, () => {
    console.log(`Constructora app escuchando en http://localhost:${PORT}`);
  });
})();
