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
            <td style="white-space:nowrap" class="edit-actions">
              ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="Jurnal.startEdit('${item.id}')" style="padding:4px 8px;font-size:10px" title="Tahrirlash">✏️</button>` : ''}
              ${canDelete ? `<button class="btn btn-sm btn-outline" onclick="Jurnal.del('${item.id}')" style="padding:4px 8px;font-size:10px;color:var(--red);border-color:var(--red)" title="O'chirish">🗑️</button>` : ''}
            </td>
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
  }
};
