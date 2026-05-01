/**
 * OmborPro Telegram Bot Manager
 * - Bir nechta botni bir vaqtda boshqaradi (admin panelda qo'shilgan)
 * - Polling rejimida ishlaydi
 * - /start orqali kirish kodi so'raydi → user.login bilan bog'lanadi
 * - RBAC: faqat o'z obyektiga prixod/rasxod qila oladi
 */
const TelegramBot = require('node-telegram-bot-api');
const store = require('../store');
const log = require('../utils/logger')('bot');

// botId → TelegramBot instance
const activeBots = new Map();

function fmtNum(n) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0));
}

// ─── User helpers ───
async function getSessionUser(chatId) {
  const sess = await store.getTelegramSession(chatId);
  if (!sess || !sess.user_login) return null;
  const user = await store.getUser(sess.user_login);
  if (!user || !user.active) return null;
  return { session: sess, user };
}

function userObyektList(user) {
  let o = user.obyekt || ['Barchasi'];
  if (typeof o === 'string') {
    try { o = JSON.parse(o); } catch (e) { o = [o]; }
  }
  if (!Array.isArray(o)) o = [o];
  return o.length ? o : ['Barchasi'];
}

function canAccessObyekt(user, obyekt) {
  const list = userObyektList(user);
  if (list.includes('Barchasi')) return true;
  if (user.role === 'admin' || user.role === 'owner') return true;
  return list.includes(obyekt);
}

// ─── Menu ───
function mainMenu(user) {
  const list = userObyektList(user);
  return {
    reply_markup: {
      keyboard: [
        [{ text: '📊 Dashboard' }, { text: '📈 Hisobot' }],
        [{ text: '➕ Kirim' }, { text: '➖ Chiqim' }],
        [{ text: '🏢 Obyektlar' }, { text: 'ℹ️ Help' }],
        [{ text: '🚪 Chiqish' }]
      ],
      resize_keyboard: true
    }
  };
}

const HELP_TEXT = `📖 *OmborPro Bot — Buyruqlar*

🔹 /start — Botni qayta ishga tushirish (kod so'raydi)
🔹 /dashboard — Asosiy ko'rsatkichlar
🔹 /report — Hisobot (qoldiqlar)
🔹 /kirim — Yangi kirim qo'shish
🔹 /chiqim — Yangi chiqim qo'shish
🔹 /obyekt — Faol obyektni almashtirish
🔹 /NewFirm — Yangi firma/kontragent qo'shish
🔹 /NewContragent — /NewFirm sinonimi
🔹 /NewProduct — Yangi mahsulot qo'shish
🔹 /cancel — Joriy amalni bekor qilish
🔹 /logout — Chiqish (kod qayta so'raladi)
🔹 /Help — Shu yordam

ℹ️ Pastdagi tugmalardan ham foydalanishingiz mumkin.`;

// ─── Dashboard ───
async function buildDashboard(user) {
  const jurnal = await store.getJurnal();
  const list = userObyektList(user);
  const isAdmin = user.role === 'admin' || user.role === 'owner';
  const filterObyekt = (list.includes('Barchasi') || isAdmin) ? null : list[0];
  const filtered = filterObyekt ? jurnal.filter(r => r.obyekt === filterObyekt) : jurnal;

  let kirimSum = 0, chiqimSum = 0, kirimCnt = 0, chiqimCnt = 0;
  filtered.forEach(r => {
    const s = Number(r.summa) || 0;
    if (r.tur === 'Kirim') { kirimSum += s; kirimCnt++; }
    else if (r.tur === 'Chiqim') { chiqimSum += s; chiqimCnt++; }
  });
  const q = await store.computeQoldiq(filtered, filterObyekt || 'Barchasi');
  const products = Object.keys(q).length;
  const totalQoldiq = Object.values(q).reduce((s, v) => s + (Number(v.qoldiq) || 0) * (Number(v.narx) || 0), 0);

  return `📊 *Dashboard* — _${user.login}_
🏢 Obyekt: *${filterObyekt || 'Barchasi'}*

➕ Kirim: ${kirimCnt} ta / ${fmtNum(kirimSum)} so'm
➖ Chiqim: ${chiqimCnt} ta / ${fmtNum(chiqimSum)} so'm
📦 Mahsulotlar: *${products}*
💰 Qoldiq qiymati: *${fmtNum(totalQoldiq)} so'm*`;
}

