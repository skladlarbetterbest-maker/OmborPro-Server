/**
 * Telegram Bots — admin CRUD
 */
const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const store = require('../store');
const botMgr = require('../bot');
const log = require('../utils/logger')('routes:telegram');

function safeBot(b) {
  if (!b) return null;
  return {
    id: b.id,
    name: b.name,
    tokenMasked: maskToken(b.token),
    accessCode: b.access_code,
    active: b.active,
    createdBy: b.created_by,
    createdAt: b.created_at,
    running: botMgr.activeBots.has(b.id)
  };
}

function maskToken(t) {
  if (!t) return '';
  if (t.length < 12) return '***';
  return t.slice(0, 6) + '...' + t.slice(-4);
}

// GET /api/telegram/bots — barcha botlar
router.get('/bots', authMiddleware, adminOnly, async (req, res) => {
  try {
    const rows = await store.getTelegramBots();
    res.json({ ok: true, data: rows.map(safeBot) });
  } catch (e) {
    log.error('list failed', { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/telegram/bots — yangi bot qo'shish
router.post('/bots', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, token, accessCode } = req.body || {};
    if (!token || !accessCode) {
      return res.status(400).json({ ok: false, error: 'token va accessCode kerak' });
    }
    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
      return res.status(400).json({ ok: false, error: 'Token formati noto\'g\'ri' });
    }
    const row = await store.addTelegramBot({
      name: name || 'OmborPro Bot',
      token,
      accessCode,
      createdBy: req.user.login
    });
    log.info('Bot added', { id: row.id, by: req.user.login });

    // Avtomatik ishga tushirish
    try {
      await botMgr.restartBot(row);
    } catch (e) {
      log.error('Bot start after add failed', { error: e.message });
      return res.json({ ok: true, data: safeBot(row), warning: 'Bot DB ga saqlandi, lekin ishga tushmadi: ' + e.message });
    }

    res.json({ ok: true, data: safeBot(row) });
  } catch (e) {
    log.error('add failed', { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/telegram/bots/:id — yangilash (faollashtirish/o'chirish, kod o'zgartirish)
router.put('/bots/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, accessCode, active } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (accessCode !== undefined) updates.accessCode = String(accessCode);
    if (active !== undefined) updates.active = !!active;
    const row = await store.updateTelegramBot(id, updates);
    if (!row) return res.status(404).json({ ok: false, error: 'Topilmadi' });

    // Active holatiga moslab restart/stop
    if (active === false) {
      await botMgr.stopBot(id);
    } else if (active === true) {
      try { await botMgr.restartBot(row); }
      catch (e) { log.error('restart failed', { error: e.message }); }
    }

    log.info('Bot updated', { id, updates, by: req.user.login });
    res.json({ ok: true, data: safeBot(row) });
  } catch (e) {
    log.error('update failed', { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/telegram/bots/:id
router.delete('/bots/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    await botMgr.stopBot(id);
    await store.deleteTelegramBot(id);
    log.info('Bot deleted', { id, by: req.user.login });
    res.json({ ok: true });
  } catch (e) {
    log.error('delete failed', { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
