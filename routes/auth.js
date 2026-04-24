/**
 * Auth routes — Login / Logout
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../store');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ ok: false, error: 'Login va parol kiriting' });

  const users = await store.getUsers();
  const username = login.trim().toLowerCase();
  const user = users[username];

  if (!user || user.pass !== password) {
    return res.status(401).json({ ok: false, error: 'Login yoki parol noto\'g\'ri' });
  }
  if (!user.active) {
    return res.status(403).json({ ok: false, error: 'Foydalanuvchi bloklangan' });
  }

  const token = jwt.sign(
    { login: username, role: user.role || 'free', obyekt: user.obyekt || 'Barchasi' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES }
  );

  res.json({
    ok: true,
    token,
    user: {
      login: username,
      role: user.role || 'free',
      obyekt: user.obyekt || 'Barchasi',
      ombor: user.ombor || 'Barchasi',
      canEditJurnal: !!user.can_edit_jurnal,
      canDeleteJurnal: !!user.can_delete_jurnal,
      telegramId: user.telegram_id || ''
    }
  });
});

// GET /api/auth/me — current user info
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
  const user = await store.getUser(req.user.login);
  if (!user) return res.status(404).json({ ok: false, error: 'User topilmadi' });
  res.json({
    ok: true,
    user: {
      login: req.user.login,
      role: user.role || 'free',
      obyekt: user.obyekt || 'Barchasi',
      ombor: user.ombor || 'Barchasi',
      canEditJurnal: !!user.can_edit_jurnal,
      canDeleteJurnal: !!user.can_delete_jurnal
    }
  });
});

module.exports = router;