async function buildReport(user) {
  const jurnal = await store.getJurnal();
  const list = userObyektList(user);
  const isAdmin = user.role === 'admin' || user.role === 'owner';
  const filterObyekt = (list.includes('Barchasi') || isAdmin) ? null : list[0];
  const filtered = filterObyekt ? jurnal.filter(r => r.obyekt === filterObyekt) : jurnal;
  const q = await store.computeQoldiq(filtered, filterObyekt || 'Barchasi');
  const rows = Object.entries(q).filter(([_, v]) => (v.qoldiq || 0) > 0.0001)
    .sort((a, b) => (b[1].qoldiq || 0) - (a[1].qoldiq || 0)).slice(0, 30);
  if (!rows.length) return '📈 Qoldiq bo\'sh.';
  let txt = `📈 *Qoldiq* (${filterObyekt || 'Barchasi'}) — top ${rows.length}\n\n`;
  rows.forEach(([nom, v], i) => {
    txt += `${i + 1}. *${nom}* — ${fmtNum(v.qoldiq)} • narx: ${fmtNum(v.narx)}\n`;
  });
  return txt;
}

// ─── State machine ───
const STATE = {
  IDLE: 'idle',
  AWAIT_CODE: 'await_code',
  // Kirim/Chiqim wizard
  TR_PRODUCT: 'tr_product',
  TR_QTY: 'tr_qty',
  TR_PRICE: 'tr_price',
  TR_TOMON: 'tr_tomon',
  TR_OBYEKT: 'tr_obyekt',
  TR_CONFIRM: 'tr_confirm',
  // New firm/product
  NF_NAME: 'nf_name',
  NF_PHONE: 'nf_phone',
  NP_NAME: 'np_name',
  NP_UNIT: 'np_unit'
};

async function setState(chatId, state, dataPatch) {
  const sess = await store.getTelegramSession(chatId);
  const merged = Object.assign({}, sess?.state_data || {}, dataPatch || {});
  await store.upsertTelegramSession(chatId, { state, stateData: merged });
}

async function clearState(chatId) {
  await store.upsertTelegramSession(chatId, { state: STATE.IDLE, stateData: {} });
}

// ─── Wizard runner for Kirim/Chiqim ───
async function startTransaction(bot, chatId, tur, user) {
  await setState(chatId, STATE.TR_PRODUCT, { tur, started_at: Date.now() });
  const products = await store.getKatalog();
  const top = products.slice(0, 20).map(p => p.nom);
  const hint = top.length ? `\n\n_Mavjud:_ ${top.join(', ')}` : '';
  await bot.sendMessage(chatId,
    `${tur === 'Kirim' ? '➕ *KIRIM*' : '➖ *CHIQIM*'}\n\n📦 Mahsulot nomini kiriting:${hint}\n\n(yo'q bo'lsa: /NewProduct)`,
    { parse_mode: 'Markdown' });
}

