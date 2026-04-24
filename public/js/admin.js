/**
 * Admin — Foydalanuvchilarni boshqarish
 */
console.log('Admin.js loaded v2026-04-21-3');

const Admin = {
  render() {
    const users = App.data.users || {};
    // "O'chirish" backendda active=false (soft delete). UIda bunday userlarni yashiramiz.
    const usersArr = Object.entries(users);
    const grid = document.getElementById('admin-users-grid');
    const roleColors = { admin:'var(--accent-gradient)', 'pro+':'linear-gradient(135deg,#ec4899,#f472b6)', pro:'linear-gradient(135deg,#f59e0b,#fbbf24)', free:'linear-gradient(135deg,#475569,#64748b)' };
    const obyektlar = App.data.obyektlar || ['Barchasi'];
    const omborlar = App.data.omborlar || ['Barchasi'];

    grid.innerHTML = usersArr.length ? usersArr.map(([name, data]) => `
      <div class="user-card">
        <div class="user-card-header">
          <div class="user-card-avatar" style="background:${roleColors[data.role]||roleColors.free}">${name.slice(0,2).toUpperCase()}</div>
          <div>
            <div class="user-card-name">${name}</div>
            <div class="user-card-id">${data.telegramId?'TG:'+data.telegramId:'TG:—'} • ${data.active?'✅ Aktiv':'🔴 Blok'}</div>
          </div>
        </div>
        <div class="user-card-actions">
          <select class="user-role-select" data-login="${name}" data-field="role" style="flex:1 1 40%">
            <option value="free" ${data.role==='free'?'selected':''}>Free</option>
            <option value="pro" ${data.role==='pro'?'selected':''}>⭐ Pro</option>
            <option value="pro+" ${data.role==='pro+'?'selected':''}>💎 Pro+</option>
            <option value="admin" ${data.role==='admin'?'selected':''}>👑 Admin</option>
          </select>
          <select class="user-role-select" data-login="${name}" data-field="obyekt" style="flex:1 1 40%">
            ${obyektlar.map(o=>`<option value="${o}" ${data.obyekt===o?'selected':''}>${o}</option>`).join('')}
          </select>
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;width:100%;margin-top:6px">
            <input type="checkbox" data-login="${name}" data-field="canEditJurnal" ${data.canEditJurnal?'checked':''}> Tahrirlash
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;width:100%;margin-top:6px">
            <input type="checkbox" data-login="${name}" data-field="canDeleteJurnal" ${data.canDeleteJurnal?'checked':''}> O'chirish
          </label>
          <button class="btn btn-sm ${data.active?'btn-red':'btn-green'}" data-action="toggleBlock" data-login="${name}" style="padding:8px;font-size:10px">${data.active?'BLOK':'AKTIV'}</button>
          <button class="btn btn-sm btn-outline" data-action="deleteUser" data-login="${name}" style="padding:8px;font-size:10px;color:var(--red);border-color:var(--red)">O'CHIRISH</button>
          <button class="btn btn-sm btn-outline" data-action="changePass" data-login="${name}" style="padding:8px;font-size:10px">PAROL</button>
        </div>
      </div>
    `).join('') : '<div class="empty-state">Foydalanuvchilar yo\'q</div>';

    this.bindGridHandlers();

    document.getElementById('admin-total-users').textContent = usersArr.length;
    document.getElementById('admin-active-users').textContent = usersArr.filter(([,d])=>d.active).length;
    document.getElementById('admin-paid-users').textContent = usersArr.filter(([,d])=>d.role==='pro'||d.role==='pro+').length;
    document.getElementById('admin-total-records').textContent = (App.data.jurnal||[]).length;
  },

  bindGridHandlers() {
    const grid = document.getElementById('admin-users-grid');
    if (!grid || grid.dataset.bound === '1') return;
    grid.dataset.bound = '1';

    grid.addEventListener('change', (e) => {
      const t = e.target;
      const login = t?.dataset?.login;
      const field = t?.dataset?.field;
      if (!login || !field) return;

      if (t.tagName === 'SELECT') {
        if (field === 'role') this.changeRole(login, t.value);
        if (field === 'obyekt') this.changeObyekt(login, t.value);
        return;
      }

      if (t.tagName === 'INPUT' && t.type === 'checkbox') {
        this.changePerm(login, field, !!t.checked);
      }
    });

    grid.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const login = btn.dataset.login;
      if (!action || !login) return;

      if (action === 'toggleBlock') this.toggleBlock(login);
      if (action === 'deleteUser') this.deleteUser(login);
      if (action === 'changePass') this.changePass(login);
    });
  },

  showAddUser() { document.getElementById('add-user-card').style.display = 'block'; },

  async addUser() {
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
    // Backend snake_case field nomlarini kutadi
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
  }
};
