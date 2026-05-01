/**
 * API — Backend bilan aloqa
 */
const API = {
  token: localStorage.getItem('token') || '',
  baseUrl: 'https://omborpro-server-1.onrender.com',

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  },

  async get(url) {
    const res = await fetch(this.baseUrl + url, { headers: this.headers() });
    return res.json();
  },

  async post(url, data) {
    const res = await fetch(this.baseUrl + url, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  async put(url, data) {
    const res = await fetch(this.baseUrl + url, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  async del(url) {
    const res = await fetch(this.baseUrl + url, {
      method: 'DELETE', headers: this.headers()
    });
    return res.json();
  },

  setToken(t) {
    this.token = t;
    localStorage.setItem('token', t);
  },

  clearToken() {
    this.token = '';
    localStorage.removeItem('token');
  },

  // ── Bootstrap ──
  async bootstrap() {
    return this.get('/api/bootstrap');
  },

  // ── Auth ──
  async login(login, password) {
    return this.post('/api/auth/login', { login, password });
  },

  // ── Journal ──
  async addJournal(data) {
    return this.post('/api/journal', data);
  },
  async addJournalBulk(records) {
    return this.post('/api/journal/bulk', { records });
  },
  async updateJournal(index, data) {
    return this.put('/api/journal/' + index, data);
  },
  async deleteJournal(index) {
    return this.del('/api/journal/' + index);
  },
  async restoreJournal(historyIndex) {
    return this.post('/api/journal/restore/' + historyIndex);
  },

  // ── Users ──
  async addUser(data) { return this.post('/api/users', data); },
  async updateUser(login, data) { return this.put('/api/users/' + login, data); },
  async deleteUser(login) { return this.del('/api/users/' + login); },

  // ── Settings ──
  async addObyekt(name) { return this.post('/api/settings/obyektlar', { name }); },
  async deleteObyekt(name) { return this.del('/api/settings/obyektlar/' + encodeURIComponent(name)); },
  async addOmbor(name) { return this.post('/api/settings/omborlar', { name }); },
  async deleteOmbor(name) { return this.del('/api/settings/omborlar/' + encodeURIComponent(name)); },
  async deleteFirm(name) { return this.del('/api/settings/firms/' + encodeURIComponent(name)); },
  async addProduct(nom, olv) { return this.post('/api/settings/products', { nom, olv }); },
  async addProductPublic(nom, olv) { return this.post('/api/settings/products/public', { nom, olv }); },
  async addFirma(name, inn, telegram, phone, address) { return this.post('/api/settings/firms', { name, inn, telegram, phone, address }); },
  async addFirmaPublic(name, inn, telegram, phone, address) { return this.post('/api/settings/firms/public', { name, inn, telegram, phone, address }); },

  // ── Warehouse ──
  async doTransfer(data) { return this.post('/api/warehouse/transfers', data); },
  async submitInventar(data) { return this.post('/api/warehouse/inventarizatsiya', data); },
  async deleteInventar(id) { return this.del('/api/warehouse/inventarizatsiya/' + id); },
  async createMobileInventarLink(obyekt) { return this.post('/api/warehouse/mobile/token', { obyekt }); },
  async checkMobileToken(token) { return this.get('/api/warehouse/mobile/check/' + token); },
  async getInvLinks() { return this.get('/api/warehouse/inv-links'); },
  async addDebtor(data) { return this.post('/api/warehouse/debtors', data); },
  async addCreditor(data) { return this.post('/api/warehouse/creditors', data); },
  async addPayment(data) { return this.post('/api/warehouse/payments', data); },

  // ── Reports ──
  async getFilteredReport(params) {
    const qs = new URLSearchParams(params).toString();
    return this.get('/api/reports/filtered?' + qs);
  },
  async getLowStock() { return this.get('/api/reports/low-stock'); },
  async getDebtorSummary() { return this.get('/api/reports/debtor-summary'); },

  // ── Telegram Bots ──
  async getBots() { return this.get('/api/telegram/bots'); },
  async addBot(data) { return this.post('/api/telegram/bots', data); },
  async updateBot(id, data) { return this.put('/api/telegram/bots/' + id, data); },
  async deleteBot(id) { return this.del('/api/telegram/bots/' + id); },

  // ── Health ──
  async health() { return this.get('/api/health'); }
};
