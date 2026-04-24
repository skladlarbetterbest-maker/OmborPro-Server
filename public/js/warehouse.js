/**
 * Warehouse — Transfer va Inventarizatsiya (Skladchi)
 */
const Warehouse = {
  // ─── TRANSFER ───────────────────────────────────────────────────────────
  async doTransfer() {
    const fromObyekt = document.getElementById('trf-from').value;
    const toObyekt   = document.getElementById('trf-to').value;
    const mahsulot   = document.getElementById('trf-product').value.trim();
    const miqdor     = document.getElementById('trf-qty').value;
    const izoh       = document.getElementById('trf-note').value.trim();

    if (!fromObyekt || !toObyekt || !mahsulot || !miqdor) {
      Utils.showMsg('trf-msg', 'Barcha maydonlarni to\'ldiring!', 'err'); return;
    }
    if (fromObyekt === toObyekt) {
      Utils.showMsg('trf-msg', 'Qayerdan va qayerga bir xil bo\'lmasligi kerak!', 'err'); return;
    }

    const q = Utils.computeQoldiq(App.data.jurnal || [], fromObyekt);
    const mahsulotQoldiq = q[mahsulot]?.qoldiq || 0;
    const requestedQty   = Number(miqdor);

    if (mahsulotQoldiq < requestedQty) {
      Utils.showMsg('trf-msg', `❌ "${mahsulot}" dan faqat ${mahsulotQoldiq} ta mavjud. Siz ${requestedQty} ta so'radingiz.`, 'err');
      return;
    }

    const res = await API.doTransfer({ fromObyekt, toObyekt, mahsulot, miqdor: Number(miqdor), izoh });
    if (res.ok) {
      Utils.showMsg('trf-msg', '✅ Transfer muvaffaqiyatli!', 'ok');
      document.getElementById('trf-product').value = '';
      document.getElementById('trf-qty').value     = '';
      document.getElementById('trf-note').value    = '';
      App.loadData();
      this.renderTransfers();
      this.renderTransferQoldiq();
    } else {
      Utils.showMsg('trf-msg', '❌ ' + (res.error || 'Xato yuz berdi!'), 'err');
    }
  },

  transferSideSortRule: 'name',
  sortTransferSide(type) {
    this.transferSideSortRule = type;
    this.renderTransferQoldiq();
  },

  renderTransferQoldiq() {
    const list = document.getElementById('trf-side-qoldiq-list');
    if (!list) return;

    const fromObyekt = document.getElementById('trf-from')?.value || 'Barchasi';
    const q    = Utils.computeQoldiq(App.data.jurnal || [], fromObyekt);
    const qStr = (document.getElementById('trf-qoldiq-search')?.value || '').toLowerCase();

    let items = Object.entries(q)
      .map(([nom, data]) => ({ nom, ...data }))
      .filter(i => i.qoldiq > 0);

    if (qStr) items = items.filter(i => i.nom.toLowerCase().includes(qStr));

    if (this.transferSideSortRule === 'name') items.sort((a, b) => a.nom.localeCompare(b.nom));
    else if (this.transferSideSortRule === 'qoldiq') items.sort((a, b) => b.qoldiq - a.qoldiq);

    if (!items.length) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:12px;text-align:center">Qoldiq yo\'q</div>';
      return;
    }

    list.innerHTML = items.map(i => `
      <div class="qoldiq-side-item" ondblclick="Warehouse.addToTransfer('${i.nom.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')">
        <div class="q-name">${i.nom}</div>
        <div class="q-qty" style="color:${i.qoldiq > 0 ? 'var(--green)' : 'var(--red)'}">${Utils.formatNumber(i.qoldiq)}</div>
      </div>
    `).join('');
  },

  addToTransfer(nom) {
    document.getElementById('trf-product').value = nom;
    document.getElementById('trf-qty').focus();
  },

  renderTransfers() {
    const transfers = App.data.transfers || [];
    document.getElementById('transfer-rows').innerHTML = transfers.length
      ? [...transfers].reverse().map(t => `
        <tr>
          <td class="mono" style="font-size:11px">${t.sana || '—'}</td>
          <td>${t.fromObyekt || '—'}</td>
          <td>${t.toObyekt || '—'}</td>
          <td style="font-weight:500">${t.mahsulot || '—'}</td>
          <td class="mono">${Utils.formatNumber(t.miqdor)}</td>
          <td style="font-size:11px;color:var(--text-secondary)">${t.operator || '—'}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Transfer tarixi bo\'sh</div></td></tr>';
  },

  // ─── INVENTARIZATSIYA ────────────────────────────────────────────────────
  _invData: [], // joriy inventar mahsulotlar (filter uchun)

  loadInventarItems() {
    const obyekt = document.getElementById('inv-obyekt')?.value || 'Barchasi';
    const q = Utils.computeQoldiq(App.data.jurnal || [], obyekt);
    this._invData = Object.entries(q).map(([nom, data]) => ({ nom, ...data }));

    this.renderInventarItems();
    this.renderInventarHistory();
    this.initResizeHandle();
  },

  filterInventarItems() {
    this.renderInventarItems();
  },

  renderInventarItems() {
    const container = document.getElementById('inventar-items');
    const search = (document.getElementById('inv-search')?.value || '').toLowerCase().trim();
    const obyekt = document.getElementById('inv-obyekt')?.value || 'Barchasi';
    const q = Utils.computeQoldiq(App.data.jurnal || [], obyekt);

    let products = this._invData;
    if (search) products = products.filter(p => p.nom.toLowerCase().includes(search));

    if (!products.length) {
      container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:32px">Mahsulotlar yo\'q</div>';
      return;
    }

    container.innerHTML = products.map((item, i) => `
      <div style="display:grid; grid-template-columns:2fr 80px 90px 60px; gap:10px; align-items:center;
                  padding:10px 12px; margin-bottom:6px; background:var(--bg-secondary);
                  border-radius:8px; border:1px solid var(--border); transition:border-color 0.2s;"
           class="inv-row">
        <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
             title="${item.nom}">${item.nom}</div>
        <div style="text-align:center">
          <div style="font-size:9px;color:var(--text-muted);margin-bottom:2px">Tizimda</div>
          <div class="mono" style="font-size:13px;color:var(--accent)">${Utils.formatNumber(item.qoldiq)}</div>
        </div>
        <div>
          <input type="number" class="f-input inv-actual" data-product="${item.nom}"
                 data-tizimda="${item.qoldiq}" value="${item.qoldiq}" min="0"
                 style="margin-bottom:0;padding:7px 8px;text-align:center;font-size:13px;"
                 oninput="Warehouse._updateDiff(this)">
        </div>
        <div class="inv-diff-cell" style="text-align:center;font-weight:700;font-size:14px;color:var(--text-muted)">±0</div>
      </div>
    `).join('');

    // Reset diff displays
    container.querySelectorAll('.inv-actual').forEach(input => {
      this._updateDiff(input);
    });
  },

  _updateDiff(input) {
    const tizimda = Number(input.dataset.tizimda) || 0;
    const haqiqiy = Number(input.value) || 0;
    const farq    = haqiqiy - tizimda;
    const row     = input.closest('.inv-row');
    const diffEl  = row?.querySelector('.inv-diff-cell');
    if (!diffEl) return;
    diffEl.textContent = farq > 0 ? '+' + farq : String(farq);
    diffEl.style.color = farq === 0 ? 'var(--text-muted)' : farq > 0 ? 'var(--green)' : 'var(--red)';
    // Highlight row
    row.style.borderColor = farq !== 0 ? (farq > 0 ? 'var(--green)' : 'var(--red)') : 'var(--border)';
  },

  renderInventarHistory() {
    const inv     = App.data.inventarizatsiya || [];
    const isAdmin = App.getUserRole() === 'admin';

    document.getElementById('inventar-rows').innerHTML = inv.length
      ? [...inv].reverse().map((item, idx) => {
          const jamiSumma = (item.diffs || []).reduce((s, d) => s + (Math.abs(d.farq) * (d.narx || 0)), 0);
          const detailId = `inv-hist-detail-${idx}`;
          return `
            <tr onclick="Warehouse.toggleInvHistDetail(${idx})" style="cursor:pointer" title="Batafsil ko'rish">
              <td class="mono" style="color:var(--text-muted)">${inv.length - idx}</td>
              <td class="mono" style="font-size:11px">${item.sana || '—'}</td>
              <td style="font-weight:500">${item.obyekt || '—'}</td>
              <td class="mono" style="color:${(item.diffsCount||0)>0?'var(--orange)':'var(--green)'}">
                ${item.diffsCount || 0} ta
              </td>
              <td class="mono" style="color:${jamiSumma?'var(--accent)':'var(--text-muted)'}">
                ${jamiSumma ? Utils.formatSum(jamiSumma) : '—'}
              </td>
              <td onclick="event.stopPropagation()" style="display:flex;gap:5px;align-items:center">
                <button class="btn btn-sm btn-outline" style="font-size:10px;padding:4px 8px">Ko'rish</button>
                ${isAdmin ? `<button class="btn btn-sm btn-outline" onclick="Warehouse.deleteInventar(${idx})"
                  style="padding:4px 8px;font-size:10px;color:var(--red);border-color:var(--red-dim)">🗑️</button>` : ''}
              </td>
            </tr>
            <tr id="${detailId}" style="display:none; background:rgba(0,0,0,0.05)">
              <td colspan="6" style="padding:12px; border-left:3px solid var(--accent)">
                <div class="inv-hist-detail-content"></div>
              </td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="6" class="empty-state"><div class="empty-state-text">Inventarizatsiya tarixi bo\'sh</div></td></tr>';
  },

  toggleInvHistDetail(idx) {
    const detailRow = document.getElementById(`inv-hist-detail-${idx}`);
    if (!detailRow) return;

    if (detailRow.style.display === 'table-row') {
      detailRow.style.display = 'none';
      return;
    }

    // Close others
    document.querySelectorAll('[id^="inv-hist-detail-"]').forEach(el => el.style.display = 'none');

    const inv = (App.data.inventarizatsiya || []).slice().reverse();
    const item = inv[idx];
    if (!item) return;

    const container = detailRow.querySelector('.inv-hist-detail-content');
    const diffs = item.diffs || [];

    if (!diffs.length) {
      container.innerHTML = '<div style="color:var(--green);font-size:12px">✅ Farqlar yo\'q!</div>';
    } else {
      container.innerHTML = diffs.map((d, i) => `
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span>${i+1}. ${d.mahsulot}</span>
          <span style="color:${d.farq>0?'var(--green)':'var(--red)'}">
            ${d.farq>0?'+':''}${d.farq} ta × ${(d.narx||0).toLocaleString()} = ${(Math.abs(d.farq)*(d.narx||0)).toLocaleString()} so'm
          </span>
        </div>
      `).join('');

      const total = diffs.reduce((s, d) => s + (Math.abs(d.farq) * (d.narx || 0)), 0);
      container.innerHTML += `
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:5px;font-weight:700;font-size:12px;color:var(--accent)">
          <span>JAMI FARQ SUMMA:</span>
          <span>${total.toLocaleString()} so'm</span>
        </div>
      `;
    }

    detailRow.style.display = 'table-row';
  },

  toggleInvLinkDetail(idx) {
    const detailRow = document.getElementById(`inv-link-detail-${idx}`);
    if (!detailRow) return;

    if (detailRow.style.display === 'table-row') {
      detailRow.style.display = 'none';
      return;
    }

    // Close others
    document.querySelectorAll('[id^="inv-link-detail-"]').forEach(el => el.style.display = 'none');

    const links = (App.data.invLinks || []).slice().reverse();
    const item = links[idx];
    if (!item) return;

    const container = detailRow.querySelector('.inv-link-detail-content');
    const diffs = item.diffs || [];

    container.innerHTML = diffs.map((d, i) => `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span>${i+1}. ${d.mahsulot}</span>
        <span style="color:${d.farq>0?'var(--green)':'var(--red)'}">
          ${d.farq>0?'+':''}${d.farq} ta × ${(d.narx||0).toLocaleString()} = ${(Math.abs(d.farq)*(d.narx||0)).toLocaleString()} so'm
        </span>
      </div>
    `).join('');

    const total = diffs.reduce((s, d) => s + (Math.abs(d.farq) * (d.narx || 0)), 0);
    container.innerHTML += `
      <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:5px;font-weight:700;font-size:12px;color:var(--accent)">
        <span>JAMI FARQ SUMMA:</span>
        <span>${total.toLocaleString()} so'm</span>
      </div>
    `;

    detailRow.style.display = 'table-row';
  },

  createLinkDetailSection() {
    const card = document.querySelector('#tab-inventar .card');
    const section = document.createElement('div');
    section.id = 'inv-link-detail-section';
    section.style.cssText = 'display:none;margin-top:16px;padding:16px;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--accent);';
    section.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-weight:600;color:var(--accent);">📋 Farqlar ro'yxati</div>
        <button onclick="Warehouse.closeLinkDetail()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;">✕</button>
      </div>
      <div id="inv-link-detail-items"></div>
    `;
    card.appendChild(section);
    return section;
  },

  closeLinkDetail() {
    const section = document.getElementById('inv-link-detail-section');
    if (section) section.style.display = 'none';
  },

  closeInvDetail() {
    document.getElementById('inv-detail-section').style.display = 'none';
  },

  async submitInventar() {
    const obyekt = document.getElementById('inv-obyekt')?.value || 'Barchasi';
    const q      = Utils.computeQoldiq(App.data.jurnal || [], obyekt);
    const items  = [];

    document.querySelectorAll('.inv-actual').forEach(input => {
      items.push({ mahsulot: input.dataset.product, haqiqiy: Number(input.value) || 0, tizimda: q[input.dataset.product]?.qoldiq || 0 });
    });

    if (!items.length) { Utils.showMsg('inv-msg', 'Mahsulotlar yo\'q!', 'err'); return; }

    const res = await API.submitInventar({ obyekt, items });
    if (res.ok) {
      Utils.showMsg('inv-msg', 'Inventarizatsiya saqlandi! ✅', 'ok');
      App.loadData();
    } else {
      Utils.showMsg('inv-msg', res.error || 'Xato!', 'err');
    }
  },

  // ─── MOBILE LINK ─────────────────────────────────────────────────────────
  async createMobileLink() {
    const obyekt = document.getElementById('inv-obyekt')?.value;
    if (!obyekt || obyekt === 'Barchasi') {
      Utils.showMsg('inv-msg', 'Aniq obyekt tanlang!', 'err'); return;
    }

    const res = await API.createMobileInventarLink(obyekt);
    if (res.ok) {
      const section = document.getElementById('inv-mobile-link-section');
      section.style.display = 'block';
      document.getElementById('inv-mobile-link').value = res.link;
      section.dataset.token = res.token;
      document.getElementById('inv-link-status').textContent = '⏳ Kutilmoqda...';
      Utils.showMsg('inv-msg', 'Link yaratildi! 📋', 'ok');
      this.loadInvLinks();
    } else {
      Utils.showMsg('inv-msg', res.error || 'Xato!', 'err');
    }
  },

  copyMobileLink() {
    const input = document.getElementById('inv-mobile-link');
    input.select();
    document.execCommand('copy');
    Utils.showMsg('inv-msg', 'Nusxalandi! ✅', 'ok');
  },

  cancelLink() {
    const section = document.getElementById('inv-mobile-link-section');
    if (!section) return;
    section.style.display  = 'none';
    section.dataset.token  = '';
    document.getElementById('inv-mobile-link').value = '';
  },

  copyLink(token) {
    const link = window.location.protocol + '//' + window.location.host + '/api/warehouse/mobile/inventar/' + token;
    navigator.clipboard.writeText(link).then(() => Utils.showMsg('inv-msg', 'Link nusxalandi! ✅', 'ok'));
  },

  async cancelLinkById(id) {
    if (!confirm('Linkni bekor qilishni tasdiqlaysizmi?')) return;
    try {
      const res = await API.post('/api/warehouse/inv-links/cancel', { id });
      if (res.ok) {
        Utils.showMsg('inv-msg', 'Link bekor qilindi', 'ok');
        this.loadInvLinks();
      }
    } catch (e) {
      Utils.showMsg('inv-msg', 'Xato: ' + e.message, 'err');
    }
  },

  async loadInvLinks() {
    try {
      const res   = await API.get('/api/warehouse/inv-links');
      const links = res.data || [];
      App.data.invLinks = links;
      const tbody = document.getElementById('inv-links-rows');

      if (!links.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-text">Linklar yo\'q</div></td></tr>';
        return;
      }

      tbody.innerHTML = [...links].reverse().map((l, i) => {
        const rowId = `inv-link-row-${i}`;
        const detailId = `inv-link-detail-${i}`;
        const hasDiffs = (l.diffs?.length || 0) > 0;
        
        return `
          <tr id="${rowId}">
            <td class="mono" style="font-size:11px">${l.sana || '—'}<br><span style="color:var(--text-secondary)">${l.vaqt || ''}</span></td>
            <td style="font-weight:500">${l.obyekt || '—'}</td>
            <td>
              ${l.status === 'yakunlandi'
                ? '<span style="color:var(--green);font-weight:600">✅</span>'
                : l.status === 'bekor'
                  ? '<span style="color:var(--red)">❌</span>'
                  : '<span style="color:var(--orange)">⏳</span>'}
            </td>
            <td class="mono" style="color:${hasDiffs ? 'var(--accent)' : 'var(--text-muted)'}">${l.diffs?.length || 0}</td>
            <td>
              ${l.status === 'jarayonda' ? `
                <button class="btn btn-sm btn-outline" onclick="Warehouse.copyLink('${l.token}')" title="Nusxala">📋</button>
                <button class="btn btn-sm btn-outline" onclick="Warehouse.cancelLinkById('${l.id}')" title="Bekor" style="color:var(--red)">✕</button>
              ` : l.status === 'yakunlandi' && hasDiffs ? `
                <button class="btn btn-sm btn-outline" onclick="Warehouse.toggleInvLinkDetail(${i})" style="font-size:10px;padding:4px 8px">Ko'rish</button>
              ` : '<span style="color:var(--text-muted);font-size:11px">—</span>'}
            </td>
          </tr>
          <tr id="${detailId}" style="display:none; background:rgba(0,0,0,0.05)">
            <td colspan="5" style="padding:12px; border-left:3px solid var(--accent)">
              <div class="inv-link-detail-content"></div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error('Linklarni yuklashda xato:', e);
    }
  },

  async refreshLinksStatus() {
    await this.loadInvLinks();
    const section  = document.getElementById('inv-mobile-link-section');
    const statusEl = document.getElementById('inv-link-status');
    if (section && section.style.display !== 'none' && section.dataset.token) {
      const links = App.data.invLinks || [];
      const link  = links.find(l => l.token === section.dataset.token);
      if (link) {
        if (link.status === 'yakunlandi') {
          statusEl.textContent = '✅ Ishlatildi';
          statusEl.style.color = 'var(--green)';
        } else {
          statusEl.textContent = '⏳ Jarayonda...';
          statusEl.style.color = 'var(--orange)';
        }
      }
    }
  },

  historyVisible: true,
  toggleHistory() {
    const section = document.getElementById('inv-history-section');
    const btn     = document.getElementById('inv-history-toggle-btn');
    this.historyVisible = !this.historyVisible;
    section.style.display = this.historyVisible ? 'block' : 'none';
    btn.textContent       = this.historyVisible ? '▼ Yashirish' : '▶️ Ko\'rsatish';
  },

  async deleteInventar(idx) {
    if (!confirm('Bu inventarizatsiyani o\'chirishni tasdiqlaysizmi?')) return;
    const inv  = (App.data.inventarizatsiya || []).slice().reverse();
    const item = inv[idx];
    if (!item) return;

    try {
      const res = await API.deleteInventar(item.id);
      if (res.ok) {
        App.loadData();
        this.loadInventarItems();
      } else {
        alert(res.error || 'Xato!');
      }
    } catch (e) {
      alert('Xato: ' + e.message);
    }
  },

  // ─── RESIZE HANDLE ───────────────────────────────────────────────────────
  initResizeHandle() {
    const handle = document.getElementById('inventar-resize-handle');
    const leftPanel = document.querySelector('.inventar-left-panel');
    const rightPanel = document.querySelector('.inventar-right-panel');
    const container = document.querySelector('.inventar-resize-container');

    if (!handle || !leftPanel || !rightPanel || !container) return;

    let isResizing = false;
    let startX = 0;
    let startLeftWidth = 0;
    let startRightWidth = 0;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startLeftWidth = leftPanel.offsetWidth;
      startRightWidth = rightPanel.offsetWidth;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const containerWidth = container.offsetWidth;
      const gap = 12; // gap size

      let newLeftWidth = startLeftWidth + deltaX;
      let newRightWidth = startRightWidth - deltaX;

      // Minimum width constraints
      const minWidth = 300;
      if (newLeftWidth < minWidth) {
        newLeftWidth = minWidth;
        newRightWidth = containerWidth - gap - minWidth;
      }
      if (newRightWidth < minWidth) {
        newRightWidth = minWidth;
        newLeftWidth = containerWidth - gap - minWidth;
      }

      // Convert to flex ratios
      const totalWidth = newLeftWidth + newRightWidth + gap;
      const leftFlex = newLeftWidth / totalWidth;
      const rightFlex = newRightWidth / totalWidth;

      leftPanel.style.flex = leftFlex.toFixed(4);
      rightPanel.style.flex = rightFlex.toFixed(4);
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });

    // --- Right Panel Horizontal Resize Handle ---
    const handleH = document.getElementById('inv-right-resize-handle');
    const topCard = document.querySelector('.inv-top-card');
    const bottomCard = document.querySelector('.inv-bottom-card');

    if (!handleH || !topCard || !bottomCard) return;

    let isResizingH = false;
    let startY = 0;
    let startTopHeight = 0;
    let startBottomHeight = 0;

    handleH.addEventListener('mousedown', (e) => {
      isResizingH = true;
      startY = e.clientY;
      startTopHeight = topCard.offsetHeight;
      startBottomHeight = bottomCard.offsetHeight;
      handleH.classList.add('active');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizingH) return;

      const deltaY = e.clientY - startY;
      const rightPanel = document.querySelector('.inventar-right-panel');
      const containerHeight = rightPanel.offsetHeight;
      const gapH = 12; // margins

      let newTopHeight = startTopHeight + deltaY;
      let newBottomHeight = startBottomHeight - deltaY;

      const minHeight = 100;
      if (newTopHeight < minHeight) {
        newTopHeight = minHeight;
        newBottomHeight = containerHeight - gapH - minHeight;
      }
      if (newBottomHeight < minHeight) {
        newBottomHeight = minHeight;
        newTopHeight = containerHeight - gapH - minHeight;
      }

      const totalHeight = newTopHeight + newBottomHeight + gapH;
      const topFlex = newTopHeight / totalHeight;
      const bottomFlex = newBottomHeight / totalHeight;

      topCard.style.flex = topFlex.toFixed(4);
      bottomCard.style.flex = bottomFlex.toFixed(4);
    });

    document.addEventListener('mouseup', () => {
      if (isResizingH) {
        isResizingH = false;
        handleH.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
};
