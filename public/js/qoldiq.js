/**
 * Qoldiq — Qoldiq tab
 */
const Qoldiq = {
  sortField: 'qoldiq', sortDir: 'desc',

  getFilteredData() {
    const jurnal = App.data.jurnal || [];
    const filter = document.getElementById('qoldiq-obyekt-filter');
    const obyekt = filter ? filter.value : 'Barchasi';
    const q = Utils.computeQoldiq(jurnal, obyekt);
    const items = [];
    Object.entries(q).forEach(([nom, d]) => {
      if (!d.kirim && !d.chiqim && !d.qoldiq) return;
      const avgPrice = d.kirim > 0 ? d.kirimSumma / d.kirim : 0;
      const totalVal = d.qoldiq > 0 ? avgPrice * d.qoldiq : 0;
      items.push({ nom, obyekt, kirim:d.kirim, chiqim:d.chiqim, qoldiq:d.qoldiq, summa:totalVal });
    });
    return { obyekt, items };
  },

  render() {
    const { items, obyekt } = this.getFilteredData();
    let totalSumma = items.reduce((s, d) => s + d.summa, 0);

    items.sort((a,b) => {
      let va = a[this.sortField], vb = b[this.sortField];
      if (typeof va === 'string') return this.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return this.sortDir === 'asc' ? va - vb : vb - va;
    });

    document.getElementById('qoldiq-total-summa').textContent = Utils.formatCompact(totalSumma) + " " + App.t('narxSum');
    document.getElementById('qoldiq-count').textContent = items.length + ' ' + App.t('mahsulot') + ' (' + obyekt + ')';
    document.getElementById('qoldiq-rows').innerHTML = items.length ? items.map((d,i) => `
      <tr>
        <td class="mono" style="color:var(--text-muted)">${String(i+1).padStart(2,'0')}</td>
        <td style="font-weight:500">${d.nom}</td>
        <td style="font-size:11px;color:var(--text-secondary)">${d.obyekt}</td>
        <td class="mono" style="color:var(--green)">${Utils.formatNumber(d.kirim)}</td>
        <td class="mono" style="color:var(--red)">${Utils.formatNumber(d.chiqim)}</td>
        <td class="mono" style="font-weight:700;color:${d.qoldiq>0?'var(--accent-light)':'var(--red)'}">${Utils.formatNumber(d.qoldiq)}</td>
        <td class="mono" style="color:var(--orange)">${Utils.formatCompact(d.summa)}</td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">' + App.t('yozuvlarYoq') + '</div></td></tr>';
  },

  sort(field) {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = 'desc'; }
    this.render();
  },

  exportXLS() {
    const { items, obyekt } = this.getFilteredData();
    if (!items.length) { alert("Ma'lumot yo'q!"); return; }

    const ws_data = [
      ['QOLDIQ HISOBOTI'],
      ['Obyekt: ' + obyekt],
      ['Sana: ' + new Date().toLocaleDateString('uz-UZ')],
      [],
      ['#', 'Mahsulot', 'Obyekt', 'Kirim', 'Chiqim', 'Qoldiq', 'Summa']
    ];

    items.forEach((d, i) => {
      ws_data.push([i+1, d.nom, d.obyekt, d.kirim, d.chiqim, d.qoldiq, d.summa]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [
      { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Qoldiq');
    XLSX.writeFile(wb, `qoldiq_${obyekt}_${new Date().toISOString().slice(0,10)}.xlsx`);
  },

  print() {
    const { items, obyekt } = this.getFilteredData();
    if (!items.length) { alert("Ma'lumot yo'q!"); return; }

    const printWindow = window.open('', '_blank');
    const totalSum = items.reduce((s, d) => s + d.summa, 0);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Qoldiq Hisoboti - ${obyekt}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 30px; 
            color: #1a1a2e;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #6366f1;
          }
          .header h1 { 
            font-size: 28px; 
            color: #6366f1; 
            margin-bottom: 8px;
          }
          .header-info {
            display: flex;
            justify-content: center;
            gap: 40px;
            font-size: 14px;
            color: #64748b;
          }
          .header-info span { font-weight: 600; color: #1e293b; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 13px;
          }
          th { 
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white; 
            padding: 14px 10px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          td { 
            padding: 12px 10px; 
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #f1f5f9; }
          td:first-child { color: #94a3b8; font-weight: 600; }
          .sum-col { 
            text-align: right; 
            font-weight: 600;
            color: #f59e0b;
          }
          .qty-col { text-align: center; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #6366f1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-box {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 20px 40px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          }
          .total-box .label { font-size: 12px; opacity: 0.9; text-transform: uppercase; }
          .total-box .value { font-size: 28px; font-weight: 800; }
          .meta { font-size: 12px; color: #94a3b8; text-align: right; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 QOLDIQ HISOBOTI</h1>
          <div class="header-info">
            <div><span>Obyekt:</span> ${obyekt}</div>
            <div><span>Sana:</span> ${new Date().toLocaleDateString('uz-UZ')}</div>
            <div><span>Jami:</span> ${items.length} ta mahsulot</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width:50px">#</th>
              <th>Mahsulot</th>
              <th style="width:100px">Obyekt</th>
              <th class="qty-col" style="width:80px">📥 Kirim</th>
              <th class="qty-col" style="width:80px">📤 Chiqim</th>
              <th class="qty-col" style="width:80px">📦 Qoldiq</th>
              <th class="sum-col" style="width:120px">💰 Summa</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((d, i) => `
              <tr>
                <td>${String(i+1).padStart(2, '0')}</td>
                <td style="font-weight:500">${d.nom}</td>
                <td style="color:#64748b;font-size:12px">${d.obyekt}</td>
                <td class="qty-col" style="color:#10b981">${d.kirim.toLocaleString()}</td>
                <td class="qty-col" style="color:#ef4444">${d.chiqim.toLocaleString()}</td>
                <td class="qty-col" style="font-weight:700;color:${d.qoldiq > 0 ? '#6366f1' : '#ef4444'}">${d.qoldiq.toLocaleString()}</td>
                <td class="sum-col">${d.summa.toLocaleString()} so'm</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <div class="total-box">
            <div class="label">Jami Summa</div>
            <div class="value">${totalSum.toLocaleString()} so'm</div>
          </div>
          <div class="meta">
            <div>OmborPro v3.8</div>
            <div>${new Date().toLocaleString('uz-UZ')}</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
};
