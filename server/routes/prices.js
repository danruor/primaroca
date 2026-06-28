import express from 'express';
import { buscarEnInternet } from '../priceUpdater/index.js';

const router = express.Router();

// GET /api/precios/buscar?q=cemento
router.get('/buscar', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length < 3) {
    return res.status(400).json({ error: 'Escribe al menos 3 caracteres.' });
  }
  try {
    const candidatos = await buscarEnInternet(q, 6);
    res.json({ consulta: q, candidatos });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo completar la busqueda.', detalle: e.message });
  }
});

export default router;
