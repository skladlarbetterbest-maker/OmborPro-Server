/**
 * Products routes — Mahsulotlar boshqaruvi
 */
const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const store = require('../store');

// GET /api/products
router.get('/', async (req, res) => {
  const data = await store.getKatalog();
  res.json({ ok: true, data });
});

// POST /api/products
router.post('/', authMiddleware, async (req, res) => {
  const { name, unit } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Nom kerak' });
  const product = await store.upsertProduct(name, unit);
  res.json({ ok: true, data: product });
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const katalog = await store.getKatalog();
  const idx = katalog.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Topilmadi' });
  await store.deleteProduct(katalog[idx].nom);
  res.json({ ok: true });
});

// ── Firmalar ──
// GET /api/products/firms
router.get('/firms', async (req, res) => {
  const data = await store.getFirms();
  res.json({ ok: true, data });
});

// POST /api/products/firms
router.post('/firms', authMiddleware, async (req, res) => {
  const { name, phone, note } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Nom kerak' });
  const firm = await store.upsertFirm(name, { phone, note });
  res.json({ ok: true, data: firm });
});

module.exports = router;