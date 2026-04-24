/**
 * Jurnal — Jurnal va Tarix tab
 */
const Jurnal = {
  expandedGroup: null,

  render() {
    const jurnal = App.data.jurnal || [];
    const obyekt = document.getElementById('jurnal-obyekt-filter')?.value || 'Barchasi';
    const turFilter = document.getElementById('jurnal-type-filter')?.value || 'Barchasi';
    const search = (document.getElementById('jurnal-search')?.value || '').toLowerCase().trim();

    let filtered = [...jurnal];
    if (obyekt !== 'Barchasi') filtered = filtered.filter(r => r.obyekt === obyekt);
    if (turFilter !== 'Barchasi') filtered = filtered.filter(r => r.tur === turFilter);
    if (search) filtered = filtered.filter(r =>
      (r.mahsulot || '').toLowerCase().includes(search) ||
      (r.tomon || '').toLowerCase().includes(search) ||
      (r.sana || '').toLowerCase().includes(search)
    );

    // Group
    const groups = new Map();
    filtered.forEach(r => {
      const key = `${r.sana || ''}-${r.operator || ''}-${r.obyekt || ''}-${r.tomon || ''}-${r.tur}`;
      if (!groups.has(key)) groups.set(key, { key, sana: r.sana, tur: r.tur, obyekt: r.obyekt, tomon: r.tomon, items: [], totalSum: 0, totalMiqdor: 0 });
      const g = groups.get(key);
      g.items.push(r);
      g.totalSum += Number(r.summa) || 0;
      g.totalMiqdor += Number(r.miqdor) || 0;
    });

    const groupList = Array.from(groups.values());
    groupList.sort((a, b) => (Utils.parseDate(b.sana) || new Date(0)) - (Utils.parseDate(a.sana) || new Date(0)));

    document.getElementById('jurnal-count2').textContent = groupList.length + ' guruh';

    if (!groupList.length) {
      document.getElementById('jurnal-rows').innerHTML = '<tr><td colspan="10" class="empty-state"><div class="empty-state-icon">📜</div><div class="empty-state-text">Topilmadi</div></td></tr>';
      return;
    }

    const canEdit = App.currentUser?.canEditJurnal || App.getUserRole() === 'admin';
    const canDelete = App.currentUser?.canDeleteJurnal || App.getUserRole() === 'admin';
    let html = '';
    groupList.forEach((g, gi) => {
      const exp = this.expandedGroup === g.key;
      html += `<tr class="jurnal-group ${exp ? 'expanded' : ''}" onclick="Jurnal.toggle('${g.key}')" style="cursor:pointer">
        <td class="mono" style="color:var(--text-muted)">${String(gi + 1).padStart(3, '0')}</td>
        <td class="mono" style="font-size:11px;color:var(--text-muted)">${g.sana || '—'}</td>
        <td>${g.tur === 'Kirim' ? '<span class="badge badge-kirim">KIRIM</span>' : '<span class="badge badge-chiqim">CHIQIM</span>'}</td>
        <td style="font-size:11px;color:var(--text-secondary)">${g.obyekt || '—'}</td>
        <td colspan="2" class="mono">${Utils.formatNumber(g.totalMiqdor)} (${g.items.length} mahsulot)</td>
        <td></td>
        <td class="mono" style="color:${g.tur === 'Kirim' ? 'var(--green)' : 'var(--red)'}">${Utils.formatSum(g.totalSum)}</td>
        <td style="color:var(--text-secondary);font-size:12px">${g.tomon || '—'}</td>
        <td onclick="event.stopPropagation()"><span class="toggle-icon ${exp ? 'open' : ''}">▶️</span></td>
      </tr>`;
      if (exp) {
        // Guruh darajasida Tahrirlash va O'chirish knopkalari
        html += `<tr style="background: rgba(99, 102, 241, 0.08)">
          <td colspan="10" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 12px; color: var(--text-secondary);">
                <strong>${g.tomon || '—'}</strong> - ${g.items.length} ta mahsulot
              </div>
              <div style="display: flex; gap: 8px;">
                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="Jurnal.editGroup('${g.key}')" style="padding: 6px 12px; font-size: 11px;">Tahrirlash</button>` : ''}
                ${canDelete ? `<button class="btn btn-sm btn-outline" onclick="Jurnal.deleteGroup('${g.key}')" style="padding: 6px 12px; font-size: 11px; color: var(--red); border-color: var(--red);">O'chirish</button>` : ''}
              </div>
            </div>
          </td>
        </tr>`;
        
        g.items.forEach(item => {
          const idx = jurnal.indexOf(item);
          html += `<tr class="jurnal-detail" id="jrn-row-${item.id}">
            <td class="mono" style="color:var(--text-muted)">${String(idx + 1).padStart(3, '0')}</td>
            <td class="mono edit-sana" style="font-size:11px">${item.sana || '—'}</td>
            <td></td><td></td>
            <td style="font-weight:500;padding-left:20px" class="edit-mahsulot">${item.mahsulot || '—'}</td>
            <td class="mono edit-miqdor">${Utils.formatNumber(item.miqdor)}</td>
            <td class="mono edit-narx">${item.narx ? Utils.formatSum(item.narx) : '—'}</td>
            <td class="mono edit-summa" style="color:${item.tur === 'Kirim' ? 'var(--green)' : 'var(--red)'}">${Utils.formatSum(item.summa)}</td>
            <td></td>
            <td></td>
          </tr>`;
        });
      }
    });
    document.getElementById('jurnal-rows').innerHTML = html;
  },

  toggle(key) {
    this.expandedGroup = this.expandedGroup === key ? null : key;
    this.render();
  },

  startEdit(id) {
    const r = (App.data.jurnal || []).find(x => x.id === id);
    if (!r) return;
    const tr = document.getElementById('jrn-row-' + id);
    if (!tr) return;

    const tdSana = tr.querySelector('.edit-sana');
    const tdM = tr.querySelector('.edit-mahsulot');
    const tdQ = tr.querySelector('.edit-miqdor');
    const tdN = tr.querySelector('.edit-narx');
    const tdS = tr.querySelector('.edit-summa');
    const tdA = tr.querySelector('.edit-actions');

    tdSana.innerHTML = `<input type="text" class="f-input" id="edit-sana-${id}" value="${r.sana || ''}" style="margin:0; width:90px; font-size:11px; padding:4px;" placeholder="__/__/____">`;
    tdM.innerHTML = `<input type="text" class="f-input" id="edit-m-${id}" value="${r.mahsulot || ''}" list="products-list" style="margin:0; width:120px; font-size:12px; padding:4px;">`;
    tdQ.innerHTML = `<input type="number" class="f-input" id="edit-q-${id}" value="${r.miqdor || 0}" style="margin:0; width:80px; font-size:12px; padding:4px;" oninput="Jurnal.calcSum('${id}')">`;
    tdN.innerHTML = `<input type="number" class="f-input" id="edit-n-${id}" value="${r.narx || 0}" style="margin:0; width:100px; font-size:12px; padding:4px;" oninput="Jurnal.calcSum('${id}')">`;
    tdS.innerHTML = `<input type="number" class="f-input" id="edit-s-${id}" value="${r.summa || 0}" style="margin:0; width:100px; font-size:12px; padding:4px;">`;

    tdA.innerHTML = `
      <button class="btn btn-sm btn-green" onclick="Jurnal.saveEdit('${id}')" style="padding:4px 8px;font-size:10px">💾</button>
      <button class="btn btn-sm btn-outline" onclick="Jurnal.render()" style="padding:4px 8px;font-size:10px">❌</button>
    `;
  },

  calcSum(id) {
    const q = Number(document.getElementById('edit-q-' + id).value) || 0;
    const n = Number(document.getElementById('edit-n-' + id).value) || 0;
    if (q && n) {
      document.getElementById('edit-s-' + id).value = q * n;
    }
  },

  async saveEdit(id) {
    const newSana = document.getElementById('edit-sana-' + id).value;
    const newM = document.getElementById('edit-m-' + id).value;
    const newQ = document.getElementById('edit-q-' + id).value;
    const newN = document.getElementById('edit-n-' + id).value;
    const newS = document.getElementById('edit-s-' + id).value;

    const res = await API.updateJournal(id, {
      sana: newSana.trim(),
      mahsulot: newM.trim(),
      miqdor: parseFloat(newQ) || 0,
      narx: parseFloat(newN) || 0,
      summa: parseFloat(newS) || 0
    });

    if (res.ok) { App.loadData(); }
    else alert(res.error || 'Xato!');
  },

  async del(id) {
    const r = (App.data.jurnal || []).find(x => x.id === id);
    if (!r) return;
    if (!confirm(`"${r.mahsulot}" yozuvini o'chirmoqchimisiz?`)) return;
    const res = await API.deleteJournal(id);
    if (res.ok) { alert('O\'chirildi!'); App.loadData(); }
    else alert(res.error || 'Xato!');
  },

  renderArchive() {
    const history = App.data.history || [];
    document.getElementById('archive-count').textContent = history.length + ' yozuv';
    const isAdmin = App.getUserRole() === 'admin';
    document.getElementById('archive-rows').innerHTML = history.length ? history.map((r, i) => {
      const isEdit = r.action === 'edit';
      const actor = isEdit ? r.editedby || r.editedBy || '—' : r.deletedby || r.deletedBy || '—';
      return `<tr style="background:${isEdit ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'}">
        <td class="mono" style="font-size:11px">${r.sana || '—'}</td>
        <td>${r.tur === 'Kirim' ? '<span class="badge badge-kirim">KIRIM</span>' : '<span class="badge badge-chiqim">CHIQIM</span>'}</td>
        <td style="font-size:11px">${r.obyekt || '—'}</td>
        <td style="font-weight:500">${r.mahsulot || '—'}</td>
        <td class="mono">${Utils.formatNumber(r.miqdor)}</td>
        <td class="mono">${Utils.formatSum(r.summa)}</td>
        <td style="font-size:11px;color:${isEdit ? 'var(--green)' : 'var(--red)'}">${isEdit ? 'Tahrirladi' : 'O\'chirdi'}: ${actor}</td>
        <td>${!isEdit && isAdmin ? `<button class="btn btn-sm btn-green" onclick="Jurnal.restore(${i})" style="padding:4px 8px;font-size:10px">♻️ TIKLASH</button>` : ''}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="empty-state"><div class="empty-state-text">Tarix bo\'sh</div></td></tr>';
  },

  async restore(histIdx) {
    if (!confirm('Yozuvni tiklaymi?')) return;
    const res = await API.restoreJournal(histIdx);
    if (res.ok) { alert('Tiklandi!'); App.loadData(); }
    else alert(res.error || 'Xato!');
  },

  async clearArchive() {
    if (!confirm('Barcha tarixni tozalashni tasdiqlaysizmi?')) return;
    // Client-side only clear — backend doesn't have a clear-all
    App.data.history = [];
    this.renderArchive();
  },

  // Guruh tahrirlash funksiyasi
  editGroup(key) {
    this.currentEditKey = key; // Keyni saqlash
    const jurnal = App.data.jurnal || [];
    const groupItems = jurnal.filter(item => {
      const itemKey = `${item.sana || ''}-${item.operator || ''}-${item.obyekt || ''}-${item.tomon || ''}-${item.tur}`;
      return itemKey === key;
    });

    if (groupItems.length === 0) {
      alert('Guruh topilmadi!');
      return;
    }

    const firstItem = groupItems[0];
    const katalog = App.data.katalog || [];
    const firms = App.data.firms || [];
    
    // Modal yaratish
    const modalHtml = `
      <div id="edit-group-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;">
        <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:32px;max-width:600px;width:90%;max-height:90vh;overflow-y:auto;border:1px solid var(--border);">
          <h3 style="font-size:20px;font-weight:700;margin-bottom:24px;color:var(--text);">Guruhni Tahrirlash</h3>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Sana</label>
            <input type="text" id="edit-sana" value="${firstItem.sana || ''}" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;">
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Tur</label>
            <select id="edit-tur" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;">
              <option value="Kirim" ${firstItem.tur === 'Kirim' ? 'selected' : ''}>Kirim</option>
              <option value="Chiqim" ${firstItem.tur === 'Chiqim' ? 'selected' : ''}>Chiqim</option>
            </select>
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Obyekt</label>
            <select id="edit-obyekt" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;">
              ${(() => {
                let obyektlar = App.data.obyektlar || ['Barchasi'];
                if (typeof obyektlar === 'string') {
                  obyektlar = obyektlar.split(',').map(o => o.trim());
                }
                if (Array.isArray(obyektlar)) {
                  obyektlar = obyektlar.flatMap(o => {
                    if (typeof o === 'string' && o.includes(',')) {
                      return o.split(',').map(x => x.trim());
                    }
                    return o;
                  });
                }
                obyektlar = Array.from(new Set(obyektlar));
                return obyektlar.map(o => `<option value="${o}" ${firstItem.obyekt === o ? 'selected' : ''}>${o}</option>`).join('');
              })()}
            </select>
          </div>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Firma</label>
            <div style="display:flex;gap:8px;">
              <input type="text" id="edit-tomon" value="${firstItem.tomon || ''}" list="firms-list" style="flex:1;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;">
              <button onclick="Jurnal.showAddFirmModal()" style="padding:12px 16px;background:var(--accent-dim);color:var(--accent-light);border:1px solid var(--accent);border-radius:var(--radius-sm);cursor:pointer;font-size:12px;">+ Yangi</button>
            </div>
            <datalist id="firms-list">
              ${firms.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
            </datalist>
          </div>
          
          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">Mahsulotlar (${groupItems.length} ta)</label>
            <div id="edit-products-container" style="max-height:300px;overflow-y:auto;">
              ${groupItems.map((item, idx) => `
                <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;padding:12px;background:rgba(31,41,55,0.3);border-radius:var(--radius-sm);">
                  <div>
                    <label style="font-size:10px;color:var(--text-muted);">Mahsulot</label>
                    <input type="text" class="edit-product-name" value="${item.mahsulot || ''}" list="products-list" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
                  </div>
                  <div>
                    <label style="font-size:10px;color:var(--text-muted);">Miqdor</label>
                    <input type="number" class="edit-product-miqdor" value="${item.miqdor || 0}" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
                  </div>
                  <div>
                    <label style="font-size:10px;color:var(--text-muted);">Narx</label>
                    <input type="number" class="edit-product-narx" value="${item.narx || 0}" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
                  </div>
                  <div style="display:flex;align-items:flex-end;">
                    <button onclick="this.closest('div').parentElement.remove()" style="padding:8px;background:var(--red-dim);color:var(--red);border:1px solid var(--red);border-radius:6px;cursor:pointer;font-size:12px;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <datalist id="products-list">
              ${katalog.map(k => `<option value="${k.nom}">${k.nom} (${k.olv || '—'})</option>`).join('')}
            </datalist>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button onclick="Jurnal.addEditProductRow()" style="padding:8px 16px;background:var(--accent-dim);color:var(--accent-light);border:1px solid var(--accent);border-radius:6px;cursor:pointer;font-size:12px;">+ Mahsulot qo'shish</button>
              <button onclick="Jurnal.showAddProductModal()" style="padding:8px 16px;background:var(--green-dim);color:var(--green);border:1px solid var(--green);border-radius:6px;cursor:pointer;font-size:12px;">+ Yangi mahsulot</button>
            </div>
          </div>
          
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="Jurnal.closeEditGroupModal()" style="padding:12px 24px;background:transparent;color:var(--text-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;">Bekor qilish</button>
            <button onclick="Jurnal.saveGroupEdit('${key}')" style="padding:12px 24px;background:var(--accent-gradient);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:14px;font-weight:600;">Saqlash</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  addEditProductRow() {
    const container = document.getElementById('edit-products-container');
    const newRow = `
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-bottom:8px;padding:12px;background:rgba(31,41,55,0.3);border-radius:var(--radius-sm);">
        <div>
          <label style="font-size:10px;color:var(--text-muted);">Mahsulot</label>
          <input type="text" class="edit-product-name" value="" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);">Miqdor</label>
          <input type="number" class="edit-product-miqdor" value="0" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
        </div>
        <div>
          <label style="font-size:10px;color:var(--text-muted);">Narx</label>
          <input type="number" class="edit-product-narx" value="0" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button onclick="this.closest('div').parentElement.remove()" style="padding:8px;background:var(--red-dim);color:var(--red);border:1px solid var(--red);border-radius:6px;cursor:pointer;font-size:12px;">🗑️</button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', newRow);
  },

  closeEditGroupModal() {
    const modal = document.getElementById('edit-group-modal');
    if (modal) modal.remove();
  },

  async saveGroupEdit(key) {
    const jurnal = App.data.jurnal || [];
    const groupItems = jurnal.filter(item => {
      const itemKey = `${item.sana || ''}-${item.operator || ''}-${item.obyekt || ''}-${item.tomon || ''}-${item.tur}`;
      return itemKey === key;
    });

    if (groupItems.length === 0) {
      alert('Guruh topilmadi!');
      return;
    }

    const newSana = document.getElementById('edit-sana').value.trim();
    const newTur = document.getElementById('edit-tur').value;
    const newObyekt = document.getElementById('edit-obyekt').value;
    const newTomon = document.getElementById('edit-tomon').value.trim();

    // Validatsiya: firma katalogda borligini tekshirish
    if (newTomon) {
      const firms = App.data.firms || [];
      const firmExists = firms.some(f => f.name.toLowerCase() === newTomon.toLowerCase());
      if (!firmExists) {
        alert('Firma katalogda topilmadi! Iltimos, mavjud firmalardan tanlang yoki yangi firma qo\'shing.');
        return;
      }
    }

    const productRows = document.querySelectorAll('#edit-products-container > div');
    const newProducts = [];
    const katalog = App.data.katalog || [];
    
    productRows.forEach(row => {
      const name = row.querySelector('.edit-product-name').value.trim();
      const miqdor = parseFloat(row.querySelector('.edit-product-miqdor').value) || 0;
      const narx = parseFloat(row.querySelector('.edit-product-narx').value) || 0;
      
      if (name && miqdor > 0) {
        // Validatsiya: mahsulot katalogda borligini tekshirish
        const productExists = katalog.some(k => k.nom.toLowerCase() === name.toLowerCase());
        if (!productExists) {
          alert(`Mahsulot "${name}" katalogda topilmadi! Iltimos, mavjud mahsulotlardan tanlang yoki yangi mahsulot qo'shing.`);
          return;
        }
        newProducts.push({ name, miqdor, narx, summa: miqdor * narx });
      }
    });

    if (newProducts.length === 0) {
      alert('Kamida bitta mahsulot kiritilishi kerak!');
      return;
    }

    // Eski yozuvlarni o'chirish
    for (const item of groupItems) {
      const res = await API.deleteJournal(item.id);
      if (!res.ok) {
        alert('Xato: ' + (res.error || 'O\'chirish amalga oshmadi'));
        return;
      }
    }

    // Yangi yozuvlarni qo'shish
    const firstItem = groupItems[0];
    for (const prod of newProducts) {
      const res = await API.addJournal({
        sana: newSana,
        tur: newTur,
        mahsulot: prod.name,
        miqdor: prod.miqdor,
        narx: prod.narx,
        summa: prod.summa,
        obyekt: newObyekt,
        tomon: newTomon,
        izoh: firstItem.izoh || ''
      });
      if (!res.ok) {
        alert('Xato: ' + (res.error || 'Qo\'shish amalga oshmadi'));
        return;
      }
    }

    this.closeEditGroupModal();
    App.loadData();
  },

  // Guruh o'chirish funksiyasi
  async deleteGroup(key) {
    const jurnal = App.data.jurnal || [];
    const groupItems = jurnal.filter(item => {
      const itemKey = `${item.sana || ''}-${item.operator || ''}-${item.obyekt || ''}-${item.tomon || ''}-${item.tur}`;
      return itemKey === key;
    });

    if (groupItems.length === 0) {
      alert('Guruh topilmadi!');
      return;
    }

    if (!confirm(`Haqiqatan ham bu guruhdagi ${groupItems.length} ta mahsulotni o'chirmoqchimisiz?`)) {
      return;
    }

    // Barcha yozuvlarni o'chirish
    for (const item of groupItems) {
      const res = await API.deleteJournal(item.id);
      if (!res.ok) {
        alert('Xato: ' + (res.error || 'O\'chirish amalga oshmadi'));
        return;
      }
    }

    alert('Guruh muvaffaqiyatli o\'chirildi!');
    App.loadData();
  },

  // Yangi mahsulot qo'shish modal
  showAddProductModal() {
    const modalHtml = `
      <div id="add-product-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10001;display:flex;align-items:center;justify-content:center;">
        <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:32px;max-width:400px;width:90%;border:1px solid var(--border);">
          <h3 style="font-size:18px;font-weight:700;margin-bottom:24px;color:var(--text);">Yangi Mahsulot</h3>
          
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Mahsulot nomi</label>
            <input type="text" id="new-product-name" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="Mahsulot nomini kiriting...">
          </div>
          
          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">O'lchov birligi</label>
            <input type="text" id="new-product-olv" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="Masalan: kg, dona, qop">
          </div>
          
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="Jurnal.closeAddProductModal()" style="padding:12px 24px;background:transparent;color:var(--text-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;">Bekor qilish</button>
            <button onclick="Jurnal.saveNewProduct()" style="padding:12px 24px;background:var(--green);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:14px;font-weight:600;">Qo'shish</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.remove();
  },

  async saveNewProduct() {
    const name = document.getElementById('new-product-name').value.trim();
    const olv = document.getElementById('new-product-olv').value.trim();

    if (!name) {
      alert('Mahsulot nomi kiritilishi shart!');
      return;
    }

    const res = await API.addProductPublic(name, olv);
    if (res.ok) {
      alert('Mahsulot muvaffaqiyatli qo\'shildi!');
      this.closeAddProductModal();
      App.loadData();
      // Modalni yangilash
      const currentModal = document.getElementById('edit-group-modal');
      if (currentModal) {
        currentModal.remove();
        // Guruhni qayta ochish
        const groupKey = this.currentEditKey;
        if (groupKey) {
          this.editGroup(groupKey);
        }
      }
    } else {
      alert('Xato: ' + (res.error || 'Qo\'shish amalga oshmadi'));
    }
  },

  // Yangi firma qo'shish modal
  showAddFirmModal() {
    const modalHtml = `
      <div id="add-firm-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10001;display:flex;align-items:center;justify-content:center;">
        <div style="background:var(--bg-card);border-radius:var(--radius-lg);padding:32px;max-width:400px;width:90%;border:1px solid var(--border);">
          <h3 style="font-size:18px;font-weight:700;margin-bottom:24px;color:var(--text);">Yangi Firma</h3>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Firma nomi</label>
            <input type="text" id="new-firm-name" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="Firma nomini kiriting...">
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">INN</label>
            <input type="text" id="new-firm-inn" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="INN">
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Telegram ID</label>
            <input type="text" id="new-firm-telegram" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="Telegram ID">
          </div>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Telefon</label>
            <input type="text" id="new-firm-phone" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="+998...">
          </div>

          <div style="margin-bottom:24px;">
            <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Manzil</label>
            <input type="text" id="new-firm-address" style="width:100%;padding:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;" placeholder="Manzil">
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button onclick="Jurnal.closeAddFirmModal()" style="padding:12px 24px;background:transparent;color:var(--text-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;">Bekor qilish</button>
            <button onclick="Jurnal.saveNewFirm()" style="padding:12px 24px;background:var(--green);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-size:14px;font-weight:600;">Qo'shish</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  closeAddFirmModal() {
    const modal = document.getElementById('add-firm-modal');
    if (modal) modal.remove();
  },

  async saveNewFirm() {
    const name = document.getElementById('new-firm-name').value.trim();
    const inn = document.getElementById('new-firm-inn').value.trim();
    const telegram = document.getElementById('new-firm-telegram').value.trim();
    const phone = document.getElementById('new-firm-phone').value.trim();
    const address = document.getElementById('new-firm-address').value.trim();

    if (!name) {
      alert('Firma nomi kiritilishi shart!');
      return;
    }

    const res = await API.addFirmaPublic(name, inn, telegram, phone, address, '');
    if (res.ok) {
      alert('Firma muvaffaqiyatli qo\'shildi!');
      this.closeAddFirmModal();
      App.loadData();
      // Modalni yangilash
      const currentModal = document.getElementById('edit-group-modal');
      if (currentModal) {
        currentModal.remove();
        // Guruhni qayta ochish
        const groupKey = this.currentEditKey;
        if (groupKey) {
          this.editGroup(groupKey);
        }
      }
    } else {
      alert('Xato: ' + (res.error || 'Qo\'shish amalga oshmadi'));
    }
  }
};
