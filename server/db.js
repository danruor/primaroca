import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta de datos: Railway Volume (DATA_DIR=/data) o ./data en local.
const DATA_DIR = process.env.DATA_DIR && process.env.DATA_DIR.trim()
  ? process.env.DATA_DIR.trim()
  : path.join(__dirname, '..', 'data');

const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY_DB = {
  materiales: [],
  proyectos: [],
  cotizaciones: [],
  configuracion: null,
  meta: { creado: null, version: 1 },
};

let cache = null;
let writeChain = Promise.resolve(); // serializa escrituras

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function load() {
  if (cache) return cache;
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    cache = { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch (err) {
    if (err.code === 'ENOENT') {
      cache = structuredClone(EMPTY_DB);
      cache.meta.creado = new Date().toISOString();
      await persist();
    } else {
      throw err;
    }
  }
  return cache;
}

async function persist() {
  // Escritura atomica: archivo temporal + rename.
  const tmp = DB_FILE + '.tmp';
  const data = JSON.stringify(cache, null, 2);
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, DB_FILE);
}

// Aplica una mutacion sobre la cache y guarda en disco de forma serializada.
export function update(mutator) {
  writeChain = writeChain.then(async () => {
    await load();
    const result = mutator(cache);
    await persist();
    return result;
  });
  return writeChain;
}

export function dbPath() {
  return DB_FILE;
}

export function isPersistent() {
  return Boolean(process.env.DATA_DIR && process.env.DATA_DIR.trim());
}

// Util: id corto y unico.
export function newId(prefix = '') {
  const rnd = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36).slice(-4);
  return `${prefix}${t}${rnd}`;
}
