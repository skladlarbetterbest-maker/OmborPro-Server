/**
 * MinQoldiq — Minimum qoldiq limitlari
 */
const MinQoldiq = {
  sortField: 'name',
  sortDir: 'asc',

  render() {
    const list = document.getElementById('minq-list');
    if (!list) return;

    const obyekt = document.getElementById('minq-obyekt-filter')?.value || 'Barchasi';
    const search = (document.getElementById('minq-search')?.value || '').toLowerCase();

    const minStock = App.data.minStock || {};
    const jurnal = App.data.jurnal || [];

    // Filter by obyekt
    let filtered = jurnal.filter(r => obyekt === 'Barchasi' || (r.obyekt || 'Barchasi') === obyekt);

    // Get unique products with their qoldiq
    const productQoldiq = {};
    filtered.forEach(r => {
      const nom = r.mahsulot || '';
      if (!nom) return;
      const m = Number(r.miqdor) || 0;
      if (!productQoldiq[nom]) productQoldiq[nom] = { kirim: 0, chiqim: 0 };
      if (r.tur === 'Kirim') productQoldiq[nom].kirim += m;
      else productQoldiq[nom].chiqim += m;
    });

    let items = Object.entries(productQoldiq).map(([nom, data]) => ({
      nom,
      qoldiq: data.kirim - data.chiqim,
      limit: minStock[nom] || 5
    })).filter(i => i.qoldiq >= 0);

    if (search) items = items.filter(i => i.nom.toLowerCase().includes(search));

    // Sort
    items.sort((a, b) => {
      if (this.sortField === 'name') {
        return this.sortDir === 'asc' ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom);
      } else if (this.sortField === 'qoldiq') {
        return this.sortDir === 'asc' ? a.qoldiq - b.qoldiq : b.qoldiq - a.qoldiq;
      } else if (this.sortField === 'limit') {
        return this.sortDir === 'asc' ? a.limit - b.limit : b.limit - a.limit;
      }
      return 0;
    });

    if (!items.length) {
      list.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:24px">Mahsulotlar topilmadi</div>';
      return;
    }

    list.innerHTML = items.map(i => {
      const isLow = i.qoldiq <= i.limit;
      const bg = isLow ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)';
      const border = isLow ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;background:${bg};padding:12px 16px;border-radius:var(--radius-sm);border:${border}">
          <div>
            <div style="font-weight:600;font-size:14px;color:${isLow?'var(--red)':'var(--text)'}">${i.nom}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              Joriy qoldiq: <span style="color:${isLow?'var(--red)':'var(--green)'};font-weight:600">${Utils.formatNumber(i.qoldiq)}</span>
              ${isLow ? '<span style="color:var(--red);margin-left:8px">⚠️ Kam</span>' : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--text-muted)">Min limit:</span>
            <input type="number" value="${i.limit}" min="0" style="width:70px;padding:8px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:13px;text-align:center"
              onchange="MinQoldiq.setLimit('${i.nom.replace(/'/g,"\\'")}', this.value)">
          </div>
        </div>
      `;
    }).join('');
  },

  sort(field) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.render();
  },

  async setLimit(productName, value) {
    const minQty = Number(value) || 0;
    await API.post('/api/settings/min-stock', { productName, minQty });
    if (!App.data.minStock) App.data.minStock = {};
    App.data.minStock[productName] = minQty;
    this.render();
  },

  populateObyektFilter() {
    const select = document.getElementById('minq-obyekt-filter');
    if (!select) return;
    let obyektlar = App.data.obyektlar || ['Barchasi'];
    const user = App.currentUser;
    let userObyekt = user?.obyekt || 'Barchasi';

    // Obyektlarni arrayga aylantirish
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

    // User obyektni ham arrayga aylantirish
    if (typeof userObyekt === 'string') {
      if (userObyekt.includes(',')) {
        userObyekt = userObyekt.split(',').map(o => o.trim());
      } else {
        userObyekt = [userObyekt];
      }
    }
    if (Array.isArray(userObyekt)) {
      userObyekt = userObyekt.flatMap(o => {
        if (typeof o === 'string' && o.includes(',')) {
          return o.split(',').map(x => x.trim());
        }
        return o;
      });
    }
    userObyekt = Array.from(new Set(userObyekt));

    select.innerHTML = obyektlar
      .filter(o => userObyekt.includes('Barchasi') || userObyekt.includes(o) || o === 'Barchasi')
      .map(o => `<option value="${o}">${o}</option>`).join('');
  }
};
