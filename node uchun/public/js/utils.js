/**
 * Utils — Yordamchi funksiyalar
 */
const Utils = {
  formatSum(n) {
    if (!n && n !== 0) return '—';
    return this.formatNumber(Number(n)) + " so'm";
  },
  formatNumber(n) {
    if (!n && n !== 0) return '—';
    return Number(n).toLocaleString('uz-UZ').replace(/,/g, '.');
  },
  formatCompact(n) {
    if (!n && n !== 0) return '0';
    n = Number(n);
    if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(1)+' mlrd';
    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1)+' mln';
    if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1)+' ming';
    return n.toString();
  },
  formatInputNumber(val) {
    if (!val) return '';
    const num = val.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },
  formatDate(d) {
    if (!d) return '';
    if (typeof d === 'string') {
      const parsed = this.parseDate(d);
      if (parsed) d = parsed;
      else return d;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  },
  today() {
    return this.formatDate(new Date());
  },
  parseDate(dateStr) {
    if (!dateStr) return null;
    let parts;
    if (dateStr.includes('.')) parts = dateStr.split('.');
    else if (dateStr.includes('/')) parts = dateStr.split('/');
    else if (dateStr.includes('-')) { const p = dateStr.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
    else return null;
    if (parts && parts.length === 3) return new Date(+parts[2], +parts[1]-1, +parts[0]);
    return null;
  },
  showMsg(el, text, type) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.textContent = text;
    el.className = 'success-msg show ' + type;
    setTimeout(() => { el.className = 'success-msg'; }, 5000);
  },
  computeQoldiq(jurnal, obyektFilter) {
    const q = {};
    jurnal.forEach(r => {
      const n = (r.mahsulot || '').trim();
      if (!n) return;
      const rowObyekt = (r.obyekt || 'Barchasi').trim();
      if (obyektFilter && obyektFilter !== 'Barchasi' && rowObyekt !== obyektFilter) return;
      if (!q[n]) q[n] = { kirim:0, chiqim:0, qoldiq:0, kirimSumma:0, chiqimSumma:0 };
      const m = Number(r.miqdor) || 0;
      const s = Number(r.summa) || 0;
      if (r.tur === 'Kirim') { q[n].kirim += m; q[n].kirimSumma += s; q[n].qoldiq += m; }
      else { q[n].chiqim += m; q[n].chiqimSumma += s; q[n].qoldiq -= m; }
    });
    return q;
  },
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
