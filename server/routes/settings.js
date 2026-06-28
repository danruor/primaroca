import express from 'express';
import { load, update } from '../db.js';
import { CONFIG_DEFAULT } from '../seed.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const db = await load();
  res.json(db.configuracion || CONFIG_DEFAULT);
});

router.put('/', async (req, res) => {
  const b = req.body || {};
  const out = await update((d) => {
    const cfg = d.configuracion || structuredClone(CONFIG_DEFAULT);
    if (b.empresa) cfg.empresa = { ...cfg.empresa, ...b.empresa };
    if (b.moneda) cfg.moneda = b.moneda;
    if (b.ivaPct != null) cfg.ivaPct = Number(b.ivaPct) || 0;
    if (b.defaults) cfg.defaults = { ...cfg.defaults, ...b.defaults };
    if (b.fuentesPrecios) cfg.fuentesPrecios = b.fuentesPrecios;
    d.configuracion = cfg;
    return cfg;
  });
  res.json(out);
});

export default router;
