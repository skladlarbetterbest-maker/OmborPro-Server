/**
 * Journal routes — Kirim / Chiqim CRUD
 */
const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const store = require('../store');

// GET /api/journal — barcha yozuvlar (RBAC bilan)
router.get('/', authMiddleware, async (req, res) => {
  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = req.user.role === 'admin';

  let jurnal = await store.getJurnal();

  if (!isAdmin && userObyekt !== 'Barchasi') {
    jurnal = jurnal.filter(r => r.obyekt === userObyekt);
  }

  res.json({ ok: true, data: jurnal });
});

// POST /api/journal — yangi yozuv qo'shish
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { tur, mahsulot, miqdor, narx, summa, tomon, obyekt, izoh } = req.body;
    if (!mahsulot || !miqdor) return res.status(400).json({ ok: false, error: 'Mahsulot va miqdor kerak' });

    const users = await store.getUsers();
    const userData = users[req.user.login] || {};
    const userObyekt = userData.obyekt || 'Barchasi';
    const isAdmin = req.user.role === 'admin';

    let targetObyekt = store.clean(obyekt || 'Barchasi');
    if (!isAdmin && userObyekt !== 'Barchasi' && targetObyekt !== userObyekt) {
      targetObyekt = userObyekt;
    }

    await store.upsertProduct(mahsulot, req.body.olv || '');
    if (tomon) await store.upsertFirm(tomon);

    const isChiqim = (tur === 'Chiqim');
    let chunks = [];

    if (isChiqim) {
      try {
        chunks = await store.calculateFifo(mahsulot, targetObyekt, Number(miqdor));
      } catch (err) {
        return res.status(400).json({ ok: false, error: err.message });
      }
    } else {
      chunks = [{ miqdor: Number(miqdor), narx: Number(narx) || 0 }];
    }

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const entry = await store.addJurnalEntry({
        tur: tur || 'Kirim',
        sana: req.body.sana || new Date().toLocaleDateString('uz-UZ'),
        mahsulot: store.clean(mahsulot),
        miqdor: chunk.miqdor,
        narx: chunk.narx,
        summa: chunk.miqdor * chunk.narx,
        tomon: store.clean(tomon || ''),
        obyekt: targetObyekt,
        izoh: store.clean(izoh || '') + (chunks.length > 1 ? ` (Qism ${i + 1})` : ''),
        operator: req.user?.login || 'system'
      });
      results.push(entry);
    }

    res.json({ ok: true, data: results[0], count: results.length, allData: results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/journal/bulk — ko'plab yozuvlarni qo'shish
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ ok: false, error: 'records massivi kerak' });
    }

    const results = [];
    const errors = [];

    for (let recIndex = 0; recIndex < records.length; recIndex++) {
      const rec = records[recIndex];
      if (!rec.mahsulot || !rec.miqdor) continue;
      
      await store.upsertProduct(rec.mahsulot, rec.olv || '');
      if (rec.tomon) await store.upsertFirm(rec.tomon);

      const isChiqim = (rec.tur === 'Chiqim');
      let chunks = [];

      if (isChiqim) {
        try {
          chunks = await store.calculateFifo(rec.mahsulot, rec.obyekt, Number(rec.miqdor));
        } catch (err) {
          errors.push(`Qator ${recIndex + 1}: ${err.message}`);
          continue;
        }
      } else {
        chunks = [{ miqdor: Number(rec.miqdor), narx: Number(rec.narx) || 0 }];
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const entry = await store.addJurnalEntry({
          tur: rec.tur || 'Kirim',
          sana: rec.sana || new Date().toLocaleDateString('uz-UZ'),
          mahsulot: store.clean(rec.mahsulot),
          miqdor: chunk.miqdor,
          narx: chunk.narx,
          summa: chunk.miqdor * chunk.narx,
          tomon: store.clean(rec.tomon || ''),
          obyekt: store.clean(rec.obyekt || 'Barchasi'),
          izoh: store.clean(rec.izoh || '') + (chunks.length > 1 ? ` (Qism ${i + 1})` : ''),
          operator: req.user?.login || 'system'
        });
        results.push(entry);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return res.status(400).json({ ok: false, error: errors.join('\n') });
    }

    res.json({ ok: true, count: results.length, data: results, errors });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/journal/:id — yozuvni yangilash (RBAC bilan)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const jurnal = await store.getJurnal();
    const index = jurnal.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ ok: false, error: 'Yozuv topilmadi' });
    }

    const users = await store.getUsers();
    const userData = users[req.user.login] || {};
    const userObyekt = userData.obyekt || 'Barchasi';
    const isAdmin = req.user.role === 'admin';
    const recordObyekt = jurnal[index].obyekt || 'Barchasi';

    if (!isAdmin && userObyekt !== 'Barchasi' && recordObyekt !== userObyekt) {
      return res.status(403).json({ ok: false, error: 'Siz faqat o\'z obyektingizdagi yozuvlarni tahrirlashingiz mumkin' });
    }

    const old = { ...jurnal[index] };
    const updates = {};
    ['sana', 'mahsulot', 'miqdor', 'narx', 'summa', 'tomon', 'izoh'].forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    updates.editedBy = req.user?.login || 'system';
    updates.editedAt = new Date().toISOString();

    const updated = await store.updateJurnalEntry(id, updates);

    await store.addHistoryEntry({
      action: 'edit',
      ...old,
      newValues: updates,
      editedBy: req.user?.login || 'system'
    });

    res.json({ ok: true, data: updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/journal/:id — yozuvni o'chirish (RBAC bilan)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const jurnal = await store.getJurnal();
    const record = jurnal.find(r => r.id === id);
    if (!record) return res.status(404).json({ ok: false, error: 'Yozuv topilmadi' });

    const users = await store.getUsers();
    const userData = users[req.user.login] || {};
    const userObyekt = userData.obyekt || 'Barchasi';
    const isAdmin = req.user.role === 'admin';
    const recordObyekt = record.obyekt || 'Barchasi';

    if (!isAdmin && userObyekt !== 'Barchasi' && recordObyekt !== userObyekt) {
      return res.status(403).json({ ok: false, error: 'Siz faqat o\'z obyektingizdagi yozuvlarni o\'chirishingiz mumkin' });
    }

    const removed = await store.deleteJurnalEntry(id);
    if (!removed) return res.status(404).json({ ok: false, error: 'Yozuv topilmadi' });

    await store.addHistoryEntry({
      action: 'delete',
      ...removed,
      deletedBy: req.user?.login || 'system'
    });

    res.json({ ok: true, data: removed });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/journal/restore/:historyIndex — tarixdan tiklash (RBAC bilan)
router.post('/restore/:historyIndex', authMiddleware, async (req, res) => {
  try {
    const histIdx = parseInt(req.params.historyIndex);
    const history = await store.getHistory();
    if (histIdx < 0 || histIdx >= history.length) {
      return res.status(404).json({ ok: false, error: 'Tarix yozuvi topilmadi' });
    }

    const users = await store.getUsers();
    const userData = users[req.user.login] || {};
    const userObyekt = userData.obyekt || 'Barchasi';
    const isAdmin = req.user.role === 'admin';
    const entryObyekt = history[histIdx].obyekt || 'Barchasi';

    if (!isAdmin && userObyekt !== 'Barchasi' && entryObyekt !== userObyekt) {
      return res.status(403).json({ ok: false, error: 'Siz faqat o\'z obyektingizdagi yozuvlarni tiklashingiz mumkin' });
    }

    const entry = history[histIdx];
    const restored = await store.addJurnalEntry({
      tur: entry.tur,
      sana: entry.sana,
      mahsulot: entry.mahsulot,
      miqdor: entry.miqdor,
      narx: entry.narx,
      summa: entry.summa,
      tomon: entry.tomon,
      obyekt: entry.obyekt,
      izoh: entry.izoh,
      operator: entry.operator,
      restoredBy: req.user?.login || 'system'
    });

    await store.deleteHistoryEntry(entry.id);

    res.json({ ok: true, data: restored });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;