/**
 * Reports — Hisobot moduli (Pro)
 */
const Reports = {
  lastReport: [],
  init() {
    this.populateObyekt();
  },
  populateObyekt() {
    const el = document.getElementById('report-obyekt');
    if (!el) return;
    let obyektlar = App.data.obyektlar || ['Barchasi'];

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

    let allowed = App.currentUser?.obyekt || 'Barchasi';
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

    const isAdmin = App.getUserRole() === 'admin' || App.getUserRole() === 'owner';

    let opts;
    if (!isAdmin && !allowed.includes('Barchasi')) {
      opts = obyektlar.filter(o => allowed.includes(o)).map(o => `<option value="${o}">${o}</option>`).join('');
    } else {
      opts = '<option value="Barchasi">Barchasi</option>' + obyektlar.filter(o=>o!=='Barchasi').map(o => `<option value="${o}">${o}</option>`).join('');
    }
    el.innerHTML = opts;
  },
  async generate() {
    const params = {
      from: document.getElementById('report-from')?.value || '',
      to: document.getElementById('report-to')?.value || '',
      type: document.getElementById('report-type')?.value || 'all',
      obyekt: document.getElementById('report-obyekt')?.value || 'Barchasi',
      firma: document.getElementById('report-firma')?.value || ''
    };
    const res = await API.getFilteredReport(params);
    if (!res.ok) { alert(res.error || 'Xato!'); return; }
    this.lastReport = res.data || [];
    document.getElementById('report-summary').style.display = 'block';
    document.getElementById('report-summary-cards').innerHTML = `
      <div class="quick-item"><div class="quick-item-val" style="color:var(--green)">${Utils.formatCompact(res.totalKirim)}</div><div class="quick-item-label">Jami Kirim</div></div>
      <div class="quick-item"><div class="quick-item-val" style="color:var(--red)">${Utils.formatCompact(res.totalChiqim)}</div><div class="quick-item-label">Jami Chiqim</div></div>
      <div class="quick-item"><div class="quick-item-val" style="color:var(--accent-light)">${res.count}</div><div class="quick-item-label">Yozuvlar</div></div>
    `;
    document.getElementById('report-rows').innerHTML = this.lastReport.length ? this.lastReport.map((r,i) => `
      <tr>
        <td class="mono" style="color:var(--text-muted)">${i+1}</td>
        <td class="mono" style="font-size:11px">${r.sana||'—'}</td>
        <td>${r.tur==='Kirim'?'<span class="badge badge-kirim">KIRIM</span>':'<span class="badge badge-chiqim">CHIQIM</span>'}</td>
        <td style="font-weight:500">${r.mahsulot||'—'}</td>
        <td class="mono">${Utils.formatNumber(r.miqdor)}</td>
        <td class="mono" style="color:${r.tur==='Kirim'?'var(--green)':'var(--red)'}">${Utils.formatSum(r.summa)}</td>
        <td style="color:var(--text-secondary);font-size:12px">${r.tomon||'—'}</td>
        <td style="color:var(--accent-light);font-size:11px">${r.obyekt||'—'}</td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty-state">Natija topilmadi</td></tr>';
  },
  export(format) {
    if (!this.lastReport.length) { alert('Avval hisobot yarating!'); return; }
    if (format === 'csv') {
      let csv = 'Sana,Tur,Mahsulot,Miqdor,Summa,Tomon\n';
      this.lastReport.forEach(r => { csv += `"${r.sana||''}","${r.tur||''}","${r.mahsulot||''}",${r.miqdor||0},${r.summa||0},"${r.tomon||''}"\n`; });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'hisobot_' + new Date().toISOString().slice(0,10) + '.csv';
      link.click();
    } else { window.print(); }
  }
};
