/**
 * Users routes — Foydalanuvchilarni boshqarish (Admin)
 */
const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const store = require('../store');

// GET /api/users — barcha foydalanuvchilar
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const users = await store.getUsers();
  const safe = {};
  Object.entries(users).forEach(([login, data]) => {
    safe[login] = {
      login,
      role: data.role || 'free',
      active: data.active !== false,
      obyekt: data.obyekt || 'Barchasi',
      ombor: data.ombor || 'Barchasi',
      telegramId: data.telegram_id || '',
      canEditJurnal: !!data.can_edit_jurnal,
      canDeleteJurnal: !!data.can_delete_jurnal,
      block: data.block || ''
    };
  });
  res.json({ ok: true, data: safe });
});

// POST /api/users — yangi foydalanuvchi
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { login, password, role, telegramId, obyekt, ombor, canEditJurnal, canDeleteJurnal } = req.body;
  if (!login || !password) return res.status(400).json({ ok: false, error: 'Login va parol kerak' });

  const allUsers = await store.getUsers();
  const username = login.trim().toLowerCase();
  if (allUsers[username] && allUsers[username].active !== false) return res.status(409).json({ ok: false, error: 'Bu login band' });

  const usedBlocks = Object.values(allUsers).map(u => u.block);
  const allBlocks = 'EFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const nextBlock = allBlocks.find(b => !usedBlocks.includes(b)) || 'Z';

  await store.upsertUser(username, {
    pass: password,
    telegram_id: telegramId || '',
    block: nextBlock,
    active: true,
    role: role || 'free',
    obyekt: obyekt || 'Barchasi',
    ombor: ombor || 'Barchasi',
    can_edit_jurnal: role !== 'free' ? (canEditJurnal !== false) : false,
    can_delete_jurnal: !!canDeleteJurnal
  });

  res.json({ ok: true });
});

// PUT /api/users/:login — yangilash
router.put('/:login', authMiddleware, adminOnly, async (req, res) => {
  const username = req.params.login.toLowerCase();
  const users = await store.getUsers();
  if (!users[username]) return res.status(404).json({ ok: false, error: 'Topilmadi' });

  const updates = {};
  ['role', 'obyekt', 'ombor', 'active', 'can_edit_jurnal', 'can_delete_jurnal'].forEach(key => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });
  if (req.body.telegramId !== undefined) updates.telegram_id = req.body.telegramId;
  if (req.body.password) updates.pass = req.body.password;

  await store.upsertUser(username, updates);
  res.json({ ok: true });
});

// DELETE /api/users/:login — o'chirish (bloklash)
router.delete('/:login', authMiddleware, adminOnly, async (req, res) => {
  const username = req.params.login.toLowerCase();
  if (username === req.user.login) return res.status(400).json({ ok: false, error: 'O\'zingizni o\'chira olmaysiz' });
  await store.deleteUser(username);
  res.json({ ok: true });
});

module.exports = router;