/**
 * Settings routes — Sozlamalar, Obyektlar, Omborlar
 */
const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const store = require('../store');

// GET /api/settings
router.get('/', async (req, res) => {
  const data = await store.getSettings();
  res.json({ ok: true, data });
});

// PUT /api/settings
router.put('/', authMiddleware, async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await store.updateSetting(key, value);
  }
  const data = await store.getSettings();
  res.json({ ok: true, data });
});

// ── Obyektlar ──
router.get('/obyektlar', async (req, res) => {
  const data = await store.getObyektlar();
  res.json({ ok: true, data });
});

router.post('/obyektlar', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Nom kerak' });
  const data = await store.addObyekt(name.trim());
  res.json({ ok: true, data });
});

router.delete('/obyektlar/:name', authMiddleware, async (req, res) => {
  const data = await store.removeObyekt(req.params.name);
  res.json({ ok: true, data });
});

// ── Omborlar ──
router.get('/omborlar', async (req, res) => {
  const data = await store.getOmborlar();
  res.json({ ok: true, data });
});

router.post('/omborlar', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Nom kerak' });
  const data = await store.addOmbor(name.trim());
  res.json({ ok: true, data });
});

router.delete('/omborlar/:name', authMiddleware, async (req, res) => {
  const data = await store.removeOmbor(req.params.name);
  res.json({ ok: true, data });
});

// ── Min stock (Skladchi) ──
router.get('/min-stock', async (req, res) => {
  const data = await store.getMinStock();
  res.json({ ok: true, data });
});

router.post('/min-stock', authMiddleware, async (req, res) => {
  const { productName, minQty } = req.body;
  if (!productName) return res.status(400).json({ ok: false, error: 'productName kerak' });
  const data = await store.setMinStock(productName, Number(minQty) || 5);
  res.json({ ok: true, data });
});

// ── Firms ──
router.post('/firms', authMiddleware, async (req, res) => {
  const { name, phone, address, inn, note, oldName } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Firma nomi kerak' });
  const result = await store.upsertFirm(name, { phone: phone || '', address: address || '', inn: inn || '', note: note || '', oldName });
  res.json({ ok: true, data: result });
});

router.delete('/firms/:name', authMiddleware, async (req, res) => {
  const { name } = req.params;
  if (!name) return res.status(400).json({ ok: false, error: 'Firma nomi kerak' });
  await store.deleteFirm(decodeURIComponent(name));
  res.json({ ok: true });
});

// ── Products (Katalog) ──
router.post('/products', authMiddleware, async (req, res) => {
  const { nom, olv, oldNom } = req.body;
  if (!nom) return res.status(400).json({ ok: false, error: 'Mahsulot nomi kerak' });
  const result = await store.upsertProduct(nom, olv, oldNom);
  res.json({ ok: true, data: result });
});

router.post('/products/delete', authMiddleware, async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ ok: false, error: 'Mahsulot nomi kerak' });
  await store.deleteProduct(nom);
  res.json({ ok: true });
});

module.exports = router;