async function handleTransactionStep(bot, chatId, text, user) {
  const sess = await store.getTelegramSession(chatId);
  const data = sess.state_data || {};
  const state = sess.state;

  if (state === STATE.TR_PRODUCT) {
    const products = await store.getKatalog();
    const found = products.find(p => p.nom.toLowerCase() === text.toLowerCase());
    if (!found) {
      await bot.sendMessage(chatId, `❌ "${text}" topilmadi.\n/NewProduct orqali qo'shing yoki qaytadan kiriting.`);
      return;
    }
    await setState(chatId, STATE.TR_QTY, { mahsulot: found.nom, olv: found.olv });
    await bot.sendMessage(chatId, `✅ *${found.nom}* (${found.olv || '-'})\n\n📏 Miqdor:`, { parse_mode: 'Markdown' });
    return;
  }

  if (state === STATE.TR_QTY) {
    const n = Number(String(text).replace(',', '.'));
    if (!n || n <= 0) {
      await bot.sendMessage(chatId, '❌ Miqdor noto\'g\'ri. Qaytadan:');
      return;
    }
    if (data.tur === 'Chiqim') {
      // narxni FIFO hisoblaydi
      await setState(chatId, STATE.TR_TOMON, { miqdor: n });
      await bot.sendMessage(chatId, '👤 Kontragent (firma/kim) nomi (yoki "-" bo\'sh qoldirish):');
    } else {
      await setState(chatId, STATE.TR_PRICE, { miqdor: n });
      await bot.sendMessage(chatId, '💰 Narx (1 dona uchun):');
    }
    return;
  }

  if (state === STATE.TR_PRICE) {
    const n = Number(String(text).replace(',', '.'));
    if (n < 0 || isNaN(n)) {
      await bot.sendMessage(chatId, '❌ Narx noto\'g\'ri. Qaytadan:');
      return;
    }
    await setState(chatId, STATE.TR_TOMON, { narx: n });
    await bot.sendMessage(chatId, '👤 Kontragent (firma/kim) nomi (yoki "-" bo\'sh qoldirish):');
    return;
  }

  if (state === STATE.TR_TOMON) {
    let tomon = (text || '').trim();
    if (tomon === '-' || tomon === '') tomon = '';
    if (tomon) {
      const firms = await store.getFirms();
      const found = firms.find(f => (f.name || '').toLowerCase() === tomon.toLowerCase());
      if (!found) {
        await bot.sendMessage(chatId, `❌ "${tomon}" firmasi yo'q.\n/NewFirm orqali qo'shing va qayta urinib ko'ring.`);
        return;
      }
      tomon = found.name;
    }
    // Obyekt tanlash
    const list = userObyektList(user);
    const isAdmin = user.role === 'admin' || user.role === 'owner';
    const allowed = (list.includes('Barchasi') || isAdmin)
      ? (await store.getObyektlar()).filter(o => o !== 'Barchasi')
      : list;
    if (allowed.length === 0) {
      await bot.sendMessage(chatId, '❌ Sizga tegishli obyekt yo\'q.');
      await clearState(chatId);
      return;
    }
    if (allowed.length === 1) {
      await setState(chatId, STATE.TR_CONFIRM, { tomon, obyekt: allowed[0] });
      await sendConfirm(bot, chatId);
      return;
    }
    await setState(chatId, STATE.TR_OBYEKT, { tomon, _allowed: allowed });
    await bot.sendMessage(chatId, '🏢 Obyektni tanlang:', {
      reply_markup: { keyboard: allowed.map(o => [{ text: o }]), resize_keyboard: true, one_time_keyboard: true }
    });
    return;
  }

  if (state === STATE.TR_OBYEKT) {
    const allowed = data._allowed || [];
    if (!allowed.includes(text)) {
      await bot.sendMessage(chatId, '❌ Ruxsat etilgan obyekt tanlang.');
      return;
    }
    await setState(chatId, STATE.TR_CONFIRM, { obyekt: text });
    await sendConfirm(bot, chatId);
    return;
  }

  if (state === STATE.TR_CONFIRM) {
    const t = (text || '').toLowerCase();
    if (t === 'ha' || t === '✅ tasdiq' || t === '/confirm' || t === 'tasdiq') {
      try {
        const d = (await store.getTelegramSession(chatId)).state_data;
        if (!canAccessObyekt(user, d.obyekt)) {
          await bot.sendMessage(chatId, '❌ Bu obyektga ruxsatingiz yo\'q.');
          await clearState(chatId);
          return;
        }
        let chunks;
        if (d.tur === 'Chiqim') {
          chunks = await store.calculateFifo(d.mahsulot, d.obyekt, Number(d.miqdor));
        } else {
          chunks = [{ miqdor: Number(d.miqdor), narx: Number(d.narx) || 0 }];
        }
        if (d.tomon) await store.upsertFirm(d.tomon);
        for (let i = 0; i < chunks.length; i++) {
          const c = chunks[i];
          await store.addJurnalEntry({
            tur: d.tur,
            sana: new Date().toLocaleDateString('uz-UZ'),
            mahsulot: d.mahsulot,
            miqdor: c.miqdor,
            narx: c.narx,
            summa: c.miqdor * c.narx,
            tomon: d.tomon || '',
            obyekt: d.obyekt,
            izoh: `Telegram bot${chunks.length > 1 ? ` (Qism ${i + 1})` : ''}`,
            operator: user.login
          });
        }
        log.info('Bot transaction saved', { user: user.login, tur: d.tur, mahsulot: d.mahsulot, miqdor: d.miqdor, obyekt: d.obyekt });
        await bot.sendMessage(chatId, `✅ *${d.tur}* saqlandi!\n📦 ${d.mahsulot} — ${fmtNum(d.miqdor)}\n🏢 ${d.obyekt}`,
          Object.assign({ parse_mode: 'Markdown' }, mainMenu(user)));
      } catch (e) {
        log.error('Bot transaction failed', { error: e.message, user: user.login });
        await bot.sendMessage(chatId, '❌ Xato: ' + e.message, mainMenu(user));
      }
      await clearState(chatId);
      return;
    }
    if (t === 'yo\'q' || t === 'bekor' || t === '/cancel') {
      await clearState(chatId);
      await bot.sendMessage(chatId, '↩️ Bekor qilindi.', mainMenu(user));
      return;
    }
    await bot.sendMessage(chatId, 'Tasdiqlash uchun *Ha* yoki *Yo\'q*:', { parse_mode: 'Markdown' });
    return;
  }
}

