/**
 * Admin — Foydalanuvchilarni boshqarish
 */
console.log('Admin.js loaded v2026-04-24');

const Admin = {
  pendingChanges: {}, // O'zgarishlarni vaqtinchalik saqlash

  render() {
    const users = App.data.users || {};
    // Userlarni alfavit tartibida sort qilish
    const usersArr = Object.entries(users).sort((a, b) => a[0].localeCompare(b[0]));
    const grid = document.getElementById('admin-users-grid');
    const roleColors = { owner:'linear-gradient(135deg,#8b5cf6,#6366f1)', admin:'var(--accent-gradient)', 'pro+':'linear-gradient(135deg,#ec4899,#f472b6)', pro:'linear-gradient(135deg,#f59e0b,#fbbf24)', free:'linear-gradient(135deg,#475569,#64748b)' };
    const obyektlar = App.data.obyektlar || ['Barchasi'];
    const omborlar = App.data.omborlar || ['Barchasi'];

    try {
      grid.innerHTML = usersArr.length ? usersArr.map(([name, data]) => {
        // Obyektlarni array sifatida olish (agar string bo'lsa arrayga aylantirish)
        let userObyektlar = [];
        try {
          if (Array.isArray(data.obyekt)) {
            userObyektlar = data.obyekt;
          } else if (typeof data.obyekt === 'string') {
            userObyektlar = [data.obyekt];
          } else if (data.obyekt) {
            userObyektlar = [data.obyekt];
          }
        } catch (e) {
          console.error('Obyekt parse xatosi:', name, data.obyekt, e);
          userObyektlar = ['Barchasi'];
        }

        return `
        <div class="user-card" data-login="${name}">
          <div class="user-card-header">
            <div class="user-card-avatar" style="background:${roleColors[data.role]||roleColors.free}">${name.slice(0,2).toUpperCase()}</div>
            <div>
              <div class="user-card-name">${name}</div>
              <div class="user-card-id">${data.telegramId?'TG:'+data.telegramId:'TG:—'} • ${data.active?'✅ Aktiv':'🔴 Blok'}</div>
            </div>
          </div>
          <div class="user-card-actions">
            ${App.isOwner() && name !== App.currentUser?.login ? `
            <select class="user-role-select" data-login="${name}" data-field="role" style="flex:1 1 40%">
              <option value="free" ${data.role==='free'?'selected':''}>Free</option>
              <option value="pro" ${data.role==='pro'?'selected':''}>⭐ Pro</option>
              <option value="pro+" ${data.role==='pro+'?'selected':''}>💎 Pro+</option>
              <option value="admin" ${data.role==='admin'?'selected':''}>👑 Admin</option>
              <option value="owner" ${data.role==='owner'?'selected':''}>🔐 Owner</option>
            </select>
            ` : `
            <div style="flex:1 1 40%; background:var(--bg-secondary); padding:8px; border-radius:4px; font-size:12px; text-align:center; color:var(--text-muted)">
              ${data.role==='owner'?'🔐 Owner':data.role==='admin'?'👑 Admin':data.role==='pro+'?'💎 Pro+':data.role==='pro'?'⭐ Pro':'Free'}
            </div>
            `}
            <div style="flex:1 1 40%; display:flex; flex-direction:column; gap:4px; margin-top:4px;">
              <div style="font-size:10px; color:var(--text-secondary);">Obyektlar:</div>
              <div style="display:flex; flex-wrap:wrap; gap:4px; max-height:60px; overflow-y:auto;">
                ${obyektlar.map(o => `
                  <label style="display:flex; align-items:center; gap:4px; font-size:10px; background:var(--bg-secondary); padding:2px 6px; border-radius:4px; cursor:pointer;">
                    <input type="checkbox" data-login="${name}" data-obyekt="${o}" class="obyekt-checkbox" ${userObyektlar.includes(o)?'checked':''}> ${o}
                  </label>
                `).join('')}
              </div>
            </div>
            <label style="display:flex;align-items:center;gap:6px;font-size:11px;width:100%;margin-top:6px">
              <input type="checkbox" data-login="${name}" data-field="canEditJurnal" ${data.canEditJurnal?'checked':''}> Tahrirlash
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:11px;width:100%;margin-top:6px">
              <input type="checkbox" data-login="${name}" data-field="canDeleteJurnal" ${data.canDeleteJurnal?'checked':''}> O'chirish
            </label>
            <button class="btn btn-sm ${data.active?'btn-red':'btn-green'}" data-action="toggleBlock" data-login="${name}" style="padding:8px;font-size:10px">${data.active?'BLOK':'AKTIV'}</button>
            ${(App.isOwner() || (App.isAdmin() && data.role !== 'admin' && data.role !== 'owner')) ? `
            <button class="btn btn-sm btn-outline" data-action="deleteUser" data-login="${name}" style="padding:8px;font-size:10px;color:var(--red);border-color:var(--red)">O'CHIRISH</button>
            ` : ''}
            ${App.isOwner() ? `
            <button class="btn btn-sm btn-outline" data-action="changePass" data-login="${name}" style="padding:8px;font-size:10px">PAROL</button>
            ` : ''}
          </div>
        </div>
      `;
      }).join('') : '<div class="empty-state">Foydalanuvchilar yo\'q</div>';
    } catch (e) {
      console.error('Admin render xatosi:', e);
      grid.innerHTML = '<div class="empty-state" style="color:var(--red)">Xatolik yuz berdi: ' + e.message + '</div>';
    }

    this.bindGridHandlers();

    document.getElementById('admin-total-users').textContent = usersArr.length;
    document.getElementById('admin-active-users').textContent = usersArr.filter(([,d])=>d.active).length;
    document.getElementById('admin-paid-users').textContent = usersArr.filter(([,d])=>d.role==='pro'||d.role==='pro+').length;
    document.getElementById('admin-total-records').textContent = (App.data.jurnal||[]).length;

    // Botlarni yuklash (admin/owner)
    if (App.isAdmin() || App.isOwner()) {
      this.loadBots();
    }
  },

  bindGridHandlers() {
    const grid = document.getElementById('admin-users-grid');
    if (!grid || grid.dataset.bound === '1') return;
    grid.dataset.bound = '1';

    grid.addEventListener('change', (e) => {
      const t = e.target;
      const login = t?.dataset?.login;

      // Obyekt checkboxlarini qo'llash
      if (t.classList.contains('obyekt-checkbox')) {
        const obyekt = t?.dataset?.obyekt;
        if (!login || !obyekt) return;

        if (!this.pendingChanges[login]) {
          this.pendingChanges[login] = {};
        }

        // Barcha obyekt checkboxlarini tekshirib, obyekt arrayini yaratish
        const allObyektCheckboxes = document.querySelectorAll(`.obyekt-checkbox[data-login="${login}"]`);
        const selectedObyektlar = [];
        allObyektCheckboxes.forEach(cb => {
          if (cb.checked) {
            selectedObyektlar.push(cb.dataset.obyekt);
          }
        });

        this.pendingChanges[login].obyekt = selectedObyektlar;
        this.markUserCardAsChanged(login);
        return;
      }

      const field = t?.dataset?.field;
      if (!login || !field) return;

      // O'zgarishni pendingChanges ga saqlash, darhol yubormaslik
      if (!this.pendingChanges[login]) {
        this.pendingChanges[login] = {};
      }

      if (t.tagName === 'SELECT') {
        this.pendingChanges[login][field] = t.value;
        this.markUserCardAsChanged(login);
      }

      if (t.tagName === 'INPUT' && t.type === 'checkbox' && !t.classList.contains('obyekt-checkbox')) {
        this.pendingChanges[login][field] = !!t.checked;
        this.markUserCardAsChanged(login);
      }
    });

    grid.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const login = btn.dataset.login;
      if (!action || !login) return;

      // Bu tugmalar darhol ishlashi kerak (saqlash tugmasini kutmaslik)
      if (action === 'toggleBlock') this.toggleBlock(login);
      if (action === 'deleteUser') this.deleteUser(login);
      if (action === 'changePass') this.changePass(login);
    });
  },

  markUserCardAsChanged(login) {
    const card = document.querySelector(`.user-card[data-login="${login}"]`);
    if (card) {
      card.style.border = '2px solid var(--accent)';
      card.style.boxShadow = '0 0 10px var(--accent-glow)';
    }
  },

  async saveAllChanges() {
    if (Object.keys(this.pendingChanges).length === 0) {
      alert('Saqlash uchun o\'zgarishlar yo\'q!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [login, changes] of Object.entries(this.pendingChanges)) {
      try {
        // Field mapping: frontend -> backend
        const mappedChanges = {};
        const keyMap = {
          canEditJurnal: 'can_edit_jurnal',
          canDeleteJurnal: 'can_delete_jurnal'
        };

        for (const [key, value] of Object.entries(changes)) {
          mappedChanges[keyMap[key] || key] = value;
        }

        console.log(`💾 Saqlash ${login}:`, mappedChanges);
        const res = await API.updateUser(login, mappedChanges);
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error(`${login} uchun xato:`, res.error);
        }
      } catch (e) {
        errorCount++;
        console.error(`${login} uchun xato:`, e);
      }
    }

    this.pendingChanges = {};
    await App.loadData();
    this.render();

    if (errorCount > 0) {
      alert(`${successCount} ta muvaffaqiyatli, ${errorCount} ta xato bilan saqlandi!`);
    } else {
      alert(`${successCount} ta foydalanuvchi muvaffaqiyatli saqlandi!`);
    }
  },

  showAddUser() { 
    if (!App.isOwner()) {
      alert('Faqat Owner yangi foydalanuvchi qo\'sha oladi!');
      return;
    }
    document.getElementById('add-user-card').style.display = 'block'; 
  },

  async addUser() {
    if (!App.isOwner()) {
      alert('Faqat Owner yangi foydalanuvchi qo\'sha oladi!');
      return;
    }
    const login = document.getElementById('new-user-login').value.trim().toLowerCase();
    const password = document.getElementById('new-user-pass').value;
    const telegramId = document.getElementById('new-user-tgid').value.trim();
    const role = document.getElementById('new-user-role').value;
    if (!login || !password) { Utils.showMsg('add-user-msg', 'Login va parol kiriting!', 'err'); return; }
    try {
      const res = await API.addUser({ login, password, role, telegramId });
      if (res.ok) {
        Utils.showMsg('add-user-msg', 'Qo\'shildi!', 'ok');
        document.getElementById('add-user-card').style.display = 'none';
        document.getElementById('new-user-login').value = '';
        document.getElementById('new-user-pass').value = '';
        document.getElementById('new-user-tgid').value = '';
        await App.loadData();
        this.render();
      } else {
        Utils.showMsg('add-user-msg', res.error || 'Xato!', 'err');
        alert(res.error || 'Xato!');
      }
    } catch (e) {
      console.error('Admin.addUser xato:', e);
      Utils.showMsg('add-user-msg', 'Server bilan ulanishda xato!', 'err');
    }
  },

  async changeRole(login, role) {
    try {
      const res = await API.updateUser(login, { role });
      if (!res.ok) {
        alert(res.error || 'Role o\'zgartirishda xato!');
        return;
      }
      await App.loadData();
      this.render();
    } catch (e) {
      console.error('Admin.changeRole xato:', e);
      alert('Server bilan ulanishda xato!');
    }
  },

  async changeObyekt(login, obyekt) {
    try {
      const res = await API.updateUser(login, { obyekt });
      if (!res.ok) {
        alert(res.error || 'Obyekt o\'zgartirishda xato!');
        return;
      }
      await App.loadData();
      this.render();
    } catch (e) {
      console.error('Admin.changeObyekt xato:', e);
      alert('Server bilan ulanishda xato!');
    }
  },

  async changePerm(login, field, value) {
    const keyMap = {
      canEditJurnal: 'can_edit_jurnal',
      canDeleteJurnal: 'can_delete_jurnal'
    };
    const apiKey = keyMap[field] || field;
    try {
      const res = await API.updateUser(login, { [apiKey]: value });
      if (!res.ok) {
        alert(res.error || 'Huquqni o\'zgartirishda xato!');
        return;
      }
      await App.loadData();
      this.render();
    } catch (e) {
      console.error('Admin.changePerm xato:', e);
      alert('Server bilan ulanishda xato!');
    }
  },

  async toggleBlock(login) {
    if (login === App.currentUser?.login) { alert('O\'zingizni bloklash mumkin emas!'); return; }
    const user = App.data.users[login];
    try {
      const res = await API.updateUser(login, { active: !user.active });
      if (!res.ok) {
        alert(res.error || 'Aktiv/BLOK qilishda xato!');
        return;
      }
      await App.loadData();
      this.render();
    } catch (e) {
      console.error('Admin.toggleBlock xato:', e);
      alert('Server bilan ulanishda xato!');
    }
  },

  async deleteUser(login) {
    if (login === App.currentUser?.login) { alert('O\'zingizni o\'chirish mumkin emas!'); return; }
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    try {
      const res = await API.deleteUser(login);
      if (!res.ok) {
        alert(res.error || 'O\'chirishda xato!');
        return;
      }
      await App.loadData();
      this.render();
    } catch (e) {
      console.error('Admin.deleteUser xato:', e);
      alert('Server bilan ulanishda xato!');
    }
  },

  async changePass(login) {
    const newPass = prompt('Yangi parol kiriting:');
    if (!newPass || newPass.length < 3) { alert('Parol kamida 3 belgidan iborat bo\'lishi kerak!'); return; }
    try {
      const res = await API.updateUser(login, { password: newPass });
      if (!res.ok) { alert(res.error || 'Parol o\'zgartirishda xato!'); return; }
      alert('Parol muvaffaqiyatli o\'zgartirildi!');
    } catch (e) {
      alert('Server bilan ulanishda xato!');
    }
  },

  // ─── TELEGRAM BOTLAR ───
  bots: [],

  showAddBot() {
    if (!App.isAdmin() && !App.isOwner()) { alert('Faqat admin/owner uchun!'); return; }
    document.getElementById('add-bot-card').style.display = 'block';
  },

  async loadBots() {
    try {
      const res = await API.getBots();
      if (!res.ok) { console.error('loadBots:', res.error); return; }
      this.bots = res.data || [];
      this.renderBots();
    } catch (e) {
      console.error('loadBots xato:', e);
    }
  },

  renderBots() {
    const grid = document.getElementById('admin-bots-grid');
    if (!grid) return;
    if (!this.bots.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">🤖 Hozircha botlar yo\'q. "+ Yangi Bot" tugmasini bosing.</div>';
      return;
    }
    grid.innerHTML = this.bots.map(b => `
      <div class="user-card" data-bot-id="${b.id}">
        <div class="user-card-header">
          <div class="user-card-avatar" style="background:linear-gradient(135deg,#0088cc,#229ED9)">🤖</div>
          <div>
            <div class="user-card-name">${b.name || 'Bot'}</div>
            <div class="user-card-id">${b.running ? '🟢 Ishlayapti' : (b.active ? '🟡 Faol (kutmoqda)' : '🔴 O\'chiq')}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin:6px 0">Token: <code>${b.tokenMasked}</code></div>
        <div style="font-size:11px;color:var(--text-secondary);margin:6px 0">🔑 Kirish kodi: <b>${b.accessCode}</b></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
          <button class="btn btn-sm ${b.active?'btn-red':'btn-green'}" onclick="Admin.toggleBot('${b.id}', ${!b.active})">${b.active?'🔴 O\'chirish':'🟢 Yoqish'}</button>
          <button class="btn btn-sm btn-outline" onclick="Admin.changeBotCode('${b.id}')">🔑 Kod</button>
          <button class="btn btn-sm btn-outline" style="color:var(--red);border-color:var(--red)" onclick="Admin.deleteBot('${b.id}')">🗑 O'chirish</button>
        </div>
      </div>
    `).join('');
  },

  async addBot() {
    const name = document.getElementById('new-bot-name').value.trim() || 'OmborPro Bot';
    const token = document.getElementById('new-bot-token').value.trim();
    const accessCode = document.getElementById('new-bot-code').value.trim();
    if (!token || !accessCode) {
      Utils.showMsg('add-bot-msg', 'Token va kod kiriting!', 'err');
      return;
    }
    try {
      const res = await API.addBot({ name, token, accessCode });
      if (!res.ok) { Utils.showMsg('add-bot-msg', res.error || 'Xato!', 'err'); return; }
      Utils.showMsg('add-bot-msg', res.warning ? 'Saqlandi (ogohlantirish: ' + res.warning + ')' : 'Bot qo\'shildi va ishga tushdi!', 'ok');
      document.getElementById('new-bot-name').value = '';
      document.getElementById('new-bot-token').value = '';
      document.getElementById('new-bot-code').value = '';
      setTimeout(() => {
        document.getElementById('add-bot-card').style.display = 'none';
        this.loadBots();
      }, 800);
    } catch (e) {
      console.error('addBot xato:', e);
      Utils.showMsg('add-bot-msg', 'Server xato: ' + e.message, 'err');
    }
  },

  async toggleBot(id, active) {
    try {
      const res = await API.updateBot(id, { active });
      if (!res.ok) { alert(res.error || 'Xato!'); return; }
      this.loadBots();
    } catch (e) { alert('Server xato!'); }
  },

  async changeBotCode(id) {
    const code = prompt('Yangi kirish kodi:');
    if (!code) return;
    try {
      const res = await API.updateBot(id, { accessCode: code });
      if (!res.ok) { alert(res.error || 'Xato!'); return; }
      alert('Kod yangilandi!');
      this.loadBots();
    } catch (e) { alert('Server xato!'); }
  },

  async deleteBot(id) {
    if (!confirm('Bu botni o\'chirishni tasdiqlaysizmi?')) return;
    try {
      const res = await API.deleteBot(id);
      if (!res.ok) { alert(res.error || 'Xato!'); return; }
      this.loadBots();
    } catch (e) { alert('Server xato!'); }
  }
};