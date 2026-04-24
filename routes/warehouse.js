/**
 * Warehouse routes — Skladchi & Buxgalter funksiyalari
 * Transfer, Inventarizatsiya, Debitor/Kreditor, To'lovlar
 */
const router = require('express').Router();
const path = require('path');
const { authMiddleware, minRole } = require('../middleware/auth');
const store = require('../store');

// ══════════════════════════════════════
// TRANSFER (Ombor o'rtasida)
// ══════════════════════════════════════
router.get('/transfers', authMiddleware, async (req, res) => {
  res.json({ ok: true, data: await store.getTransfers() });
});

router.post('/transfers', authMiddleware, async (req, res) => {
  const { fromObyekt, toObyekt, mahsulot, miqdor, izoh } = req.body;
  if (!fromObyekt || !toObyekt || !mahsulot || !miqdor) {
    return res.status(400).json({ ok: false, error: 'fromObyekt, toObyekt, mahsulot, miqdor kerak' });
  }

  // RBAC: Obyekt tekshirish
  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = req.user.role === 'admin';
  
  // Admin bo'lmasa va o'z obyekti "Barchasi" bo'lmasa
  if (!isAdmin && userObyekt !== 'Barchasi') {
    if (fromObyekt !== userObyekt) {
      return res.status(403).json({ ok: false, error: 'Siz faqat o\'z obyektingizdan transfer qilishingiz mumkin' });
    }
  }

  // Qoldiqni tekshirish va FIFO orqali narxlarni olish
  let chunks = [];
  try {
    chunks = await store.calculateFifo(mahsulot, fromObyekt, Number(miqdor));
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  // Har bir FIFO bo'lagi uchun alohida Transfer yozuvlarini kiritish
  for (const chunk of chunks) {
    // Chiqim (eski obyektdan)
    await store.addJurnalEntry({
      tur: 'Chiqim', sana: new Date().toLocaleDateString('uz-UZ'),
      mahsulot, miqdor: chunk.miqdor, narx: chunk.narx, summa: chunk.miqdor * chunk.narx,
      tomon: `Transfer → ${toObyekt}`, obyekt: fromObyekt,
      izoh: `Transfer: ${fromObyekt} → ${toObyekt}. ${izoh || ''}`,
      operator: req.user?.login || 'system'
    });

    // Kirim (yangi obyektga)
    await store.addJurnalEntry({
      tur: 'Kirim', sana: new Date().toLocaleDateString('uz-UZ'),
      mahsulot, miqdor: chunk.miqdor, narx: chunk.narx, summa: chunk.miqdor * chunk.narx,
      tomon: `Transfer ← ${fromObyekt}`, obyekt: toObyekt,
      izoh: `Transfer: ${fromObyekt} → ${toObyekt}. ${izoh || ''}`,
      operator: req.user?.login || 'system'
    });
  }

  // Transfer jurnali
  const transfer = await store.addTransfer({
    fromObyekt, toObyekt, mahsulot, miqdor: Number(miqdor),
    izoh: izoh || '', operator: req.user?.login || 'system'
  });

  res.json({ ok: true, data: transfer });
});

// ══════════════════════════════════════
// INVENTARIZATSIYA
// ══════════════════════════════════════
router.get('/inventarizatsiya', authMiddleware, async (req, res) => {
  res.json({ ok: true, data: await store.getInventarizatsiya() });
});

router.post('/inventarizatsiya', authMiddleware, async (req, res) => {
  const { obyekt, items } = req.body;
  // items = [{ mahsulot, haqiqiy, tizimda }]
  if (!obyekt || !Array.isArray(items)) {
    return res.status(400).json({ ok: false, error: 'obyekt va items kerak' });
  }

  // RBAC: Obyekt tekshirish
  const users = await store.getUsers();
  const userData = users[req.user.login] || {};
  const userObyekt = userData.obyekt || 'Barchasi';
  const isAdmin = req.user.role === 'admin' || req.user.role === 'owner';

  if (!isAdmin && !userObyekt.includes('Barchasi') && !userObyekt.includes(obyekt)) {
    return res.status(403).json({ ok: false, error: 'Siz faqat o\'z obyektingizda inventarizatsiya qilishingiz mumkin' });
  }

  const jurnal = await store.getJurnal();
  const qoldiq = await store.computeQoldiq(jurnal, obyekt);
  const diffs = [];

  for (const item of items) {
    const tizimdagi = qoldiq[item.mahsulot]?.qoldiq || 0;
    const haqiqiy = Number(item.haqiqiy) || 0;
    const farq = haqiqiy - tizimdagi;
    console.log(`[INVENTAR] mahsulot: ${item.mahsulot}, tizimda: ${tizimdagi}, haqiqiy: ${haqiqiy}, farq: ${farq}`);

    if (farq !== 0) {
      // FIFO narxini olish
      let narx = 0;
      let summa = 0;
      try {
        const chunks = await store.calculateFifo(item.mahsulot, obyekt, Math.abs(farq));
        console.log(`[INVENTAR] FIFO chunks:`, JSON.stringify(chunks));
        if (chunks && chunks.length > 0) {
          // O'rtacha narxni olish
          let totalSum = 0;
          let totalQty = 0;
          chunks.forEach(c => {
            totalSum += c.miqdor * c.narx;
            totalQty += c.miqdor;
          });
          narx = totalQty > 0 ? Math.round(totalSum / totalQty) : 0;
          summa = Math.round(Math.abs(farq) * narx);
          console.log(`[INVENTAR] narx: ${narx}, summa: ${summa}`);
        } else {
          // FIFO bo'sh bo'lsa, oxirgi narxni olishga harakat qilamiz
          console.log(`[INVENTAR] FIFO bo'sh, oxirgi narxni izlaymiz...`);
          const productEntries = jurnal.filter(r => store.clean(r.mahsulot) === store.clean(item.mahsulot) && r.tur === 'Kirim' && Number(r.narx) > 0);
          if (productEntries.length > 0) {
            narx = productEntries[productEntries.length - 1].narx;
            summa = Math.round(Math.abs(farq) * narx);
            console.log(`[INVENTAR] oxirgi narx: ${narx}`);
          }
        }
      } catch (e) {
        console.log('[INVENTAR] FIFO xato:', e.message);
        // Xato bo'lsa ham oxirgi narxni olishga harakat qilamiz
        try {
          const productEntries = jurnal.filter(r => store.clean(r.mahsulot) === store.clean(item.mahsulot) && r.tur === 'Kirim' && Number(r.narx) > 0);
          if (productEntries.length > 0) {
            narx = productEntries[productEntries.length - 1].narx;
            summa = Math.round(Math.abs(farq) * narx);
            console.log(`[INVENTAR] xato bo'ldi, oxirgi narx: ${narx}`);
          }
        } catch(e2) {}
      }

      // Tuzatish kiritish
      await store.addJurnalEntry({
        tur: farq > 0 ? 'Kirim' : 'Chiqim',
        sana: new Date().toLocaleDateString('uz-UZ'),
        mahsulot: item.mahsulot,
        miqdor: Math.abs(farq), narx, summa,
        tomon: 'Inventarizatsiya',
        obyekt,
        izoh: `Inventarizatsiya tuzatishi. Tizimda: ${tizimdagi}, Haqiqiy: ${haqiqiy}`,
        operator: req.user?.login || 'system'
      });

      diffs.push({ mahsulot: item.mahsulot, tizimdagi, haqiqiy, farq, narx, summa });
    }
  }

  const inv = await store.addInventarizatsiya({
    obyekt,
    itemsCount: items.length,
    diffsCount: diffs.length,
    diffs,
    operator: req.user?.login || 'system'
  });

  res.json({ ok: true, data: inv });
});

// DELETE /api/warehouse/inventarizatsiya/:id - inventarizatsiyani o'chirish (faqat admin)
router.delete('/inventarizatsiya/:id', authMiddleware, async (req, res) => {
  try {
    // Faqat admin yoki owner o'chira oladi
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ ok: false, error: 'Faqat admin yoki owner o\'chira oladi' });
    }
    
    const id = req.params.id;
    const deleted = await store.deleteInventarizatsiya(id);
    if (!deleted) {
      return res.status(404).json({ ok: false, error: 'Topilmadi' });
    }
    res.json({ ok: true, data: deleted });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ══════════════════════════════════════
// DEBITORLAR (bizga qarzdor)
// ══════════════════════════════════════
router.get('/debtors', authMiddleware, minRole('pro'), async (req, res) => {
  res.json({ ok: true, data: await store.getDebtors() });
});

router.post('/debtors', authMiddleware, minRole('pro'), async (req, res) => {
  const { firma, summa, sana, muddati, izoh } = req.body;
  if (!firma || !summa) return res.status(400).json({ ok: false, error: 'Firma va summa kerak' });

  const entry = await store.addDebtor({
    firma: store.clean(firma),
    summa: Number(summa) || 0,
    paid: 0,
    sana: sana || new Date().toLocaleDateString('uz-UZ'),
    muddati: muddati || '',
    izoh: izoh || '',
    status: 'active',
    operator: req.user?.login || 'system'
  });

  res.json({ ok: true, data: entry });
});

router.put('/debtors/:id', authMiddleware, minRole('pro'), async (req, res) => {
  const updated = await store.updateDebtor(req.params.id, req.body);
  if (!updated) return res.status(404).json({ ok: false, error: 'Topilmadi' });
  res.json({ ok: true, data: updated });
});

// ══════════════════════════════════════
// KREDITORLAR (biz qarzdormiz)
// ══════════════════════════════════════
router.get('/creditors', authMiddleware, minRole('pro'), async (req, res) => {
  res.json({ ok: true, data: await store.getCreditors() });
});

router.post('/creditors', authMiddleware, minRole('pro'), async (req, res) => {
  const { firma, summa, sana, muddati, izoh } = req.body;
  if (!firma || !summa) return res.status(400).json({ ok: false, error: 'Firma va summa kerak' });

  const entry = await store.addCreditor({
    firma: store.clean(firma),
    summa: Number(summa) || 0,
    paid: 0,
    sana: sana || new Date().toLocaleDateString('uz-UZ'),
    muddati: muddati || '',
    izoh: izoh || '',
    status: 'active',
    operator: req.user?.login || 'system'
  });

  res.json({ ok: true, data: entry });
});

router.put('/creditors/:id', authMiddleware, minRole('pro'), async (req, res) => {
  const updated = await store.updateCreditor(req.params.id, req.body);
  if (!updated) return res.status(404).json({ ok: false, error: 'Topilmadi' });
  res.json({ ok: true, data: updated });
});

// ══════════════════════════════════════
// TO'LOVLAR
// ══════════════════════════════════════
router.get('/payments', authMiddleware, minRole('pro'), async (req, res) => {
  res.json({ ok: true, data: await store.getPayments() });
});

router.post('/payments', authMiddleware, minRole('pro'), async (req, res) => {
  const { type, targetId, firma, summa, izoh } = req.body;
  if (!firma || !summa) return res.status(400).json({ ok: false, error: 'Firma va summa kerak' });

  const payment = await store.addPayment({
    type: type || 'incoming', // incoming = debitordan bizga, outgoing = bizdan kreditorga
    targetId: targetId || '',
    firma: store.clean(firma),
    summa: Number(summa) || 0,
    izoh: izoh || '',
    operator: req.user?.login || 'system'
  });

  // Debitor/Kreditor summani yangilash
  if (targetId) {
    if (type === 'incoming') {
      const debtors = await store.getDebtors();
      const debtor = debtors.find(d => d.id === targetId);
      if (debtor) {
        await store.updateDebtor(targetId, { paid: (Number(debtor.paid) || 0) + (Number(summa) || 0) });
      }
    } else {
      const creditors = await store.getCreditors();
      const creditor = creditors.find(c => c.id === targetId);
      if (creditor) {
        await store.updateCreditor(targetId, { paid: (Number(creditor.paid) || 0) + (Number(summa) || 0) });
      }
    }
  }

  res.json({ ok: true, data: payment });
});

// ══════════════════════════════════════
// TELEFON UCHUN INVENTARIZATSIYA SAHIFASI
// ══════════════════════════════════════

// Telefon sahifasini serv qilish
router.get('/mobile/inventar/:token', (req, res) => {
  const { token } = req.params;
  const { obyekt, user } = decodeToken(token);
  
  if (!obyekt) {
    return res.status(400).send('<h1>Noto\'g\'ri yoki eskirgan link</h1>');
  }
  
  res.sendFile(path.join(__dirname, '../public/inventar-mobile.html'));
});

// Inventarizatsiya uchun token yaratish
router.post('/mobile/token', authMiddleware, async (req, res) => {
  const { obyekt } = req.body;
  if (!obyekt) return res.status(400).json({ ok: false, error: 'Obyekt kerak' });
  
  const token = createInventarToken(req.user.login, obyekt);
  
  // Local IP ni olish (telefon uchun)
  const localIP = req.app.get('localIP') || 'localhost';
  const PORT = req.app.get('port') || 3000;
  const scheme = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  
  // Telefon uchun to'g'ridan-to'g'ri IP, brauzer uchun xost
  const forwarded = req.headers['x-forwarded-host'];
  const host = forwarded || req.headers.host;
  const link = host && !host.includes('localhost') 
    ? `${scheme}://${host}/api/warehouse/mobile/inventar/${token}`
    : `http://${localIP}:${PORT}/api/warehouse/mobile/inventar/${token}`;
  
  // Linkni inv-links.json ga saqlash
  const invLink = await store.addInvLink(token, obyekt, req.user.login);
  console.log('📱 Link yaratildi:', invLink);
  
  res.json({ ok: true, token, link, obyekt, localIP, invLinkId: invLink.id });
});

// Inventarizatsiya sahifasi uchun ma'lumot olish
router.get('/mobile/data/:token', async (req, res) => {
  const { token } = req.params;
  const { obyekt, user } = decodeToken(token);
  
  if (!obyekt) {
    return res.status(400).json({ ok: false, error: 'Noto\'g\'ri token' });
  }

  if (await isTokenUsedInDb(token)) {
    return res.status(400).json({ ok: false, error: 'Bu link allaqachon ishlatilgan!' });
  }
  
  const jurnal = await store.getJurnal();
  const qoldiq = await store.computeQoldiq(jurnal, obyekt);
  
  const products = Object.entries(qoldiq).map(([nom, data]) => ({
    mahsulot: nom,
    tizimda: data.qoldiq,
    fifoNarx: data.narx || 0,
    fifoSumma: (data.qoldiq || 0) * (data.narx || 0)
  }));
  
  res.json({ ok: true, obyekt, user, products });
});

// Tokenni bekor qilish (ishlatilgandan keyin) - data/:token dan OLDIN bo'lishi kerak
router.post('/mobile/mark-used', async (req, res) => {
  const { token } = req.body;
  if (token) {
    await store.updateInvLink(token, 'yakunlandi', []);
  }
  res.json({ ok: true });
});

// Inventarizatsiyani yakunlash
router.post('/mobile/submit', async (req, res) => {
  const { token, items } = req.body;
  
  // Birinchiga tokenni tekshirish - agar ishlatilgan/ bekor qilingan bo'lsa xato qaytarish
  if (await isTokenUsedInDb(token)) {
    return res.status(400).json({ ok: false, error: 'Bu link allaqachon ishlatilgan!' });
  }
  
  const decoded = decodeToken(token);
  if (decoded.error) {
    return res.status(400).json({ ok: false, error: decoded.error });
  }
  
  const { obyekt, user } = decoded;
  
  if (!obyekt || !Array.isArray(items)) {
    return res.status(400).json({ ok: false, error: 'Ma\'lumotlar to\'liq emas' });
  }
  
  // Tokenni darhol yakunlangan deb belgilash (ikkinchi marta kirishni bloklash)
  await store.updateInvLink(token, 'yakunlandi', []);
  
  const jurnal = await store.getJurnal();
  const qoldiq = await store.computeQoldiq(jurnal, obyekt);
  const diffs = [];
  
  for (const item of items) {
    const tizimdagi = qoldiq[item.mahsulot]?.qoldiq || 0;
    const haqiqiy = Number(item.haqiqiy) || 0;
    const farq = haqiqiy - tizimdagi;
    
    if (farq !== 0) {
      // FIFO bo'yicha narxni olish
      let narx = 0;
      let summa = 0;
      try {
        const chunks = await store.calculateFifo(item.mahsulot, obyekt, Math.abs(farq));
        console.log(`FIFO: ${item.mahsulot}, obyekt: ${obyekt}, farq: ${farq}, chunks:`, chunks);
        if (chunks && chunks.length > 0) {
          narx = chunks[0].narx || 0;
          summa = Math.abs(farq) * narx;
        } else {
          // FIFO bo'sh bo'lsa, tizimdagi o'rtacha narxni olish
          const itemData = qoldiq[item.mahsulot];
          narx = itemData?.narx || 0;
          summa = Math.abs(farq) * narx;
          console.log(`FIFO bo'sh, o'rtacha narx: ${narx}`);
        }
      } catch (e) {
        console.error('FIFO xato:', e);
        const itemData = qoldiq[item.mahsulot];
        narx = itemData?.narx || 0;
        summa = Math.abs(farq) * narx;
      }
      
      await store.addJurnalEntry({
        tur: farq > 0 ? 'Kirim' : 'Chiqim',
        sana: new Date().toLocaleDateString('uz-UZ'),
        mahsulot: item.mahsulot,
        miqdor: Math.abs(farq),
        narx: narx,
        summa: summa,
        tomon: 'Inventarizatsiya',
        obyekt,
        izoh: `Inventarizatsiya tuzatishi. Tizimda: ${tizimdagi}, Haqiqiy: ${haqiqiy}`,
        operator: user || 'system'
      });
      
      diffs.push({
        mahsulot: item.mahsulot,
        tizimda: tizimdagi,
        haqiqiy,
        farq,
        narx,
        summa
      });
    }
  }
  
  // Linkni yangilash - yakunlandi
  console.log('✅ Inventarizatsiya yakunlandi, link yangilanmoqda:', token);
  await store.updateInvLink(token, 'yakunlandi', diffs);
  
  // Inventarizatsiya tarixiga saqlash
  await store.addInventarizatsiya({
    obyekt,
    itemsCount: items.length,
    diffsCount: diffs.length,
    diffs,
    operator: user || 'system'
  });
  
  // Excel uchun ma'lumot tayyorlash
  const XLSX = require('xlsx');
  const ws_data = [
    ['INVENTARIZATSIYA HISOBOTI'],
    [`Obyekt: ${obyekt}`],
    [`Sana: ${new Date().toLocaleDateString('uz-UZ')}`],
    [`Operator: ${user || 'N/A'}`],
    [],
    ['#', 'Mahsulot', 'Tizimda', 'Haqiqiy', 'Farq', 'Narx', 'Summa']
  ];
  
  let totalSumma = 0;
  diffs.forEach((d, i) => {
    const s = Math.abs(d.farq) * d.narx;
    totalSumma += s;
    ws_data.push([i + 1, d.mahsulot, d.tizimda, d.haqiqiy, d.farq, d.narx, s]);
  });
  
  ws_data.push([]);
  ws_data.push(['JAMI FARQ SUMMA:', '', '', '', '', '', totalSumma]);
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Ustunlar kengligi
  ws['!cols'] = [
    { wch: 5 },   // #
    { wch: 25 },  // Mahsulot
    { wch: 10 },  // Tizimda
    { wch: 10 },  // Haqiqiy
    { wch: 10 },  // Farq
    { wch: 12 },  // Narx
    { wch: 15 }   // Summa
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Farqlar');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  
  res.json({
    ok: true,
    diffs,
    totalSumma,
    excelFile: excelBuffer.toString('base64'),
    fileName: `inventarizatsiya_${obyekt}_${new Date().toISOString().slice(0,10)}.xlsx`
  });
});

// Token ishlatilganligini tekshirish
router.get('/mobile/check/:token', async (req, res) => {
  const { token } = req.params;
  const isUsed = await isTokenUsedInDb(token);
  res.json({ ok: true, used: isUsed });
});

// Linklar ro'yxatini olish
router.get('/inv-links', authMiddleware, async (req, res) => {
  const links = await store.getInvLinks();
  res.json({ ok: true, data: links });
});

// Linkni bekor qilish
router.post('/inv-links/cancel', authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'ID kerak' });
    
    const links = await store.getInvLinks();
    const idx = links.findIndex(l => l.id === id);
    if (idx !== -1) {
      links[idx].status = 'bekor';
      links[idx].diffs = []; // farqlarni tozalash
      links[idx].yakunlanganVaqt = '';
      links[idx].bekorVaqt = new Date().toLocaleTimeString('uz-UZ');
      // store.saveInvLinks yo'q, updateInvLink ishlatamiz yoki schema bo'yicha update qilamiz
      // Lekin bu yerda to'g'ridan-to'g'ri update qilish yaxshi
      await store.updateInvLink(links[idx].token, 'bekor', []);
      console.log('Link bekor qilindi:', id);
      res.json({ ok: true });
    } else {
      res.status(404).json({ ok: false, error: 'Topilmadi' });
    }
  } catch (e) {
    console.error('Linkni bekor qilishda xato:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Token yaratish
function createInventarToken(user, obyekt) {
  const payload = { user, obyekt, exp: Date.now() + 24 * 60 * 60 * 1000 };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

// Tokenni dekodlash
function decodeToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
    if (payload.exp < Date.now()) return { error: 'Link eskirgan' };
    return { user: payload.user, obyekt: payload.obyekt };
  } catch (e) {
    return { error: 'Noto\'g\'ri link' };
  }
}

async function isTokenUsedInDb(token) {
  const link = await store.getInvLinkByToken(token);
  if (!link) return true; // bazada yo'q bo'lsa, xavfsizlik uchun "yaroqsiz" deb olamiz
  return (link.status || '').toLowerCase() !== 'jarayonda';
}

module.exports = router;