async function sendConfirm(bot, chatId) {
  const sess = await store.getTelegramSession(chatId);
  const d = sess.state_data;
  const summa = d.tur === 'Kirim' ? (Number(d.miqdor) * Number(d.narx || 0)) : null;
  const txt = `📋 *Tasdiqlang*\n\n` +
    `Turi: *${d.tur}*\n` +
    `📦 Mahsulot: *${d.mahsulot}*\n` +
    `📏 Miqdor: *${fmtNum(d.miqdor)}*\n` +
    (d.narx !== undefined ? `💰 Narx: *${fmtNum(d.narx)}*\n` : '🧮 Narx: _FIFO bo\'yicha avto_\n') +
    (summa !== null ? `Σ Summa: *${fmtNum(summa)}*\n` : '') +
    `👤 Tomon: *${d.tomon || '—'}*\n` +
    `🏢 Obyekt: *${d.obyekt}*\n\n` +
    `*Ha* / *Yo'q*?`;
  await bot.sendMessage(chatId, txt, {
    parse_mode: 'Markdown',
    reply_markup: { keyboard: [[{ text: 'Ha' }, { text: 'Yo\'q' }]], resize_keyboard: true, one_time_keyboard: true }
  });
}

// ─── Bot factory ───
function attachHandlers(bot, botRow) {
  const botId = botRow.id;

  bot.on('polling_error', (err) => {
    log.error('polling_error', { botId, name: botRow.name, error: err.message });
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const lc = text.toLowerCase();

    try {
      log.debug('Bot message', { botId, chatId, text: text.slice(0, 100) });

      // /start — kod so'rash
      if (lc === '/start') {
        await store.upsertTelegramSession(chatId, { botId, userLogin: null, state: STATE.AWAIT_CODE, stateData: {} });
        await bot.sendMessage(chatId,
          '👋 Salom! *OmborPro* botiga xush kelibsiz.\n\n🔑 Iltimos, kirish *kodini* kiriting:',
          { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } });
        return;
      }

      const sess = await store.getTelegramSession(chatId);

      // Kod kutilmoqda
      if (!sess || sess.state === STATE.AWAIT_CODE || !sess.user_login) {
        const fresh = await store.getTelegramBot(botId);
        if (!fresh || !fresh.active) {
          await bot.sendMessage(chatId, '❌ Bot faolsizlantirilgan.');
          return;
        }
        if (text === fresh.access_code) {
          // Code valid → user_login ni telegram_id orqali yoki birinchi admin orqali bog'lash
          // Strategiya: telegram_id == chatId bo'lgan userni topish; topilmasa — owner/admin tanlash
          const allUsers = await store.getUsers();
          let matched = Object.values(allUsers).find(u => String(u.telegram_id) === String(chatId));
          if (!matched) {
            // Birinchi marta — kodni bilgan har qanday foydalanuvchi sifatida login so'raymiz
            await store.upsertTelegramSession(chatId, { botId, state: 'await_login', stateData: {} });
            await bot.sendMessage(chatId, '✅ Kod to\'g\'ri.\n\n📝 Endi tizimdagi *login*ingizni kiriting:', { parse_mode: 'Markdown' });
            return;
          }
          await store.upsertTelegramSession(chatId, { botId, userLogin: matched.login, state: STATE.IDLE, stateData: {} });
          await bot.sendMessage(chatId, `✅ Xush kelibsiz, *${matched.login}*!`, Object.assign({ parse_mode: 'Markdown' }, mainMenu(matched)));
          await bot.sendMessage(chatId, await buildDashboard(matched), { parse_mode: 'Markdown' });
          return;
        }
        if (sess && sess.state === 'await_login') {
          const login = text.trim().toLowerCase();
          const u = await store.getUser(login);
          if (!u || !u.active) {
            await bot.sendMessage(chatId, '❌ Bunday login yo\'q yoki bloklangan. Qaytadan:');
            return;
          }
          // Parol so'rash bosqichi
          await store.upsertTelegramSession(chatId, { botId, state: 'await_password', stateData: { pendingLogin: login } });
          await bot.sendMessage(chatId, '🔒 Iltimos, *parol*ingizni kiriting:', { parse_mode: 'Markdown' });
          return;
        }
        if (sess && sess.state === 'await_password') {
          const pendingLogin = (sess.state_data || {}).pendingLogin;
          if (!pendingLogin) {
            await store.upsertTelegramSession(chatId, { botId, state: STATE.AWAIT_CODE, stateData: {} });
            await bot.sendMessage(chatId, '❌ Sessiya buzildi. /start');
            return;
          }
          const u = await store.getUser(pendingLogin);
          if (!u || !u.active) {
            await store.upsertTelegramSession(chatId, { botId, state: STATE.AWAIT_CODE, stateData: {} });
            await bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start');
            return;
          }
          if (u.pass !== text) {
            log.warn('Bot login failed', { login: pendingLogin, chatId });
            await bot.sendMessage(chatId, '❌ Parol noto\'g\'ri. Qaytadan kiriting (yoki /start):');
            return;
          }
          // Muvaffaqiyatli login
          await store.upsertUser(pendingLogin, { telegram_id: String(chatId) });
          await store.upsertTelegramSession(chatId, { botId, userLogin: pendingLogin, state: STATE.IDLE, stateData: {} });
          log.info('Bot login success', { login: pendingLogin, chatId });
          await bot.sendMessage(chatId, `✅ Xush kelibsiz, *${pendingLogin}*!`, Object.assign({ parse_mode: 'Markdown' }, mainMenu(u)));
          await bot.sendMessage(chatId, await buildDashboard(u), { parse_mode: 'Markdown' });
          return;
        }
        await bot.sendMessage(chatId, '❌ Kod noto\'g\'ri. /start orqali qaytadan urinib ko\'ring.');
        return;
      }

      // ─── Authenticated ───
      const ctx = await getSessionUser(chatId);
      if (!ctx) {
        await store.clearTelegramSession(chatId);
        await bot.sendMessage(chatId, '⏱ Sessiya tugadi. /start');
        return;
      }
      const user = ctx.user;

      // Cancel har doim
      if (lc === '/cancel') {
        await clearState(chatId);
        await bot.sendMessage(chatId, '↩️ Bekor qilindi.', mainMenu(user));
        return;
      }
      if (lc === '/logout' || text === '🚪 Chiqish') {
        await store.clearTelegramSession(chatId);
        await bot.sendMessage(chatId, '👋 Chiqdingiz. Qayta kirish uchun /start', { reply_markup: { remove_keyboard: true } });
        return;
      }
      if (lc === '/help' || text === 'ℹ️ Help') {
        await bot.sendMessage(chatId, HELP_TEXT, { parse_mode: 'Markdown' });
        return;
      }
      if (lc === '/dashboard' || text === '📊 Dashboard') {
        await bot.sendMessage(chatId, await buildDashboard(user), { parse_mode: 'Markdown' });
        return;
      }
      if (lc === '/report' || text === '📈 Hisobot') {
        await bot.sendMessage(chatId, await buildReport(user), { parse_mode: 'Markdown' });
        return;
      }
      if (text === '🏢 Obyektlar' || lc === '/obyekt') {
        const list = userObyektList(user);
        await bot.sendMessage(chatId, '🏢 Sizga tegishli obyektlar:\n• ' + list.join('\n• '));
        return;
      }
      if (lc === '/kirim' || text === '➕ Kirim') {
        await startTransaction(bot, chatId, 'Kirim', user);
        return;
      }
      if (lc === '/chiqim' || text === '➖ Chiqim') {
        await startTransaction(bot, chatId, 'Chiqim', user);
        return;
      }
      if (lc === '/newfirm' || lc === '/newcontragent' || lc === '/newcontraget') {
        await setState(chatId, STATE.NF_NAME, {});
        await bot.sendMessage(chatId, '🏢 Yangi firma/kontragent nomini kiriting:');
        return;
      }
      if (lc === '/newproduct') {
        await setState(chatId, STATE.NP_NAME, {});
        await bot.sendMessage(chatId, '📦 Yangi mahsulot nomini kiriting:');
        return;
      }

      // ─── Wizard states ───
      const sess2 = await store.getTelegramSession(chatId);
      const st = sess2.state;

      if (st === STATE.NF_NAME) {
        await setState(chatId, STATE.NF_PHONE, { name: text });
        await bot.sendMessage(chatId, '📞 Telefon (yoki "-"):');
        return;
      }
      if (st === STATE.NF_PHONE) {
        const d = sess2.state_data;
        const phone = text === '-' ? '' : text;
        await store.upsertFirm(d.name, { phone });
        log.info('Bot new firm', { user: user.login, name: d.name });
        await clearState(chatId);
        await bot.sendMessage(chatId, `✅ Firma *${d.name}* qo'shildi.`, Object.assign({ parse_mode: 'Markdown' }, mainMenu(user)));
        return;
      }
      if (st === STATE.NP_NAME) {
        await setState(chatId, STATE.NP_UNIT, { name: text });
        await bot.sendMessage(chatId, '📐 O\'lchov birligi (dona/kg/m/...):');
        return;
      }
      if (st === STATE.NP_UNIT) {
        const d = sess2.state_data;
        await store.upsertProduct(d.name, text);
        log.info('Bot new product', { user: user.login, name: d.name, unit: text });
        await clearState(chatId);
        await bot.sendMessage(chatId, `✅ Mahsulot *${d.name}* (${text}) qo'shildi.`, Object.assign({ parse_mode: 'Markdown' }, mainMenu(user)));
        return;
      }
      if ([STATE.TR_PRODUCT, STATE.TR_QTY, STATE.TR_PRICE, STATE.TR_TOMON, STATE.TR_OBYEKT, STATE.TR_CONFIRM].includes(st)) {
        await handleTransactionStep(bot, chatId, text, user);
        return;
      }

      // Default
      await bot.sendMessage(chatId, 'ℹ️ Buyruqni tanlang yoki /Help', mainMenu(user));
    } catch (e) {
      log.error('Bot message handler error', { botId, chatId, error: e.message, stack: e.stack });
      try { await bot.sendMessage(chatId, '❌ Tizim xatosi: ' + e.message); } catch (_) {}
    }
  });
}

