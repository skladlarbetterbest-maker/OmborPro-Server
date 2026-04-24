/**
 * Settings — Sozlamalar, Obyektlar, Omborlar, Min Stock
 */
const Settings = {
  renderObyektlar() {
    const list = document.getElementById('settings-obyektlar-list');
    if (!list) return;
    list.innerHTML = (App.data.obyektlar || []).map(obj => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(30,41,59,0.5);padding:10px 14px;border-radius:var(--radius-sm);">
        <span>${obj}</span>
        ${obj !== 'Barchasi' ? `<button class="btn btn-sm btn-outline" style="padding:4px 8px;font-size:10px;color:var(--red);border-color:var(--red)" onclick="Settings.deleteObyekt('${obj}')">X</button>` : ''}
      </div>
    `).join('');
  },

  async addObyekt() {
    const input = document.getElementById('new-obyekt-name');
    const val = input.value.trim();
    if (!val) return;
    await API.addObyekt(val);
    input.value = '';
    App.loadData();
    setTimeout(() => this.renderObyektlar(), 500);
  },

  async deleteObyekt(name) {
    if (!confirm('O\'chirmoqchimisiz?')) return;
    await API.deleteObyekt(name);
    App.loadData();
    setTimeout(() => this.renderObyektlar(), 500);
  },

  renderOmborlar() {
    const list = document.getElementById('settings-omborlar-list');
    if (!list) return;
    list.innerHTML = (App.data.omborlar || []).map(omb => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(30,41,59,0.5);padding:10px 14px;border-radius:var(--radius-sm);">
        <span>${omb}</span>
        ${omb !== 'Barchasi' ? `<button class="btn btn-sm btn-outline" style="padding:4px 8px;font-size:10px;color:var(--red);border-color:var(--red)" onclick="Settings.deleteOmbor('${omb}')">X</button>` : ''}
      </div>
    `).join('');
  },

  async addOmbor() {
    const input = document.getElementById('new-ombor-name');
    const val = input.value.trim();
    if (!val) return;
    await API.addOmbor(val);
    input.value = '';
    App.loadData();
    setTimeout(() => this.renderOmborlar(), 500);
  },

  async deleteOmbor(name) {
    if (!confirm('O\'chirmoqchimisiz?')) return;
    await API.deleteOmbor(name);
    App.loadData();
    setTimeout(() => this.renderOmborlar(), 500);
  },

  renderMinStock() {
    const list = document.getElementById('min-stock-list');
    if (!list) return;
    const minStock = App.data.minStock || {};
    const q = Utils.computeQoldiq(App.data.jurnal || []);
    const products = Object.keys(q);

    list.innerHTML = products.length ? products.map(nom => {
      const limit = minStock[nom] || 5;
      const current = q[nom]?.qoldiq || 0;
      const isLow = current <= limit;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;background:${isLow?'rgba(239,68,68,0.1)':'rgba(30,41,59,0.5)'};padding:10px 14px;border-radius:var(--radius-sm);border:1px solid ${isLow?'rgba(239,68,68,0.3)':'transparent'}">
          <div>
            <span style="font-weight:500">${nom}</span>
            <span style="font-size:11px;color:${isLow?'var(--red)':'var(--text-muted)'};margin-left:8px">Qoldiq: ${Utils.formatNumber(current)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;color:var(--text-muted)">Min:</span>
            <input type="number" value="${limit}" style="width:60px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:12px;outline:none"
              onchange="Settings.setMinStock('${nom}', this.value)">
          </div>
        </div>`;
    }).join('') : '<div style="color:var(--text-muted);text-align:center;padding:16px">Mahsulotlar yo\'q</div>';
  },

  async setMinStock(productName, minQty) {
    await API.post('/api/settings/min-stock', { productName, minQty: Number(minQty) });
    App.data.minStock[productName] = Number(minQty);
  },

  // --- Katalog ---
  renderKatalogSearchResults() {
    const list = document.getElementById('settings-katalog-list');
    const q = document.getElementById('katalog-search').value.toLowerCase().trim();
    if (!q) {
      list.innerHTML = '<div class="empty-state-text" style="font-size:12px;text-align:center;color:var(--text-muted)">Qidirish uchun matn kiriting...</div>';
      return;
    }
    const katalog = App.data.katalog || [];
    // Qidirib topamiz, va faqat birinchi 50 tasini chiqaramiz to performance tushmasligi uchun
    const results = katalog.filter(k => k.nom.toLowerCase().includes(q)).slice(0, 50);

    if (!results.length) {
      list.innerHTML = '<div class="empty-state-text" style="font-size:12px;text-align:center;color:var(--text-muted)">Topilmadi</div>';
      return;
    }

    list.innerHTML = results.map(k => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(30,41,59,0.5);padding:10px 14px;border-radius:var(--radius-sm);">
        <div>
           <div style="font-weight:500; font-size:13px">${k.nom}</div>
           <div style="font-size:11px; color:var(--text-muted)">O'lchov: ${k.olv || '—'}</div>
        </div>
        <div style="display:flex;gap:4px">
           <button class="btn btn-sm btn-outline" style="padding:4px 8px;font-size:10px;" onclick="Settings.editKatalogItem('${k.nom.replace(/'/g,"\\'").replace(/"/g,"&quot;")}', '${(k.olv||'').replace(/'/g,"\\'")}')">✏️</button>
           <button class="btn btn-sm btn-outline" style="padding:4px 8px;font-size:10px;color:var(--red);border-color:var(--red)" onclick="Settings.deleteKatalogItem('${k.nom.replace(/'/g,"\\'").replace(/"/g,"&quot;")}')">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  showAddKatalog() {
    document.getElementById('kat-form-old-nom').value = '';
    document.getElementById('kat-form-nom').value = '';
    document.getElementById('kat-form-olv').value = '';
    document.getElementById('katalog-form-title').innerText = "Yangi mahsulot qo'shish";
    document.getElementById('katalog-edit-form').style.display = 'block';
  },

  editKatalogItem(nom, olv) {
    document.getElementById('kat-form-old-nom').value = nom;
    document.getElementById('kat-form-nom').value = nom;
    document.getElementById('kat-form-olv').value = olv || '';
    document.getElementById('katalog-form-title').innerText = "Mahsulotni tahrirlash";
    document.getElementById('katalog-edit-form').style.display = 'block';
  },

  async saveKatalogItem() {
    const oldNom = document.getElementById('kat-form-old-nom').value.trim();
    const nom = document.getElementById('kat-form-nom').value.trim();
    const olv = document.getElementById('kat-form-olv').value.trim();
    
    if (!nom) { alert("Mahsulot nomi kiritilishi shart!"); return; }

    const res = await API.post('/api/settings/products', { nom, olv, oldNom });
    if (res.ok) {
       document.getElementById('katalog-edit-form').style.display = 'none';
       App.loadData();
       // biroz kutib yangilaymiz qidiruv natijasini
       setTimeout(() => this.renderKatalogSearchResults(), 500);
    } else {
       alert("Xato: " + (res.error || "Ulanishda xato"));
    }
  },

  async deleteKatalogItem(nom) {
    if (!confirm(`Haqiqatan ham "${nom}" ni katalogdan o'chirmoqchimisiz? (Bazada eski yozuvlar bo'lsa xato berishi mumkin)`)) return;

    const res = await API.post('/api/settings/products/delete', { nom });
    if (res.ok) {
       App.loadData();
       setTimeout(() => this.renderKatalogSearchResults(), 500);
    } else {
       alert("Xato: " + (res.error || "Ulanishda xato"));
    }
  },

  showImportKatalog() {
    document.getElementById('katalog-import-form').style.display = 'block';
    document.getElementById('katalog-edit-form').style.display = 'none';
  },

  async importKatalog() {
    const fileInput = document.getElementById('kat-import-file');
    if (!fileInput.files.length) { alert("Fayl tanlang!"); return; }

    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      // XLS/XLSX fayl
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          let imported = 0, errors = 0;

          // Skip header row (first row)
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[0]) continue;
            const nom = String(row[0] || '').trim();
            if (!nom) continue;

            const olv = String(row[1] || '').trim();

            const res = await API.post('/api/settings/products', { nom, olv });
            if (res.ok) imported++;
            else errors++;
          }

          alert(`Import tugadi! ${imported} ta mahsulot qo'shildi, ${errors} ta xato.`);
          document.getElementById('katalog-import-form').style.display = 'none';
          fileInput.value = '';
          App.loadData();
          setTimeout(() => this.renderKatalogSearchResults(), 500);
        } catch (err) {
          alert("XLSX faylni o'qishda xato: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV/TXT fayl
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        let imported = 0;
        let errors = 0;

        for (const line of lines) {
          const parts = line.split(';').map(p => p.trim());
          if (parts.length >= 1 && parts[0]) {
            const nom = parts[0];
            const olv = parts[1] || '';

            const res = await API.post('/api/settings/products', { nom, olv });
            if (res.ok) imported++;
            else errors++;
          }
        }

        alert(`Import tugadi! ${imported} ta mahsulot qo'shildi, ${errors} ta xato.`);
        document.getElementById('katalog-import-form').style.display = 'none';
        fileInput.value = '';
        App.loadData();
        setTimeout(() => this.renderKatalogSearchResults(), 500);
      };
      reader.readAsText(file);
    }
  },

  // ===== FIRMALAR =====
  renderFirmalarSearchResults() {
    const list = document.getElementById('settings-firmalar-list');
    const q = document.getElementById('firma-search').value.toLowerCase().trim();
    if (!q) {
      list.innerHTML = '<div class="empty-state-text" style="font-size:12px;text-align:center;color:var(--text-muted)">Qidirish uchun matn kiriting...</div>';
      return;
    }
    const firms = App.data.firms || [];
    const results = firms.filter(f => (f.name || '').toLowerCase().includes(q)).slice(0, 50);

    if (!results.length) {
      list.innerHTML = '<div class="empty-state-text" style="font-size:12px;text-align:center;color:var(--text-muted)">Topilmadi</div>';
      return;
    }

    list.innerHTML = results.map(f => `
      <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(30,41,59,0.5);padding:10px 14px;border-radius:var(--radius-sm);">
        <div>
           <div style="font-weight:500; font-size:13px">${f.name || '—'}</div>
           <div style="font-size:11px; color:var(--text-muted)">${f.phone || '—'} ${f.inn ? '| INN: ' + f.inn : ''}</div>
        </div>
        <div style="display:flex;gap:4px">
           <button class="btn btn-sm btn-outline" style="padding:4px 8px;font-size:10px;" onclick="Settings.editFirmaItem('${(f.name||'').replace(/'/g,"\\'")}', '${(f.phone||'').replace(/'/g,"\\'")}', '${(f.address||'').replace(/'/g,"\\'")}', '${(f.inn||'').replace(/'/g,"\\'")}')">✏️</button>
           <button class="btn btn-sm btn-outline" style="padding:4px 8px;font-size:10px;color:var(--red);border-color:var(--red)" onclick="Settings.deleteFirmaItem('${(f.name||'').replace(/'/g,"\\'")}')">🗑️</button>
        </div>
      </div>
    `).join('');
  },

  showAddFirma() {
    document.getElementById('frm-form-old-nom').value = '';
    document.getElementById('frm-form-nom').value = '';
    document.getElementById('frm-form-phone').value = '';
    document.getElementById('frm-form-address').value = '';
    document.getElementById('frm-form-inn').value = '';
    document.getElementById('firma-form-title').innerText = "Firma qo'shish";
    document.getElementById('firma-edit-form').style.display = 'block';
  },

  editFirmaItem(name, phone, address, inn) {
    document.getElementById('frm-form-old-nom').value = name;
    document.getElementById('frm-form-nom').value = name;
    document.getElementById('frm-form-phone').value = phone || '';
    document.getElementById('frm-form-address').value = address || '';
    document.getElementById('frm-form-inn').value = inn || '';
    document.getElementById('firma-form-title').innerText = "Firmani tahrirlash";
    document.getElementById('firma-edit-form').style.display = 'block';
  },

  async saveFirmaItem() {
    const oldName = document.getElementById('frm-form-old-nom').value.trim();
    const name = document.getElementById('frm-form-nom').value.trim();
    const phone = document.getElementById('frm-form-phone').value.trim();
    const address = document.getElementById('frm-form-address').value.trim();
    const inn = document.getElementById('frm-form-inn').value.trim();

    if (!name) { alert("Firma nomi kiritilishi shart!"); return; }

    const res = await API.post('/api/settings/firms', { name, phone, address, inn, oldName });
    if (res.ok) {
       document.getElementById('firma-edit-form').style.display = 'none';
       App.loadData();
       setTimeout(() => this.renderFirmalarSearchResults(), 500);
    } else {
       alert("Xato: " + (res.error || "Ulanishda xato"));
    }
  },

  async deleteFirmaItem(name) {
    if (!confirm(`Haqiqatan ham "${name}" ni firmalardan o'chirmoqchimisiz?`)) return;

    const res = await API.deleteFirm(name);
    if (res.ok) {
       App.loadData();
       setTimeout(() => this.renderFirmalarSearchResults(), 500);
    } else {
       alert("Xato: " + (res.error || "Ulanishda xato"));
    }
  },

  showImportFirma() {
    document.getElementById('firma-import-form').style.display = 'block';
    document.getElementById('firma-edit-form').style.display = 'none';
  },

  async importFirmalar() {
    const fileInput = document.getElementById('frm-import-file');
    if (!fileInput.files.length) { alert("Fayl tanlang!"); return; }

    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      // XLS/XLSX fayl
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          let imported = 0, errors = 0;

          // Skip header row (first row)
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || !row[0]) continue;
            const name = String(row[0] || '').trim();
            if (!name) continue;

            const phone = String(row[1] || '').trim();
            const address = String(row[2] || '').trim();
            const inn = String(row[3] || '').trim();

            const res = await API.post('/api/settings/firms', { name, phone, address, inn });
            if (res.ok) imported++;
            else errors++;
          }

          alert(`Import tugadi! ${imported} ta firma qo'shildi, ${errors} ta xato.`);
          document.getElementById('firma-import-form').style.display = 'none';
          fileInput.value = '';
          App.loadData();
          setTimeout(() => this.renderFirmalarSearchResults(), 500);
        } catch (err) {
          alert("XLSX faylni o'qishda xato: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV/TXT fayl
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        let imported = 0;
        let errors = 0;

        for (const line of lines) {
          const parts = line.split(';').map(p => p.trim());
          if (parts.length >= 1 && parts[0]) {
            const name = parts[0];
            const phone = parts[1] || '';
            const address = parts[2] || '';
            const inn = parts[3] || '';

            const res = await API.post('/api/settings/firms', { name, phone, address, inn });
            if (res.ok) imported++;
            else errors++;
          }
        }

        alert(`Import yakunlandi: ${imported} ta qo'shildi${errors ? ', ' + errors + ' ta xato' : ''}`);
        App.loadData();
        setTimeout(() => this.renderFirmalarSearchResults(), 500);
        document.getElementById('firma-import-form').style.display = 'none';
      };
      reader.readAsText(file);
    }
  },

  // ===== MIN QOLDIQ =====
  renderMinStock() {
    const list = document.getElementById('min-stock-list');
    if (!list) return;
    const minStock = App.data.minStock || {};
    const q = Utils.computeQoldiq(App.data.jurnal || []);
    const products = Object.keys(q);

    list.innerHTML = products.length ? products.map(nom => {
      const limit = minStock[nom] || 5;
      const current = q[nom]?.qoldiq || 0;
      const isLow = current <= limit;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;background:${isLow?'rgba(239,68,68,0.1)':'rgba(30,41,59,0.5)'};padding:10px 14px;border-radius:var(--radius-sm);border:1px solid ${isLow?'rgba(239,68,68,0.3)':'transparent'}">
          <div>
            <span style="font-weight:500">${nom}</span>
            <span style="font-size:11px;color:${isLow?'var(--red)':'var(--text-muted)'};margin-left:8px">Qoldiq: ${Utils.formatNumber(current)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;color:var(--text-muted)">Min:</span>
            <input type="number" value="${limit}" style="width:60px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:12px;outline:none"
              onchange="Settings.setMinStock('${nom.replace(/'/g,"\\'")}', this.value)">
          </div>
        </div>`;
    }).join('') : '<div style="color:var(--text-muted);text-align:center;padding:16px">Mahsulotlar yo\'q</div>';
  },

  async setMinStock(productName, minQty) {
    await API.post('/api/settings/min-stock', { productName, minQty: Number(minQty) });
    App.data.minStock[productName] = Number(minQty);
  }
};
