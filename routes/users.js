/**
 * Users routes — Foydalanuvchilarni boshqarish (Admin/Owner)
 */
const router = require('express').Router();
const { authMiddleware, adminOnly, ownerOnly } = require('../middleware/auth');
const store = require('../store');

// GET /api/users — barcha foydalanuvchilar
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const users = await store.getUsers();
  const safe = {};
  Object.entries(users).forEach(([login, data]) => {
    // Obyektni to'g'ri formatda qaytarish
    let obyektData = data.obyekt || 'Barchasi';
    if (typeof obyektData === 'string') {
      try {
        obyektData = JSON.parse(obyektData);
      } catch (e) {
        obyektData = [obyektData];
      }
    }
    if (!Array.isArray(obyektData)) {
      obyektData = [obyektData];
    }

    safe[login] = {
      login,
      role: data.role || 'free',
      active: data.active !== false,
      obyekt: obyektData,
      ombor: data.ombor || 'Barchasi',
      telegramId: data.telegram_id || '',
      canEditJurnal: !!data.can_edit_jurnal,
      canDeleteJurnal: !!data.can_delete_jurnal,
      block: data.block || ''
    };
  });
  res.json({ ok: true, data: safe });
});

// POST /api/users — yangi foydalanuvchi (faqat owner)
router.post('/', authMiddleware, ownerOnly, async (req, res) => {
  const { login, password, role, telegramId, obyekt, ombor, canEditJurnal, canDeleteJurnal } = req.body;
  if (!login || !password) return res.status(400).json({ ok: false, error: 'Login va parol kerak' });

  const allUsers = await store.getUsers();
  const username = login.trim().toLowerCase();
  if (allUsers[username] && allUsers[username].active !== false) return res.status(409).json({ ok: false, error: 'Bu login band' });

  const usedBlocks = Object.values(allUsers).map(u => u.block);
  const allBlocks = 'EFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const nextBlock = allBlocks.find(b => !usedBlocks.includes(b)) || 'Z';

  // Obyektni array sifatida saqlash
  let obyektValue = obyekt || 'Barchasi';
  if (Array.isArray(obyektValue)) {
    obyektValue = obyektValue.length > 0 ? obyektValue : ['Barchasi'];
  } else {
    obyektValue = [obyektValue];
  }

  await store.upsertUser(username, {
    pass: password,
    telegram_id: telegramId || '',
    block: nextBlock,
    active: true,
    role: role || 'free',
    obyekt: obyektValue,
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

  const targetUser = users[username];
  const updates = {};

  // Role o'zgartirish faqat owner uchun
  if (req.body.role !== undefined) {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ ok: false, error: 'Role o\'zgartirish faqat owner uchun!' });
    }
    updates.role = req.body.role;
  }

  // Admin yoki owner userni o'zgartirish faqat owner uchun (lekin o'zini o'zi o'zgartirishi mumkin)
  if ((targetUser.role === 'admin' || targetUser.role === 'owner') && req.user.role !== 'owner' && req.user.login !== username) {
    return res.status(403).json({ ok: false, error: 'Admin/Owner userni o\'zgartirish faqat owner uchun!' });
  }

  ['ombor', 'active', 'can_edit_jurnal', 'can_delete_jurnal'].forEach(key => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  // Obyektni array sifatida qabul qilish
  if (req.body.obyekt !== undefined) {
    let obyektValue = req.body.obyekt;
    if (Array.isArray(obyektValue)) {
      updates.obyekt = obyektValue.length > 0 ? obyektValue : ['Barchasi'];
    } else {
      updates.obyekt = [obyektValue];
    }
  }

  if (req.body.telegramId !== undefined) updates.telegram_id = req.body.telegramId;
  if (req.body.password) updates.pass = req.body.password;

  await store.upsertUser(username, updates);
  res.json({ ok: true });
});

// DELETE /api/users/:login — o'chirish (bloklash)
router.delete('/:login', authMiddleware, adminOnly, async (req, res) => {
  const username = req.params.login.toLowerCase();
  if (username === req.user.login) return res.status(400).json({ ok: false, error: 'O\'zingizni o\'chira olmaysiz' });

  const users = await store.getUsers();
  const targetUser = users[username];

  // Admin yoki owner userni o'chirish faqat owner uchun
  if ((targetUser.role === 'admin' || targetUser.role === 'owner') && req.user.role !== 'owner') {
    return res.status(403).json({ ok: false, error: 'Admin/Owner userni o\'chirish faqat owner uchun!' });
  }

  await store.deleteUser(username);
  res.json({ ok: true });
});

module.exports = router;