async function startBot(botRow) {
  if (activeBots.has(botRow.id)) {
    log.warn('Bot already running', { id: botRow.id });
    return activeBots.get(botRow.id);
  }
  try {
    const bot = new TelegramBot(botRow.token, { polling: true });
    attachHandlers(bot, botRow);
    activeBots.set(botRow.id, bot);
    log.info('Bot started', { id: botRow.id, name: botRow.name });
    return bot;
  } catch (e) {
    log.error('Bot start failed', { id: botRow.id, error: e.message });
    throw e;
  }
}

async function stopBot(botId) {
  const bot = activeBots.get(botId);
  if (!bot) return false;
  try {
    await bot.stopPolling({ cancel: true });
    activeBots.delete(botId);
    log.info('Bot stopped', { id: botId });
    return true;
  } catch (e) {
    log.error('Bot stop failed', { id: botId, error: e.message });
    return false;
  }
}

async function restartBot(botRow) {
  await stopBot(botRow.id);
  return await startBot(botRow);
}

async function initAllBots() {
  if (process.env.DISABLE_TG_BOTS === '1') {
    log.warn('Telegram bots disabled by env DISABLE_TG_BOTS=1');
    return;
  }
  try {
    const rows = await store.getTelegramBots();
    const active = rows.filter(r => r.active);
    log.info(`Initializing ${active.length} telegram bot(s)`);
    for (const row of active) {
      try { await startBot(row); }
      catch (e) { log.error('initAllBots: failed to start', { id: row.id, error: e.message }); }
    }
  } catch (e) {
    log.error('initAllBots failed', { error: e.message });
  }
}

module.exports = { startBot, stopBot, restartBot, initAllBots, activeBots };
