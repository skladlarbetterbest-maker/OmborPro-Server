/**
 * KirimChiqim — Kirim/Chiqim formasi va side qoldiq
 */
const KirimChiqim = {
  rowId: 0,
  sideSortField: 'name',
  sideSortDir: 'asc',

  init() {
    const today = Utils.today();
    document.getElementById('k-sana').value = today;
    document.getElementById('c-sana').value = today;
    if (document.getElementById('kirim-rows').children.length === 0) this.addRow('kirim');
    if (document.getElementById('chiqim-rows').children.length === 0) this.addRow('chiqim');
    App.populateObyektFilters();
    this.renderSideQoldiq();
  },

  switchKC(tur) {
    document.getElementById('kc-form-kirim').style.display = tur==='kirim'?'block':'none';
    document.getElementById('kc-form-chiqim').style.display = tur==='chiqim'?'block':'none';
    document.getElementById('kc-title').innerHTML = tur==='kirim' 
      ? '📥 ' + App.t('kirim') + ' (' + App.t('prixod') + ')' 
      : '📤 ' + App.t('chiqim') + ' (' + App.t('chiqimCap') + ')';
    document.getElementById('btn-toggle-kirim').className = tur==='kirim'?'btn btn-sm btn-green':'btn btn-sm btn-outline';
    document.getElementById('btn-toggle-chiqim').className = tur==='chiqim'?'btn btn-sm btn-red':'btn btn-sm btn-outline';
    if (tur === 'kirim') {
      document.getElementById('btn-toggle-kirim').textContent = App.t('kirimCap');
      document.getElementById('btn-toggle-chiqim').textContent = App.t('chiqimCap');
    } else {
      document.getElementById('btn-toggle-kirim').textContent = App.t('kirimCap');
      document.getElementById('btn-toggle-chiqim').textContent = App.t('chiqimCap');
    }
    this.renderSideQoldiq();
  },

  addRow(type) {
    const container = document.getElementById(type + '-rows');
    const rid = 'row-' + (++this.rowId);
    const div = document.createElement('div');
    div.className = 'dynamic-row';
    div.id = rid;
    div.innerHTML = `
      <div style="position:relative" class="prod-col">
        <div class="f-label">${App.t('mahsulot')}</div>
        <input class="f-input prod-name" placeholder="${App.t('qidirish')}" autocomplete="off" oninput="KirimChiqim.filterProducts(this,'${rid}')" onfocus="KirimChiqim.filterProducts(this,'${rid}')" onblur="setTimeout(()=>KirimChiqim.hideDropdown('${rid}'),200)">
        <div class="autocomplete-dropdown" id="dropdown-${rid}"></div>
      </div>
      <div><div class="f-label">${App.t('olchov')}</div><input class="f-input prod-unit" readonly style="background:rgba(31,41,55,0.4)"></div>
      <div><div class="f-label">${App.t('miqdor')}</div><input class="f-input prod-qty" placeholder="0" oninput="this.value=Utils.formatInputNumber(this.value);KirimChiqim.calcRowSum('${rid}','${type}')"></div>
      <div><div class="f-label">${App.t('narx')}</div><input class="f-input prod-price" placeholder="0" oninput="this.value=Utils.formatInputNumber(this.value);KirimChiqim.calcRowSum('${rid}','${type}')"></div>
      <div><div class="f-label">${App.t('summa')}</div><input class="f-input prod-sum" placeholder="0" readonly style="background:rgba(31,41,55,0.4);color:var(--text)"></div>
      <div><div class="f-label">&nbsp;</div><button class="btn btn-red btn-sm" onclick="KirimChiqim.removeRow('${rid}','${type}')" style="padding:10px 12px;font-size:14px">✕</button></div>
    `;
    container.appendChild(div);
  },

  removeRow(rid, type) {
    document.getElementById(rid)?.remove();
    this.calcTotal(type);
  },

  filterProducts(input, rid) {
    const query = input.value.toLowerCase().trim();
    const dropdown = document.getElementById('dropdown-' + rid);
    if (query.length < 1) { dropdown.style.display = 'none'; return; }
    const words = query.split(' ');
    const results = (App.data.katalog || []).filter(item => words.every(w => item.nom.toLowerCase().includes(w))).slice(0,15);
    
    let html = '';
    if (results.length === 0) {
      html = `<div class="autocomplete-item" style="color:var(--accent)" onmousedown="KirimChiqim.promptNewProduct('${rid}', '${query}')">➕ ${App.t('yangiMahsulot') || 'Yangi mahsulot qo\'shish'}</div>`;
    } else {
      html = results.map(item => `<div class="autocomplete-item" onmousedown="KirimChiqim.selectProduct('${rid}','${item.nom}','${item.olv || ''}')">${item.nom} <span style="font-size:10px;color:var(--text-muted);float:right">${item.olv||''}</span></div>`).join('');
      html += `<div class="autocomplete-item" style="color:var(--accent); border-top:1px solid var(--border); margin-top:4px; padding-top:8px" onmousedown="KirimChiqim.promptNewProduct('${rid}', '${query}')">➕ ${App.t('qoshish')}</div>`;
    }
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';

    // Qatorlarni z-index orqali tartiblash (orqadagilarning ustiga chiqishi uchun)
    document.querySelectorAll('.dynamic-row').forEach(row => {
      row.style.zIndex = row.id === rid ? '999' : '1';
      row.style.position = 'relative';
    });
  },

  async promptNewProduct(rid, defaultName) {
    const nom = prompt("Yangi mahsulot nomi:", defaultName);
    if (!nom) return;
    const olv = prompt("O'lchov birligi (dona, kg, metr, qop...):", "dona");
    if (olv === null) return;
    
    // Frontedda kataloga qo'shib qo'yamiz va tanlaymiz
    const newPrd = { nom, olv };
    if (!App.data.katalog) App.data.katalog = [];
    App.data.katalog.push(newPrd);
    
    await API.post('/api/settings/products', { nom, olv }); // Orqaga yozish uchun backend endpoint kerak emas aslida, jurnal bulkda upsert bo'lib ketadi, lekin zaxira uchun
    
    this.selectProduct(rid, nom, olv);
  },

  hideDropdown(rid) { const d = document.getElementById('dropdown-'+rid); if(d) d.style.display='none'; },

  selectProduct(rid, nom, olv) {
    if (rid === 'trf') {
      const input = document.getElementById('trf-product');
      if (input) input.value = nom;
      this.hideDropdown(rid);
      return;
    }
    const row = document.getElementById(rid);
    if (!row) return;
    row.querySelector('.prod-name').value = nom;
    row.querySelector('.prod-unit').value = olv || '';
    this.hideDropdown(rid);
  },

  calcRowSum(rid, type) {
    const row = document.getElementById(rid);
    if (!row) return;
    const qty = parseFloat(row.querySelector('.prod-qty').value.replace(/\./g,'')) || 0;
    const price = parseFloat(row.querySelector('.prod-price').value.replace(/\./g,'')) || 0;
    const sum = qty * price;
    row.querySelector('.prod-sum').value = sum > 0 ? Utils.formatNumber(sum) : '';
    this.calcTotal(type);
  },

  calcTotal(type) {
    const container = document.getElementById(type + '-rows');
    let total = 0;
    container.querySelectorAll('.dynamic-row').forEach(row => {
      total += parseFloat(row.querySelector('.prod-sum').value.replace(/\./g,'')) || 0;
    });
    document.getElementById((type==='kirim'?'k':'c') + '-jami-summa').textContent = Utils.formatNumber(total);
  },

  async saveNewFirm() {
    const name = document.getElementById('knf-nom').value.trim();
    if (!name) return Utils.showMsg('k-msg', 'Firma nomi kiritilishi shart!', 'err');
    const phone = document.getElementById('knf-phone').value.trim();
    const address = document.getElementById('knf-address').value.trim();
    const inn = document.getElementById('knf-inn').value.trim();
    const res = await API.post('/api/settings/firms', { name, phone, address, inn });
    if (res.ok) {
       document.getElementById('kirim-new-firm-form').style.display = 'none';
       document.getElementById('k-yetkazuvchi').value = name;
       App.loadData();
    } else Utils.showMsg('k-msg', res.error || 'Xato!', 'err');
  },

  async submitKirim() {
    const yetkazuvchi = document.getElementById('k-yetkazuvchi').value.trim();
    if (yetkazuvchi) {
      const firmExists = (App.data.firms || []).find(f => f.name.toLowerCase() === yetkazuvchi.toLowerCase());
      if (!firmExists) return Utils.showMsg('k-msg', `Firma (${yetkazuvchi}) ro'yxatda yo'q! Oldin ➕ orqali qo'shing.`, 'err');
    }

    const izoh = document.getElementById('k-izoh').value.trim();
    const kObyekt = document.getElementById('k-obyekt').value || 'Barchasi';
    const kSana = document.getElementById('k-sana').value.trim() || Utils.today();
    const rows = document.getElementById('kirim-rows').querySelectorAll('.dynamic-row');
    const records = [];
    const katalog = App.data.katalog || [];
    let invalidProduct = null;

    rows.forEach(r => {
      const mahsulot = r.querySelector('.prod-name').value.trim();
      const miqdor = parseFloat(r.querySelector('.prod-qty').value.replace(/\./g,'')) || 0;
      const narx = parseFloat(r.querySelector('.prod-price').value.replace(/\./g,'')) || 0;
      
      if (mahsulot) {
        const prodExists = katalog.find(k => k.nom.toLowerCase() === mahsulot.toLowerCase());
        if (!prodExists) invalidProduct = mahsulot;
      }

      if (mahsulot && miqdor > 0 && !invalidProduct) {
        records.push({ tur:'Kirim', mahsulot, miqdor, narx, summa: miqdor*narx, tomon: yetkazuvchi, obyekt: kObyekt, izoh, sana: kSana });
      }
    });

    if (invalidProduct) return Utils.showMsg('k-msg', `Mahsulot (${invalidProduct}) bazada yo'q! Oldin ➕ tugmasi orqali katalogga qo'shing.`, 'err');
    if (records.length === 0) { Utils.showMsg('k-msg', 'Kamida bitta mahsulot kiriting!', 'err'); return; }

    const res = await API.addJournalBulk(records);
    if (res.ok) {
      Utils.showMsg('k-msg', res.count + ' ta mahsulot qo\'shildi! ✅', 'ok');
      document.getElementById('k-yetkazuvchi').value = '';
      document.getElementById('k-izoh').value = '';
      document.getElementById('kirim-rows').innerHTML = '';
      this.addRow('kirim');
      this.calcTotal('kirim');
      App.loadData();
    } else {
      Utils.showMsg('k-msg', res.error || 'Xato!', 'err');
    }
  },

  async submitChiqim() {
    const oluvchi = document.getElementById('c-oluvchi').value.trim();
    const izoh = document.getElementById('c-izoh').value.trim();
    const cSana = document.getElementById('c-sana').value.trim() || Utils.today();
    const rows = document.getElementById('chiqim-rows').querySelectorAll('.dynamic-row');
    const records = [];
    const katalog = App.data.katalog || [];
    let invalidProduct = null;

    rows.forEach(r => {
      const mahsulot = r.querySelector('.prod-name').value.trim();
      const miqdor = parseFloat(r.querySelector('.prod-qty').value.replace(/\./g,'')) || 0;
      const narx = parseFloat(r.querySelector('.prod-price').value.replace(/\./g,'')) || 0;
      
      if (mahsulot) {
        const prodExists = katalog.find(k => k.nom.toLowerCase() === mahsulot.toLowerCase());
        if (!prodExists) invalidProduct = mahsulot;
      }

      if (mahsulot && miqdor > 0 && !invalidProduct) {
        records.push({ tur:'Chiqim', mahsulot, miqdor, narx, summa: miqdor*narx, tomon: oluvchi, obyekt: oluvchi, izoh, sana: cSana });
      }
    });

    if (invalidProduct) return Utils.showMsg('c-msg', `Mahsulot (${invalidProduct}) bazada yo'q! Dastlab katalogga qo'shish kerak.`, 'err');
    if (records.length === 0) { Utils.showMsg('c-msg', 'Kamida bitta mahsulot kiriting!', 'err'); return; }

    const res = await API.addJournalBulk(records);
    if (res.ok) {
      Utils.showMsg('c-msg', res.count + ' ta mahsulot qo\'shildi! ✅', 'ok');
      document.getElementById('c-izoh').value = '';
      document.getElementById('chiqim-rows').innerHTML = '';
      this.addRow('chiqim');
      this.calcTotal('chiqim');
      App.loadData();
    } else {
      Utils.showMsg('c-msg', res.error || 'Xato!', 'err');
    }
  },

  renderSideQoldiq() {
    const kirimForm = document.getElementById('kc-form-kirim');
    let obyekt;
    if (kirimForm && kirimForm.style.display !== 'none') {
      obyekt = document.getElementById('k-obyekt')?.value || 'Barchasi';
    } else {
      obyekt = document.getElementById('c-oluvchi')?.value || 'Barchasi';
    }
    const qoldiq = Utils.computeQoldiq(App.data.jurnal, obyekt);
    const list = document.getElementById('side-qoldiq-list');
    const search = (document.getElementById('qoldiq-search')?.value || '').toLowerCase();
    let items = Object.entries(qoldiq).filter(([nom]) => nom.toLowerCase().includes(search));

    items.sort((a,b) => {
      if (this.sideSortField === 'name') return this.sideSortDir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
      return this.sideSortDir === 'asc' ? a[1].qoldiq - b[1].qoldiq : b[1].qoldiq - a[1].qoldiq;
    });

    if (!items.length) { list.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:10px">${App.t('yozuvlarYoq')} (${obyekt})</div>`; return; }
    list.innerHTML = `<div style="font-size:10px;color:var(--text-muted);padding:4px 8px;margin-bottom:8px;border-bottom:1px solid var(--border)">${App.t('obyekt')}: ${obyekt}</div>` +
      items.map(([nom,st]) => `
        <div class="qoldiq-side-item" ondblclick="KirimChiqim.addToChiqim('${Utils.escapeHtml(nom)}')">
          <div class="q-name">${nom}</div>
          <div class="q-qty" style="color:${st.qoldiq>0?'var(--green)':'var(--red)'}">${Utils.formatNumber(st.qoldiq)}</div>
        </div>
      `).join('');
  },

  sortSide(field) {
    if (this.sideSortField === field) this.sideSortDir = this.sideSortDir === 'asc' ? 'desc' : 'asc';
    else { this.sideSortField = field; this.sideSortDir = 'asc'; }
    document.getElementById('sort-qoldiq-name').textContent = field === 'name' ? (this.sideSortDir === 'asc' ? 'A-Z ↓' : 'Z-A ↓') : 'A-Z';
    document.getElementById('sort-qoldiq-qoldiq').textContent = field === 'qoldiq' ? (this.sideSortDir === 'asc' ? App.t('qoldiq') + ' ↓' : App.t('qoldiq') + ' ↑') : App.t('qoldiq');
    this.renderSideQoldiq();
  },

  addToChiqim(nom) {
    this.switchKC('chiqim');
    const container = document.getElementById('chiqim-rows');
    let rows = Array.from(container.querySelectorAll('.dynamic-row'));
    let target = rows.find(r => r.querySelector('.prod-name').value.trim() === '');
    if (!target) { this.addRow('chiqim'); rows = Array.from(container.querySelectorAll('.dynamic-row')); target = rows[rows.length-1]; }
    const cat = (App.data.katalog || []).find(x => x.nom === nom);
    target.querySelector('.prod-name').value = nom;
    if (cat) target.querySelector('.prod-unit').value = cat.olv || '';
    target.style.outline = '2px solid var(--accent)';
    setTimeout(() => target.style.outline = 'none', 500);
  }
};
