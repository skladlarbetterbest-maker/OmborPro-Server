/**
 * Reports routes — Hisobotlar va tahlil
 */
const router = require('express').Router();
const { authMiddleware, minRole } = require('../middleware/auth');
const store = require('../store');

// GET /api/reports/summary — umumiy statistika
router.get('/summary', authMiddleware, async (req, res) => {
  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = userData.role === 'admin' || userData.role === 'owner';
  
  let jurnal = await store.getJurnal();
  if (!isAdmin && userObyekt !== 'Barchasi') {
    jurnal = jurnal.filter(r => r.obyekt === userObyekt);
  }
  
  const totalKirim = jurnal.filter(r => r.tur === 'Kirim').reduce((s, r) => s + (Number(r.summa) || 0), 0);
  const totalChiqim = jurnal.filter(r => r.tur === 'Chiqim').reduce((s, r) => s + (Number(r.summa) || 0), 0);
  const qoldiq = await store.computeQoldiq(jurnal);
  const mahsulotlar = Object.keys(qoldiq).length;

  res.json({
    ok: true,
    data: { totalKirim, totalChiqim, balans: totalKirim - totalChiqim, mahsulotlar, jurnalCount: jurnal.length }
  });
});

// GET /api/reports/qoldiq — qoldiq bo'yicha
router.get('/qoldiq', authMiddleware, async (req, res) => {
  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = userData.role === 'admin' || userData.role === 'owner';
  
  let jurnal = await store.getJurnal();
  if (!isAdmin && userObyekt !== 'Barchasi') {
    jurnal = jurnal.filter(r => r.obyekt === userObyekt);
  }
  
  const obyekt = req.query.obyekt || 'Barchasi';
  const filtered = (isAdmin || userObyekt === 'Barchasi') && obyekt !== 'Barchasi' 
    ? jurnal.filter(r => r.obyekt === obyekt) 
    : jurnal;
  const qoldiq = await store.computeQoldiq(filtered);
  res.json({ ok: true, data: qoldiq, obyekt });
});

// GET /api/reports/filtered — filtrlangan hisobot (Pro)
router.get('/filtered', authMiddleware, async (req, res) => {
  const { from, to, type, firma, product, user, obyekt } = req.query;
  let jurnal = await store.getJurnal();

  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = userData.role === 'admin' || userData.role === 'owner';
  
  if (!isAdmin && userObyekt !== 'Barchasi') {
    jurnal = jurnal.filter(r => r.obyekt === userObyekt);
  } else if (obyekt && obyekt !== 'Barchasi') {
    jurnal = jurnal.filter(r => r.obyekt === obyekt);
  }

  if (from) { const fd = new Date(from); jurnal = jurnal.filter(r => parseDate(r.sana) >= fd); }
  if (to) { const td = new Date(to); td.setHours(23,59,59); jurnal = jurnal.filter(r => parseDate(r.sana) <= td); }
  if (type && type !== 'all') jurnal = jurnal.filter(r => r.tur === type);
  if (firma && firma !== 'all') jurnal = jurnal.filter(r => r.tomon === firma);
  if (product && product !== 'all') jurnal = jurnal.filter(r => r.mahsulot === product);
  if (user && user !== 'all') jurnal = jurnal.filter(r => r.operator === user);

  const totalK = jurnal.filter(r => r.tur === 'Kirim').reduce((s, r) => s + (Number(r.summa) || 0), 0);
  const totalC = jurnal.filter(r => r.tur === 'Chiqim').reduce((s, r) => s + (Number(r.summa) || 0), 0);

  res.json({ ok: true, data: jurnal, totalKirim: totalK, totalChiqim: totalC, count: jurnal.length });
});

// GET /api/reports/low-stock — kam qolgan mahsulotlar (Skladchi)
router.get('/low-stock', authMiddleware, async (req, res) => {
  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = userData.role === 'admin' || userData.role === 'owner';
  
  let jurnal = await store.getJurnal();
  if (!isAdmin && userObyekt !== 'Barchasi') {
    jurnal = jurnal.filter(r => r.obyekt === userObyekt);
  }
  
  const qoldiq = await store.computeQoldiq(jurnal);
  const minStock = await store.getMinStock();

  const lowItems = [];
  Object.entries(qoldiq).forEach(([nom, data]) => {
    const limit = minStock[nom] || 5;
    if (data.qoldiq <= limit) {
      lowItems.push({ nom, qoldiq: data.qoldiq, limit, status: data.qoldiq <= 0 ? 'tugagan' : 'kam' });
    }
  });

  res.json({ ok: true, data: lowItems });
});

// GET /api/reports/debtor-summary — debitor/kreditor holati (Buxgalter)
router.get('/debtor-summary', authMiddleware, async (req, res) => {
  const debtors = await store.getDebtors();
  const creditors = await store.getCreditors();
  const payments = await store.getPayments();

  const totalDebtor = debtors.reduce((s, d) => s + (Number(d.summa) || 0) - (Number(d.paid) || 0), 0);
  const totalCreditor = creditors.reduce((s, c) => s + (Number(c.summa) || 0) - (Number(c.paid) || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + (Number(p.summa) || 0), 0);

  res.json({
    ok: true,
    data: {
      totalDebtor, totalCreditor, totalPayments, balans: totalDebtor - totalCreditor,
      debtorsCount: debtors.length, creditorsCount: creditors.length
    }
  });
});

function parseDate(dateStr) {
  if (!dateStr) return null;
  let parts;
  if (dateStr.includes('.')) parts = dateStr.split('.');
  else if (dateStr.includes('/')) parts = dateStr.split('/');
  else if (dateStr.includes('-')) { const p = dateStr.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
  else return null;
  if (parts && parts.length === 3) return new Date(+parts[2], +parts[1]-1, +parts[0]);
  return null;
}

module.exports = router;