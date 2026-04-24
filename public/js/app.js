/**
 * App — Asosiy SPA Controller
 */
const App = {
  currentUser: null,
  data: { users:{}, jurnal:[], history:[], katalog:[], obyektlar:['Barchasi'], omborlar:['Barchasi'], firms:[], transfers:[], inventarizatsiya:[], debtors:[], creditors:[], payments:[], minStock:{} },
  _errorNotified: false,
  build: 'v2026-04-21-2',

  async init() {
    // Agar biror JS xato bo'lsa, console ochilmagan bo'lsa ham ko'rinsin
    if (!this._errorNotified) {
      window.addEventListener('error', (e) => {
        this._errorNotified = true;
        alert('JS xato: ' + (e?.message || 'noma\'lum'));
      });
      window.addEventListener('unhandledrejection', (e) => {
        this._errorNotified = true;
        alert('Promise xato: ' + (e?.reason?.message || e?.reason || 'noma\'lum'));
      });
    }

    // Tilni qo'llash
    this.applyTranslations();
    this.updateLangButtons();

    // Token bor bo'lsa, bootstrap qilamiz
    if (API.token) {
      try {
        const result = await API.bootstrap();
        if (result.ok) {
          this.applyData(result);
          const me = await API.get('/api/auth/me');
          if (me.ok) {
            this.currentUser = me.user;
            document.getElementById('loader').style.display = 'none';
            this.showDashboard();
            return;
          }
        }
      } catch(e) { console.error('Bootstrap xato:', e); }
    }

    // Login ko'rsatish
    document.getElementById('loader').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
  },

  applyData(d) {
    if (d.users) this.data.users = d.users;
    if (d.jurnal) this.data.jurnal = d.jurnal;
    if (d.history) this.data.history = d.history;
    if (d.katalog) this.data.katalog = d.katalog;
    if (d.obyektlar) this.data.obyektlar = d.obyektlar;
    if (d.allObyektlar) this.data.allObyektlar = d.allObyektlar;
    if (d.omborlar) this.data.omborlar = d.omborlar;
    if (d.firms) this.data.firms = d.firms;
    if (d.transfers) this.data.transfers = d.transfers;
    if (d.inventarizatsiya) this.data.inventarizatsiya = d.inventarizatsiya;
    if (d.debtors) this.data.debtors = d.debtors;
    if (d.creditors) this.data.creditors = d.creditors;
    if (d.payments) this.data.payments = d.payments;
    if (d.minStock) this.data.minStock = d.minStock;
  },

  async doLogin() {
    const u = document.getElementById('login-user').value.trim().toLowerCase();
    const p = document.getElementById('login-pass').value;
    if (!u || !p) { this.showLoginError('Login va parol kiriting!'); return; }

    try {
      const res = await API.login(u, p);
      if (res.ok) {
        API.setToken(res.token);
        this.currentUser = res.user;
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('login-page').style.display = 'none';
        // Bootstrap yuklash
        const bootstrap = await API.bootstrap();
        if (bootstrap.ok) this.applyData(bootstrap);
        this.showDashboard();
      } else {
        this.showLoginError(res.error || 'Login yoki parol noto\'g\'ri!');
      }
    } catch(e) {
      this.showLoginError('Server bilan ulanib bo\'lmadi!');
    }
  },

  showLoginError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.style.display = 'block';
  },

  doLogout() {
    API.clearToken();
    this.currentUser = null;
    location.reload();
  },

  showDashboard() {
    const user = this.currentUser;
    if (!user) return;
    const role = user.role || 'free';

    document.getElementById('dashboard-page').style.display = 'block';
    // Quick build marker (helps detect stale cache / wrong server)
    document.title = `OmborPro ${this.build}`;

    // Sidebar
    const initials = user.login.slice(0,2).toUpperCase();
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('sidebar-username').textContent = user.login;
    const roleEl = document.getElementById('sidebar-role');
    roleEl.textContent = role === 'pro+' ? 'PRO+' : role.toUpperCase();
    roleEl.className = 'sidebar-user-role role-' + role;

    // Header
    this.updateHeaderBadge(role);
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('uz-UZ', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    // Admin-only menus
    console.log('🔍 Debug - Role:', role, 'User:', user.login);
    console.log('🔍 Debug - nav-admin element:', document.getElementById('nav-admin'));
    document.getElementById('nav-admin').style.display = (role === 'admin' || role === 'owner') ? 'flex' : 'none';
    document.getElementById('nav-tarix').style.display = (role === 'admin' || role === 'owner') ? 'flex' : 'none';

    // Admin-only settings sections
    document.getElementById('admin-obyekt-section').style.display = (role === 'admin' || role === 'owner') ? 'block' : 'none';
    document.getElementById('admin-ombor-section').style.display = (role === 'admin' || role === 'owner') ? 'block' : 'none';

    // Hide new firm button for non-admins in Kirim form
    const newFirmBtns = document.querySelectorAll('.new-firm-btn');
    newFirmBtns.forEach(btn => {
      btn.style.display = role === 'admin' ? 'block' : 'none';
    });

    // Settings
    document.getElementById('settings-user').textContent = user.login.toUpperCase();
    const ps = document.getElementById('premium-status');
    if (role === 'admin') { ps.textContent = 'ADMIN'; ps.style.color = 'var(--accent-light)'; }
    else if (role === 'pro+') { ps.textContent = 'PRO+'; ps.style.color = 'var(--pink)'; }
    else if (role === 'pro') { ps.textContent = 'PRO'; ps.style.color = 'var(--orange)'; }
    else { ps.textContent = 'FREE'; ps.style.color = 'var(--text-muted)'; }

    // Theme
    this.setTheme(localStorage.getItem('theme') || 'dark');

    this.loadData();
  },

  updateHeaderBadge(role) {
    const el = document.getElementById('header-tier-badge');
    el.className = 'header-premium-badge';
    if (role === 'admin') { el.classList.add('badge-admin-tag'); el.textContent = '👑 ADMIN'; }
    else if (role === 'pro+') { el.classList.add('badge-proplus-tag'); el.textContent = '💎 PRO+'; }
    else if (role === 'pro') { el.classList.add('badge-pro'); el.textContent = '⭐ PRO'; }
    else { el.classList.add('badge-free'); el.textContent = 'FREE'; }
  },

  async loadData() {
    try {
      const result = await API.bootstrap();
      if (result.ok) this.applyData(result);
    } catch(e) { console.error('Load xato:', e); }
    this.renderAll();
  },

  renderAll() {
    const jurnal = this.data.jurnal || [];
    const qoldiqObj = Utils.computeQoldiq(jurnal);

    // Stats
    const totalKirim = jurnal.filter(r => r.tur === 'Kirim').reduce((s,r) => s + (Number(r.summa)||0), 0);
    const totalChiqim = jurnal.filter(r => r.tur === 'Chiqim').reduce((s,r) => s + (Number(r.summa)||0), 0);
    document.getElementById('stat-kirim').textContent = Utils.formatCompact(totalKirim);
    document.getElementById('stat-chiqim').textContent = Utils.formatCompact(totalChiqim);
    document.getElementById('stat-qoldiq').textContent = Utils.formatCompact(totalKirim - totalChiqim);
    document.getElementById('stat-products').textContent = Object.keys(qoldiqObj).length;
    document.getElementById('dash-jurnal-count').textContent = jurnal.length + ' yozuv';

    // Last 10
    const last10 = [...jurnal].reverse().slice(0,10);
    document.getElementById('last-rows').innerHTML = last10.length ? last10.map(r => `
      <tr>
        <td class="mono" style="color:var(--text-muted);font-size:11px">${r.sana||'—'}</td>
        <td>${r.tur==='Kirim'?'<span class="badge badge-kirim">KIRIM</span>':'<span class="badge badge-chiqim">CHIQIM</span>'}</td>
        <td>${r.mahsulot||'—'}</td>
        <td class="mono">${Utils.formatNumber(r.miqdor)}</td>
        <td class="mono" style="color:${r.tur==='Kirim'?'var(--green)':'var(--red)'}">${Utils.formatSum(r.summa)}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">Yozuvlar yo\'q</div></td></tr>';

    // Timeline
    this.renderTimeline(last10);

    // Populate filters
    this.populateObyektFilters();

    // Other modules
    Qoldiq.render();
    Jurnal.render();
    Jurnal.renderArchive();
    Charts.renderDashboard();
  },

  renderTimeline(items) {
    const el = document.getElementById('activity-timeline');
    if (!items.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-text">Hali faoliyat yo\'q</div></div>'; return; }
    el.innerHTML = items.slice(0,8).map(r => `
      <div class="timeline-item">
        <div class="timeline-dot ${r.tur==='Kirim'?'kirim-dot':'chiqim-dot'}"></div>
        <div class="timeline-content"><strong>${r.tur==='Kirim'?'📥':'📤'} ${r.mahsulot||'—'}</strong> — ${Utils.formatNumber(r.miqdor)} dona</div>
        <div class="timeline-time">${r.sana||'—'} • ${Utils.formatSum(r.summa)}</div>
      </div>
    `).join('');
  },

  populateObyektFilters() {
    let obyektlar = this.data.obyektlar || ['Barchasi'];
    console.log('🔍 Debug - Obyektlar (raw):', obyektlar, 'Type:', typeof obyektlar, 'IsArray:', Array.isArray(obyektlar));

    // Obyektlarni arrayga aylantirish (agar string bo'lsa)
    if (typeof obyektlar === 'string') {
      obyektlar = obyektlar.split(',').map(o => o.trim());
    }
    // Array bo'lsa, lekin ichida string bo'lsa
    if (Array.isArray(obyektlar)) {
      obyektlar = obyektlar.flatMap(o => {
        if (typeof o === 'string' && o.includes(',')) {
          return o.split(',').map(x => x.trim());
        }
        return o;
      });
    }
    obyektlar = Array.from(new Set(obyektlar)); // Dublikatlarni olib tashlash

    let allowed = this.currentUser?.obyekt || 'Barchasi';
    console.log('🔍 Debug - Allowed obyekt:', allowed, 'Type:', typeof allowed, 'IsArray:', Array.isArray(allowed));

    // Allowed obyektni ham arrayga aylantirish
    if (typeof allowed === 'string') {
      if (allowed.includes(',')) {
        allowed = allowed.split(',').map(o => o.trim());
      } else {
        allowed = [allowed];
      }
    }
    if (Array.isArray(allowed)) {
      allowed = allowed.flatMap(o => {
        if (typeof o === 'string' && o.includes(',')) {
          return o.split(',').map(x => x.trim());
        }
        return o;
      });
    }
    allowed = Array.from(new Set(allowed));

    let isAdmin = this.getUserRole() === 'admin';

    // Qat'iy filtrlash: Agar admin bo'lmasa va maxsus obyekt berilgan bo'lsa
    if (!isAdmin && !allowed.includes('Barchasi')) {
      obyektlar = obyektlar.filter(o => allowed.includes(o)); // faqat ruxsat etilgan obyektlar
    } else {
      // Agar "Barchasi" bo'lsa, barcha obyektlarni qoldiramiz
      // Lekin 'Barchasi' degan so'zning o'zini dublikat qilmaslik uchun tozalaymiz
      obyektlar = Array.from(new Set(obyektlar));
    }

    const opts = obyektlar.map(o => `<option value="${o}">${o}</option>`).join('');
    const noBarchasiOpts = obyektlar.filter(o => o !== 'Barchasi').map(o => `<option value="${o}">${o}</option>`).join('');
    const allOpts = (!isAdmin && allowed !== 'Barchasi') 
      ? opts // faqat qat'iy 1 ta opts
      : '<option value="Barchasi">Barchasi</option>' + noBarchasiOpts;

    ['qoldiq-obyekt-filter', 'jurnal-obyekt-filter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = allOpts;
    });
    ['k-obyekt', 'c-oluvchi', 'trf-from', 'inv-obyekt'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = noBarchasiOpts;
    });

    // trf-to hamma obektlarni o'z ichiga oladi
    let allObyektlarArray = this.data.allObyektlar || obyektlar;
    // allObyektlarni ham parse qilish
    if (typeof allObyektlarArray === 'string') {
      allObyektlarArray = allObyektlarArray.split(',').map(o => o.trim());
    }
    if (Array.isArray(allObyektlarArray)) {
      allObyektlarArray = allObyektlarArray.flatMap(o => {
        if (typeof o === 'string' && o.includes(',')) {
          return o.split(',').map(x => x.trim());
        }
        return o;
      });
    }
    allObyektlarArray = Array.from(new Set(allObyektlarArray));

    const trfToOpts = allObyektlarArray.filter(o=>o!=='Barchasi').map(o => `<option value="${o}">${o}</option>`).join('');
    const trfToEl = document.getElementById('trf-to');
    if (trfToEl) trfToEl.innerHTML = trfToOpts;

    // Firmalar ro'yxatini datalist'ga joylash
    const firms = this.data.firms || [];
    const firmOpts = firms.map(f => `<option value="${f.name}">`).join('');
    let firmListEl = document.getElementById('firms-list');
    if (!firmListEl) { firmListEl = document.createElement('datalist'); firmListEl.id = 'firms-list'; document.body.appendChild(firmListEl); }
    firmListEl.innerHTML = firmOpts;

    // Mahsulotlar ro'yxatini datalist'ga joylash
    const katalog = this.data.katalog || [];
    const prodOpts = katalog.map(k => `<option value="${k.nom}"></option>`).join('');
    let prodListEl = document.getElementById('products-list');
    if (!prodListEl) { prodListEl = document.createElement('datalist'); prodListEl.id = 'products-list'; document.body.appendChild(prodListEl); }
    prodListEl.innerHTML = prodOpts;
  },

  getUserRole() {
    return this.currentUser?.role || 'free';
  },

  hasAccess(minRole) {
    const h = { free:0, pro:1, 'pro+':2, admin:3, owner:4 };
    return (h[this.getUserRole()]||0) >= (h[minRole]||0);
  },

  isOwner() {
    return this.getUserRole() === 'owner';
  },

  isAdmin() {
    return this.getUserRole() === 'admin' || this.getUserRole() === 'owner';
  },

  switchTab(name, btn) {
    if (name === 'hisobot' && !this.hasAccess('pro')) { alert('Bu bo\'lim faqat PRO uchun!'); return; }
    if (name === 'charts' && !this.hasAccess('pro+')) { alert('Bu bo\'lim faqat PRO+ uchun!'); return; }
    if (name === 'moliya' && !this.hasAccess('pro+')) { alert('Bu bo\'lim faqat PRO+ uchun!'); return; }
    if (name === 'admin' && !this.hasAccess('admin')) { alert('Faqat ADMIN uchun!'); return; }
    if (name === 'tarix' && !this.hasAccess('admin')) { alert('Faqat ADMIN uchun!'); return; }

    this.currentTab = name;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name)?.classList.add('active');
    if (btn) btn.classList.add('active');

    // Update admin-only element visibility
    const role = this.getUserRole();
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = role === 'admin' ? '' : 'none');

    const titles = {
      dashboard:'Dashboard', kirim:'Kirim / Chiqim', qoldiq:'Qoldiq', jurnal:'Jurnal', tarix:'Tarix',
      transfer:'Transfer', inventar:'Inventarizatsiya',
      hisobot:'Hisobotlar', charts:'Chartlar & Analitika',
      moliya:'Moliya & Buxgalteriya', admin:'Admin Panel', settings:'Sozlamalar', minqoldiq:'Min Qoldiq Limit'
    };
    document.getElementById('header-title').textContent = titles[name] || name;

    // Tab-specific init
    if (name === 'dashboard') Charts.renderDashboard();
    if (name === 'charts') { Charts.renderAdvanced(); Charts.renderPrediction(); }
    if (name === 'admin') Admin.render();
    if (name === 'settings') { Settings.renderObyektlar(); Settings.renderOmborlar(); Settings.renderMinStock(); Settings.renderKatalogSearchResults(); Settings.renderFirmalarSearchResults(); }
    if (name === 'minqoldiq') { MinQoldiq.populateObyektFilter(); MinQoldiq.render(); }
    if (name === 'kirim') KirimChiqim.init();
    if (name === 'qoldiq') Qoldiq.render();
    if (name === 'jurnal' || name === 'tarix') { Jurnal.render(); Jurnal.renderArchive(); }
    if (name === 'transfer') { Warehouse.renderTransfers(); Warehouse.renderTransferQoldiq(); }
    if (name === 'inventar') { 
      Warehouse.loadInventarItems(); 
      Warehouse.loadInvLinks(); 
      Warehouse.refreshLinksStatus();
    }
    if (name === 'moliya') Moliya.render();
    if (name === 'hisobot') Reports.init();
  },

  setTheme(theme) {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const db = document.getElementById('btn-theme-dark');
    const lb = document.getElementById('btn-theme-light');
    if (db) { db.style.background = theme==='dark'?'var(--accent-dim)':'rgba(255,255,255,0.03)'; db.style.color = theme==='dark'?'var(--accent-light)':'var(--text-secondary)'; }
    if (lb) { lb.style.background = theme==='light'?'var(--accent-dim)':'rgba(255,255,255,0.03)'; lb.style.color = theme==='light'?'var(--accent-light)':'var(--text-secondary)'; }
  },

  translations: {
    uz: {
      dashboard: 'Dashboard', kirimChiqim: 'Kirim / Chiqim', qoldiq: 'Qoldiq', jurnal: 'Jurnal',
      tarix: 'Tarix', transfer: 'Transfer', inventarizatsiya: 'Inventarizatsiya',
      hisobotlar: 'Hisobotlar', chartlar: 'Chartlar', moliya: 'Moliya',
      adminPanel: 'Admin Panel', sozlamalar: 'Sozlamalar', minQoldiq: 'Min Qoldiq',
      tema: 'Tema', til: 'Til', qora: 'Qora', oq: 'Oq',
      kirim: 'Kirim', chiqim: 'Chiqim', kirimCap: 'KIRIM', chiqimCap: 'CHIQIM', prixod: 'Prixod',
      mahsulot: 'Mahsulot', miqdor: 'Miqdor', narx: 'Narx', summa: 'Summa', olchov: 'O\'lchov',
      sana: 'Sana', vaqt: 'Vaqt', obyekt: 'Obyekt', operator: 'Operator',
      tasdiqlash: 'Tasdiqlash', bekorQilish: 'Bekor qilish', saqlash: 'Saqlash',
      yangilash: 'Yangilash', yangilashBtn: '↻ Yangilash', qoshish: "Qo'shish", ochirish: "O'chirish", yangilashCap: 'YANGILASH',
      jami: 'Jami', farq: 'Farq', tizimda: 'Tizimda', haqiqiy: 'Haqiqiy',
      barchasi: 'Barchasi', faqatKirim: 'Faqat Kirim', faqatChiqim: 'Faqat Chiqim',
      qidirish: 'Qidirish...', ixtiyoriy: 'Ixtiyoriy...',
      omborQoldiq: 'Ombor qoldig\'i', omborQoldiqHint: '2 marta bosing - Formaga qo\'shiladi',
      mahsulotQoldiqlari: 'Mahsulot Qoldiqlari', jamiSumma: 'Jami Summa',
      toliqJurnal: 'To\'liq Jurnal', ochirilganYozuvlar: 'O\'chirilgan yozuvlar tarixi',
      yozuvlarYoq: 'Yozuvlar yo\'q', yuklanmoqda: 'Yuklanmoqda...',
      tizimgaKirish: 'TIZIMGA KIRISH', foydalanuvchiNomi: 'Foydalanuvchi nomi', parol: 'Parol',
      omborPro: 'OmborPro', boshqaruvTizimi: 'Boshqaruv Tizimi',
      jamiKirim: 'Jami Kirim', jamiChiqim: 'Jami Chiqim', hozirgiQoldiq: 'Hozirgi Qoldiq',
      mahsulotlarSon: 'Mahsulotlar', kamQolgan: 'Kam Qolgan Mahsulotlar',
      kirimChiqimTrend: 'Kirim / Chiqim Trendi', oxirgi7kun: 'Oxirgi 7 kun',
      mahsulotTaqsimot: 'Mahsulot Taqsimoti', qoldiqBoyicha: 'Qoldiq bo\'yicha',
      oxirgiAmallar: 'Oxirgi Amallar', faoliyat: 'Faoliyat', oxirgiHarakatlar: 'Oxirgi harakatlar',
      haliFaoliyatYoq: 'Hali faoliyat yo\'q', malumotYuklanmoqda: 'Ma\'lumot yuklanmoqda...',
      qaysiFirmadan: '1. Qaysi firmadan (Yetkazib beruvchi)', yangiFirma: 'Yangi firma qo\'shish',
      qaysiObyektga: 'Qaysi Obyektga kirim qilinmoqda', yangiQator: 'Mahsulot qatorini qo\'shish',
      kirimQoshish: 'KIRIM QO\'SHISH', chiqimQoshish: 'CHIQIM QO\'SHISH',
      qaysiObyektdan: 'Qaysi Obyektdan Chiqim qilinmoqda',
      obyektFiltrlash: 'Obyekt:', hisobotYaratish: 'HISOBOT YARATISH',
      firma: 'Firma', izoh: 'Izoh', narxSum: 'so\'m',
      exportCsv: 'CSV yuklab olish', chopEtish: 'Chop etish',
      tizim: 'Tizim', versiya: 'Versiya', backend: 'Backend', foydalanuvchi: 'Foydalanuvchi', daraja: 'Daraja',
      omborlar: 'Omborlar', omborBoshqarish: 'Omborlarni Boshqarish', yangiOmbor: 'Yangi ombor nomi...',
      obyektBoshqarish: 'Obyektlarni Boshqarish', yangiObyekt: 'Yangi obyekt nomi...',
      katalogBoshqarish: 'Katalog Boshqaruvi', mahsulotQidirish: 'Mahsulot nomini qidiring (tahrirlash yoki o\'chirish uchun)...',
      yangiMahsulot: 'Yangi', nomi: 'Nomi',
      firmalarBoshqarish: 'Firmalar Boshqaruvi', firmaQidirish: 'Firma nomini qidiring...',
      teleron: 'Teleron', manzil: 'Manzil', inn: 'INN',
      csvImport: 'CSV Import', csvFormat: 'Format: nom;teleron;manzil;inn',
      minQoldiqLimit: 'Minimum Qoldiq Limitlari', minQoldiqSubtitle: 'Mahsulot qoldig\'i bu limitdan pastga tushganda ogohlantirish beradi',
      hammaTzalash: 'Hammasini tozalash', qoshishBtn: 'QO\'SHISH',
      kirimText: 'Kirim', chiqimText: 'Chiqim', omborQoldiqText: 'Qoldiq'
    },
    ru: {
      dashboard: 'Панель', kirimChiqim: 'Приход / Расход', qoldiq: 'Остатки', jurnal: 'Журнал',
      tarix: 'История', transfer: 'Трансфер', inventarizatsiya: 'Инвентаризация',
      hisobotlar: 'Отчёты', chartlar: 'Графики', moliya: 'Финансы',
      adminPanel: 'Админ Панель', sozlamalar: 'Настройки', minQoldiq: 'Мин Остаток',
      tema: 'Тема', til: 'Язык', qora: 'Тёмная', oq: 'Светлая',
      kirim: 'Приход', chiqim: 'Расход', kirimCap: 'ПРИХОД', chiqimCap: 'РАСХОД', prixod: 'Приход',
      mahsulot: 'Товар', miqdor: 'Количество', narx: 'Цена', summa: 'Сумма', olchov: 'Единица',
      sana: 'Дата', vaqt: 'Время', obyekt: 'Объект', operator: 'Оператор',
      tasdiqlash: 'Подтвердить', bekorQilish: 'Отмена', saqlash: 'Сохранить',
      yangilash: 'Обновить', yangilashBtn: '↻ Обновить', qoshish: 'Добавить', ochirish: 'Удалить', yangilashCap: 'ОБНОВИТЬ',
      jami: 'Всего', farq: 'Разница', tizimda: 'В системе', haqiqiy: 'Фактически',
      barchasi: 'Все', faqatKirim: 'Только Приход', faqatChiqim: 'Только Расход',
      qidirish: 'Поиск...', ixtiyoriy: 'Необязательно...',
      omborQoldiq: 'Остаток на складе', omborQoldiqHint: '2 клика - добавить в форму',
      mahsulotQoldiqlari: 'Остатки товаров', jamiSumma: 'Общая сумма',
      toliqJurnal: 'Полный Журнал', ochirilganYozuvlar: 'История удалённых записей',
      yozuvlarYoq: 'Записей нет', yuklanmoqda: 'Загрузка...',
      tizimgaKirish: 'ВОЙТИ', foydalanuvchiNomi: 'Имя пользователя', parol: 'Пароль',
      omborPro: 'OmborPro', boshqaruvTizimi: 'Система управления',
      jamiKirim: 'Всего Приход', jamiChiqim: 'Всего Расход', hozirchiQoldiq: 'Текущий Остаток',
      mahsulotlarSon: 'Товаров', kamQolgan: 'Мало осталось',
      kirimChiqimTrend: 'Тренд Приход/Расход', oxirgi7kun: 'Последние 7 дней',
      mahsulotTaqsimot: 'Распределение товаров', qoldiqBoyicha: 'По остаткам',
      oxirgiAmallar: 'Последние операции', faoliyat: 'Активность', oxirgiHarakatlar: 'Последние действия',
      haliFaoliyatYoq: 'Пока нет активности', malumotYuklanmoqda: 'Загрузка данных...',
      qaysiFirmadan: '1. От какой фирмы (Поставщик)', yangiFirma: 'Добавить фирму',
      qaysiObyektga: 'На какой Объект приход', yangiQator: 'Добавить строку товара',
      kirimQoshish: 'ДОБАВИТЬ ПРИХОД', chiqimQoshish: 'ДОБАВИТЬ РАСХОД',
      qaysiObyektdan: 'С какого Объекта расход',
      obyektFiltrlash: 'Объект:', hisobotYaratish: 'СОЗДАТЬ ОТЧЁТ',
      firma: 'Фирма', izoh: 'Примечание', narxSum: 'сум',
      exportCsv: 'Скачать CSV', chopEtish: 'Печать',
      tizim: 'Система', versiya: 'Версия', backend: 'Бэкенд', foydalanuvchi: 'Пользователь', daraja: 'Уровень',
      omborlar: 'Склады', omborBoshqarish: 'Управление складами', yangiOmbor: 'Название нового склада...',
      obyektBoshqarish: 'Управление объектами', yangiObyekt: 'Название нового объекта...',
      katalogBoshqarish: 'Управление каталогом', mahsulotQidirish: 'Поиск товара (для редактирования или удаления)...',
      yangiMahsulot: 'Новый', nomi: 'Название',
      firmalarBoshqarish: 'Управление фирмами', firmaQidirish: 'Поиск фирмы...',
      teleron: 'Телефон', manzil: 'Адрес', inn: 'ИНН',
      csvImport: 'CSV Импорт', csvFormat: 'Формат: название;телефон;адрес;инн',
      minQoldiqLimit: 'Минимальные лимиты остатков', minQoldiqSubtitle: 'Предупреждение когда остаток товара упадёт ниже лимита',
      hammaTzalash: 'Очистить всё', qoshishBtn: 'ДОБАВИТЬ',
      kirimText: 'Приход', chiqimText: 'Расход', omborQoldiqText: 'Остаток'
    },
    en: {
      dashboard: 'Dashboard', kirimChiqim: 'Income / Expense', qoldiq: 'Stock', jurnal: 'Journal',
      tarix: 'History', transfer: 'Transfer', inventarizatsiya: 'Inventory',
      hisobotlar: 'Reports', chartlar: 'Charts', moliya: 'Finance',
      adminPanel: 'Admin Panel', sozlamalar: 'Settings', minQoldiq: 'Min Stock',
      tema: 'Theme', til: 'Language', qora: 'Dark', oq: 'Light',
      kirim: 'Income', chiqim: 'Expense', kirimCap: 'INCOME', chiqimCap: 'EXPENSE', prixod: 'Income',
      mahsulot: 'Product', miqdor: 'Quantity', narx: 'Price', summa: 'Amount', olchov: 'Unit',
      sana: 'Date', vaqt: 'Time', obyekt: 'Object', operator: 'Operator',
      tasdiqlash: 'Confirm', bekorQilish: 'Cancel', saqlash: 'Save',
      yangilash: 'Refresh', yangilashBtn: '↻ Refresh', qoshish: 'Add', ochirish: 'Delete', yangilashCap: 'REFRESH',
      jami: 'Total', farq: 'Difference', tizimda: 'In System', haqiqiy: 'Actual',
      barchasi: 'All', faqatKirim: 'Income Only', faqatChiqim: 'Expense Only',
      qidirish: 'Search...', ixtiyoriy: 'Optional...',
      omborQoldiq: 'Warehouse Stock', omborQoldiqHint: 'Double-click to add to form',
      mahsulotQoldiqlari: 'Product Stock', jamiSumma: 'Total Amount',
      toliqJurnal: 'Full Journal', ochirilganYozuvlar: 'Deleted Records History',
      yozuvlarYoq: 'No records', yuklanmoqda: 'Loading...',
      tizimgaKirish: 'LOGIN', foydalanuvchiNomi: 'Username', parol: 'Password',
      omborPro: 'OmborPro', boshqaruvTizimi: 'Management System',
      jamiKirim: 'Total Income', jamiChiqim: 'Total Expense', hozirgiQoldiq: 'Current Stock',
      mahsulotlarSon: 'Products', kamQolgan: 'Low Stock Items',
      kirimChiqimTrend: 'Income / Expense Trend', oxirgi7kun: 'Last 7 days',
      mahsulotTaqsimot: 'Product Distribution', qoldiqBoyicha: 'By stock',
      oxirgiAmallar: 'Recent Actions', faoliyat: 'Activity', oxirgiHarakatlar: 'Recent activity',
      haliFaoliyatYoq: 'No activity yet', malumotYuklanmoqda: 'Loading data...',
      qaysiFirmadan: '1. From which firm (Supplier)', yangiFirma: 'Add new firm',
      qaysiObyektga: 'To which Object (Income)', yangiQator: 'Add product row',
      kirimQoshish: 'ADD INCOME', chiqimQoshish: 'ADD EXPENSE',
      qaysiObyektdan: 'From which Object (Expense)',
      obyektFiltrlash: 'Object:', hisobotYaratish: 'GENERATE REPORT',
      firma: 'Firm', izoh: 'Note', narxSum: '',
      exportCsv: 'Download CSV', chopEtish: 'Print',
      tizim: 'System', versiya: 'Version', backend: 'Backend', foydalanuvchi: 'User', daraja: 'Level',
      omborlar: 'Warehouses', omborBoshqarish: 'Warehouse Management', yangiOmbor: 'New warehouse name...',
      obyektBoshqarish: 'Object Management', yangiObyekt: 'New object name...',
      katalogBoshqarish: 'Catalog Management', mahsulotQidirish: 'Search product name (for editing or deleting)...',
      yangiMahsulot: 'New', nomi: 'Name',
      firmalarBoshqarish: 'Firms Management', firmaQidirish: 'Search firm name...',
      teleron: 'Phone', manzil: 'Address', inn: 'INN',
      csvImport: 'CSV Import', csvFormat: 'Format: name;phone;address;inn',
      minQoldiqLimit: 'Min Stock Limits', minQoldiqSubtitle: 'Warning when product stock falls below limit',
      hammaTzalash: 'Clear all', qoshishBtn: 'ADD',
      kirimText: 'Income', chiqimText: 'Expense', omborQoldiqText: 'Stock'
    }
  },

  t(key) {
    const lang = this.getLang();
    return this.translations[lang]?.[key] || key;
  },

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
  },

  setLang(lang) {
    localStorage.setItem('lang', lang);
    this.applyTranslations();
    this.updateLangButtons();
    this.retranslateDynamicContent();
  },

  currentTab: 'dashboard',

  retranslateDynamicContent() {
    switch(this.currentTab) {
      case 'dashboard': this.renderAll(); break;
      case 'kirim': KirimChiqim.init(); break;
      case 'qoldiq': Qoldiq.render(); break;
      case 'jurnal': Jurnal.render(); break;
      case 'tarix': Jurnal.renderArchive(); break;
      case 'minqoldiq': MinQoldiq.render(); break;
      case 'settings': 
        Settings.renderObyektlar(); 
        Settings.renderOmborlar(); 
        Settings.renderMinStock(); 
        Settings.renderKatalogSearchResults(); 
        Settings.renderFirmalarSearchResults(); 
        break;
    }
  },

  updateLangButtons() {
    const lang = this.getLang();
    ['uz', 'ru', 'en'].forEach(l => {
      const btn = document.getElementById('btn-lang-' + l);
      if (btn) {
        btn.style.background = lang === l ? 'var(--accent-dim)' : 'transparent';
        btn.style.color = lang === l ? 'var(--accent-light)' : 'var(--text-secondary)';
        btn.style.border = lang === l ? '1px solid var(--accent)' : '1px solid var(--border)';
      }
    });
  },

  getLang() {
    return localStorage.getItem('lang') || 'uz';
  },

  async promptNewFirm(targetId) {
    const name = prompt("Yangi firma nomi:");
    if (!name) return;
    const telegram = prompt("Telegram raqami / nomeri:");
    const address = prompt("Firma manzili (Address):");
    const inn = prompt("INN:");
    
    const res = await API.post('/api/settings/firms', { name, telegram, address, inn });
    if (res.ok) {
      if (!this.data.firms) this.data.firms = [];
      this.data.firms.push(res.data);
      this.populateObyektFilters(); // Datelistni yangilaymiz
      const input = document.getElementById(targetId);
      if (input) input.value = name;
    } else {
      alert("Xatolik: " + res.error);
    }
  }
};

// Enter to login
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') App.doLogin();
});

// Init
window.addEventListener('load', () => {
  setTimeout(() => App.init(), 1500);
});
