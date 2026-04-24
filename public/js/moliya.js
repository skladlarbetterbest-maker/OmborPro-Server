/**
 * Moliya — Buxgalteriya moduli (Debitor/Kreditor/To'lovlar)
 */
const Moliya = {
  async render() {
    // Stats
    const debtors = App.data.debtors || [];
    const creditors = App.data.creditors || [];
    const payments = App.data.payments || [];

    const totalDebtor = debtors.reduce((s,d) => s + (Number(d.summa)||0) - (Number(d.paid)||0), 0);
    const totalCreditor = creditors.reduce((s,c) => s + (Number(c.summa)||0) - (Number(c.paid)||0), 0);
    const totalPayments = payments.reduce((s,p) => s + (Number(p.summa)||0), 0);

    document.getElementById('mol-debtors').textContent = Utils.formatCompact(totalDebtor);
    document.getElementById('mol-creditors').textContent = Utils.formatCompact(totalCreditor);
    document.getElementById('mol-balance').textContent = Utils.formatCompact(totalDebtor - totalCreditor);
    document.getElementById('mol-payments').textContent = Utils.formatCompact(totalPayments);

    // Debitorlar jadvali
    document.getElementById('debtors-rows').innerHTML = debtors.length ? debtors.map(d => {
      const qoldiq = (Number(d.summa)||0) - (Number(d.paid)||0);
      return `<tr>
        <td style="font-weight:500">${d.firma || '—'}</td>
        <td class="mono">${Utils.formatSum(d.summa)}</td>
        <td class="mono" style="color:var(--green)">${Utils.formatSum(d.paid)}</td>
        <td class="mono" style="color:${qoldiq>0?'var(--orange)':'var(--green)'}; font-weight:700">${Utils.formatSum(qoldiq)}</td>
        <td class="mono" style="font-size:11px">${d.sana || '—'}</td>
        <td style="font-size:11px">${d.muddati || '—'}</td>
        <td><button class="btn btn-sm btn-green" onclick="Moliya.payDebtor('${d.id}','${d.firma}')" style="padding:4px 8px;font-size:10px">💰 To'lov</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-state"><div class="empty-state-text">Debitorlar yo\'q</div></td></tr>';

    // Kreditorlar jadvali
    document.getElementById('creditors-rows').innerHTML = creditors.length ? creditors.map(c => {
      const qoldiq = (Number(c.summa)||0) - (Number(c.paid)||0);
      return `<tr>
        <td style="font-weight:500">${c.firma || '—'}</td>
        <td class="mono">${Utils.formatSum(c.summa)}</td>
        <td class="mono" style="color:var(--green)">${Utils.formatSum(c.paid)}</td>
        <td class="mono" style="color:${qoldiq>0?'var(--red)':'var(--green)'}; font-weight:700">${Utils.formatSum(qoldiq)}</td>
        <td class="mono" style="font-size:11px">${c.sana || '—'}</td>
        <td style="font-size:11px">${c.muddati || '—'}</td>
        <td><button class="btn btn-sm btn-red" onclick="Moliya.payCreditor('${c.id}','${c.firma}')" style="padding:4px 8px;font-size:10px">💳 To'lov</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-state"><div class="empty-state-text">Kreditorlar yo\'q</div></td></tr>';
  },

  async addDebtor() {
    const firma = document.getElementById('dbt-firma').value.trim();
    const summa = document.getElementById('dbt-summa').value;
    const muddati = document.getElementById('dbt-muddati').value;
    const izoh = document.getElementById('dbt-izoh').value.trim();
    if (!firma || !summa) { Utils.showMsg('dbt-msg', 'Firma va summa kerak!', 'err'); return; }

    const res = await API.addDebtor({ firma, summa: Number(summa), muddati, izoh });
    if (res.ok) {
      Utils.showMsg('dbt-msg', 'Debitor qo\'shildi! ✅', 'ok');
      document.getElementById('dbt-firma').value = '';
      document.getElementById('dbt-summa').value = '';
      document.getElementById('dbt-izoh').value = '';
      App.loadData();
      setTimeout(() => this.render(), 500);
    } else Utils.showMsg('dbt-msg', res.error || 'Xato!', 'err');
  },

  async addCreditor() {
    const firma = document.getElementById('crd-firma').value.trim();
    const summa = document.getElementById('crd-summa').value;
    const muddati = document.getElementById('crd-muddati').value;
    const izoh = document.getElementById('crd-izoh').value.trim();
    if (!firma || !summa) { Utils.showMsg('crd-msg', 'Firma va summa kerak!', 'err'); return; }

    const res = await API.addCreditor({ firma, summa: Number(summa), muddati, izoh });
    if (res.ok) {
      Utils.showMsg('crd-msg', 'Kreditor qo\'shildi! ✅', 'ok');
      document.getElementById('crd-firma').value = '';
      document.getElementById('crd-summa').value = '';
      document.getElementById('crd-izoh').value = '';
      App.loadData();
      setTimeout(() => this.render(), 500);
    } else Utils.showMsg('crd-msg', res.error || 'Xato!', 'err');
  },

  async payDebtor(id, firma) {
    const amount = prompt(`"${firma}" dan qancha to'lov olindi?`);
    if (!amount) return;
    await API.addPayment({ type:'incoming', targetId:id, firma, summa: Number(amount) });
    App.loadData();
    setTimeout(() => this.render(), 500);
  },

  async payCreditor(id, firma) {
    const amount = prompt(`"${firma}" ga qancha to'lov qilindi?`);
    if (!amount) return;
    await API.addPayment({ type:'outgoing', targetId:id, firma, summa: Number(amount) });
    App.loadData();
    setTimeout(() => this.render(), 500);
  }
};
