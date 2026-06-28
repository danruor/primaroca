// Adaptador de precios para catalogos tipo PrestaShop (paginas de producto
// con metadatos OpenGraph de precio). Funciona sin llaves de API.
//
// Fuente por defecto: preciosdematerialesdeconstruccion.com.mx
// Las paginas de producto exponen <meta property="product:price:amount" ...>,
// lo que permite leer el precio de forma confiable.

const ORIGIN = 'https://preciosdematerialesdeconstruccion.com.mx';
const TIMEOUT_MS = 12000;
const UA =
  'Mozilla/5.0 (compatible; ConstructoraApp/1.0; +https://railway.app) AppleWebKit/537.36';

async function getHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function extraerMeta(html, prop) {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const m = html.match(re);
  if (m) return m[1];
  // Algunos temas invierten el orden content/property.
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
    'i'
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function parsePrecio(html) {
  let raw =
    extraerMeta(html, 'product:price:amount') ||
    extraerMeta(html, 'og:price:amount');
  if (!raw) {
    // Respaldo: primer "$1,234.00" del documento.
    const m = html.match(/\$\s?([\d,]+\.\d{2})/);
    raw = m ? m[1] : null;
  }
  if (!raw) return null;
  const n = Number(String(raw).replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Lee el precio actual de una URL de producto concreta.
export async function precioDesdeUrl(url) {
  const html = await getHtml(url);
  const precio = parsePrecio(html);
  if (precio == null) throw new Error('No se encontro precio en la pagina');
  const nombre = extraerMeta(html, 'og:title') || '';
  return { precio, nombre, url, fuente: 'Catalogo en linea' };
}

// Busca productos por nombre y regresa hasta `limite` candidatos con precio.
export async function buscarPorNombre(consulta, limite = 4) {
  const q = encodeURIComponent(consulta.trim());
  const intentos = [
    `${ORIGIN}/buscar?controller=search&s=${q}`,
    `${ORIGIN}/buscar?s=${q}`,
    `${ORIGIN}/search?s=${q}`,
  ];

  let html = '';
  for (const u of intentos) {
    try {
      html = await getHtml(u);
      if (html && /\/\d+-[a-z0-9-]+\.html/i.test(html)) break;
    } catch {
      /* intenta el siguiente */
    }
  }
  if (!html) return [];

  // Extrae URLs de producto: /<categoria>/<id>-<slug>.html
  const urls = new Set();
  const re = /href=["']([^"']*?\/\d+-[a-z0-9-]+\.html)["']/gi;
  let m;
  while ((m = re.exec(html)) && urls.size < limite * 2) {
    let href = m[1];
    if (href.startsWith('/')) href = ORIGIN + href;
    if (href.startsWith(ORIGIN)) urls.add(href.split('#')[0].split('?')[0]);
  }

  const candidatos = [];
  for (const url of urls) {
    if (candidatos.length >= limite) break;
    try {
      const r = await precioDesdeUrl(url);
      candidatos.push(r);
    } catch {
      /* ignora productos sin precio legible */
    }
  }
  return candidatos;
}

export const META = {
  id: 'prestashop-mx',
  nombre: 'Precios de Materiales de Construccion (MX)',
  origin: ORIGIN,
};
