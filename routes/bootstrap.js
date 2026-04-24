/**
 * Bootstrap route — Barcha ma'lumotlarni yuklash
 */
const router = require('express').Router();
const store = require('../store');
const { authMiddleware } = require('../middleware/auth');

// GET /api/bootstrap
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userRole = req.user.role;
    const user = await store.getUser(req.user.login) || {};
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    // Allowed obyektni to'g'ri formatda olish
    let allowedObyekt = user.obyekt || 'Barchasi';
    if (typeof allowedObyekt === 'string') {
      try {
        allowedObyekt = JSON.parse(allowedObyekt);
      } catch (e) {
        allowedObyekt = [allowedObyekt];
      }
    }
    if (!Array.isArray(allowedObyekt)) {
      allowedObyekt = [allowedObyekt];
    }

    const users = await store.getUsers();
    let jurnal = await store.getJurnal();
    let history = await store.getHistory();
    const katalog = await store.getKatalog();
    let obyektlar = await store.getObyektlar();
    const omborlar = await store.getOmborlar();
    const firms = await store.getFirms();
    const settings = await store.getSettings();
    let transfers = await store.getTransfers();
    let inventarizatsiya = await store.getInventarizatsiya();
    const minStock = await store.getMinStock();
    const debtors = await store.getDebtors();
    const creditors = await store.getCreditors();
    const payments = await store.getPayments();

    if (!isAdmin && !allowedObyekt.includes('Barchasi')) {
      jurnal = jurnal.filter(r => allowedObyekt.includes(r.obyekt));
      history = history.filter(r => allowedObyekt.includes(r.obyekt));
      transfers = transfers.filter(r => allowedObyekt.includes(r.from) || allowedObyekt.includes(r.to));
      inventarizatsiya = inventarizatsiya.filter(r => allowedObyekt.includes(r.obyekt));
      obyektlar = obyektlar.filter(o => allowedObyekt.includes(o) || o === 'Barchasi');
    }

    const safeUsers = {};
    Object.entries(users).forEach(([login, data]) => {
      // Obyektni to'g'ri formatda qaytarish
      let obyektValue = data.obyekt || 'Barchasi';
      if (typeof obyektValue === 'string') {
        try {
          obyektValue = JSON.parse(obyektValue);
        } catch (e) {
          obyektValue = [obyektValue];
        }
      }
      if (!Array.isArray(obyektValue)) {
        obyektValue = [obyektValue];
      }

      safeUsers[login] = {
        login,
        role: data.role || 'free',
        active: data.active !== false,
        obyekt: obyektValue,
        ombor: data.ombor || 'Barchasi',
        telegramId: data.telegram_id || '',
        canEditJurnal: !!data.can_edit_jurnal,
        canDeleteJurnal: !!data.can_delete_jurnal,
        block: data.block || ''
      };
    });

    const allObyektlar = await store.getObyektlar();

    res.json({
      ok: true,
      users: safeUsers,
      jurnal,
      history,
      katalog,
      obyektlar,
      allObyektlar,
      omborlar,
      firms,
      settings,
      transfers,
      inventarizatsiya,
      minStock,
      debtors,
      creditors,
      payments
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;