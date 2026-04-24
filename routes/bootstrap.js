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
    const allowedObyekt = user.obyekt || 'Barchasi';

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

    if (!isAdmin && allowedObyekt !== 'Barchasi') {
      jurnal = jurnal.filter(r => r.obyekt === allowedObyekt);
      history = history.filter(r => r.obyekt === allowedObyekt);
      transfers = transfers.filter(r => r.from === allowedObyekt || r.to === allowedObyekt);
      inventarizatsiya = inventarizatsiya.filter(r => r.obyekt === allowedObyekt);
      obyektlar = obyektlar.filter(o => o === allowedObyekt || o === 'Barchasi');
    }

    const safeUsers = {};
    Object.entries(users).forEach(([login, data]) => {
      safeUsers[login] = {
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