// Orquestador de actualizacion de precios.
// - refrescarMaterial / refrescarTodos: actualizan precios desde fuentes.
// - buscarEnInternet: busca candidatos de precio por nombre (para captura asistida).
//
// Estrategia de actualizacion de un material:
//   1) Si tiene urlFuente -> lee el precio de esa pagina (confiable).
//   2) Si no, y hay SEARCH_API_KEY (Google CSE) -> busca por nombre.
//   3) Si no, intenta el catalogo publico por nombre (best-effort).

import * as prestashop from './sources/prestashopMx.js';

const HOY = () => new Date().toISOString();

// --- Busqueda opcional con Google Programmable Search (si hay llave) ---
async function googleCSE(consulta, limite = 4) {
  const key = process.env.SEARCH_API_KEY;
  const cx = process.env.SEARCH_ENGINE_ID;
  if (!key || !cx) return [];
  const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&num=${limite}&q=${encodeURIComponent(
    consulta + ' precio mexico'
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || [];
    return items
      .map((it) => {
        const texto = `${it.title} ${it.snippet || ''}`;
        const m = texto.match(/\$\s?([\d,]+(?:\.\d{2})?)/);
        const precio = m ? Number(m[1].replace(/,/g, '')) : null;
        return precio
          ? { precio, nombre: it.title, url: it.link, fuente: 'Busqueda web' }
          : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Devuelve candidatos de precio para un nombre. Combina catalogo + (opcional) CSE.
export async function buscarEnInternet(consulta, limite = 5) {
  const resultados = [];
  try {
    const cat = await prestashop.buscarPorNombre(consulta, limite);
    resultados.push(...cat);
  } catch {
    /* sigue */
  }
  if (resultados.length < limite) {
    const web = await googleCSE(consulta, limite - resultados.length);
    resultados.push(...web);
  }
  return resultados.slice(0, limite);
}

// Actualiza el precio de UN material. Regresa el material modificado o null.
export async function precioActualParaMaterial(material) {
  // 1) URL directa de fuente
  if (material.urlFuente) {
    try {
      const r = await prestashop.precioDesdeUrl(material.urlFuente);
      return { precio: r.precio, fuente: 'Catalogo en linea', url: material.urlFuente };
    } catch {
      /* intenta busqueda */
    }
  }
  // 2) Busqueda por nombre (CSE o catalogo)
  const candidatos = await buscarEnInternet(material.nombre, 1);
  if (candidatos.length) {
    const c = candidatos[0];
    return { precio: c.precio, fuente: c.fuente, url: c.url };
  }
  return null;
}

// Aplica el resultado de actualizacion a la estructura del material (mutando copia).
export function aplicarPrecio(material, resultado) {
  const cambio = resultado.precio !== material.precio;
  material.precio = resultado.precio;
  material.fuente = resultado.fuente || material.fuente;
  if (resultado.url) material.urlFuente = resultado.url;
  material.ultimaActualizacion = HOY();
  material.historial = material.historial || [];
  if (cambio) {
    material.historial.push({
      fecha: HOY(),
      precio: resultado.precio,
      fuente: resultado.fuente || 'Actualizacion',
    });
    // Limita el historial a 50 entradas.
    if (material.historial.length > 50) {
      material.historial = material.historial.slice(-50);
    }
  }
  return cambio;
}
