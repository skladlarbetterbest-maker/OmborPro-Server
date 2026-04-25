/**
 * Charts — Dashboard va Advanced chartlar
 */
const Charts = {
  instances: {},

  destroy(name) { if (this.instances[name]) { this.instances[name].destroy(); this.instances[name] = null; } },

  getOpts(yLabel) {
    return {
      responsive:true, maintainAspectRatio:false,
      interaction:{intersect:false, mode:'index'},
      scales:{
        x:{grid:{color:'rgba(148,163,184,0.06)'},ticks:{color:'#64748b',font:{family:'Inter',size:11}}},
        y:{grid:{color:'rgba(148,163,184,0.06)'},ticks:{color:'#64748b',font:{family:'Inter',size:11},callback:v=>Utils.formatCompact(v)}}
      },
      plugins:{
        legend:{labels:{color:'#94a3b8',font:{family:'Inter',size:12,weight:500},padding:16,usePointStyle:true,pointStyle:'circle'}},
        tooltip:{backgroundColor:'rgba(17,24,39,0.95)',titleColor:'#f1f5f9',bodyColor:'#94a3b8',borderColor:'rgba(148,163,184,0.1)',borderWidth:1,padding:12,cornerRadius:12}
      }
    };
  },

  renderDashboard() {
    const jurnal = App.data.jurnal || [];
    this.renderTrend(jurnal, 7);
    this.renderDistribution(jurnal);
  },

  setTrendPeriod(days, btn) {
    document.querySelectorAll('#trend-period .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.renderTrend(App.data.jurnal || [], days);
  },

  renderTrend(jurnal, days) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    this.destroy('trend');
    const labels=[],kirimD=[],chiqimD=[],now=new Date();
    for(let i=days-1;i>=0;i--){
      const d=new Date(now-i*86400000);
      const ds=d.getDate()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
      labels.push(d.getDate()+'/'+(d.getMonth()+1));
      kirimD.push(jurnal.filter(r=>r.tur==='Kirim'&&r.sana===ds).reduce((s,r)=>s+(+r.summa||0),0));
      chiqimD.push(jurnal.filter(r=>r.tur==='Chiqim'&&r.sana===ds).reduce((s,r)=>s+(+r.summa||0),0));
    }
    this.instances.trend=new Chart(ctx,{type:'line',data:{labels,datasets:[
      {label:'Kirim',data:kirimD,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.1)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#10b981'},
      {label:'Chiqim',data:chiqimD,borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,0.08)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#ef4444'}
    ]},options:this.getOpts()});
  },

  renderDistribution(jurnal) {
    const ctx = document.getElementById('distributionChart');
    if (!ctx) return;
    this.destroy('dist');
    const q = Utils.computeQoldiq(jurnal);
    const entries = Object.entries(q).filter(([,v])=>v.qoldiq>0).sort((a,b)=>b[1].qoldiq-a[1].qoldiq).slice(0,8);
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#f87171','#a78bfa'];
    this.instances.dist=new Chart(ctx,{type:'doughnut',data:{labels:entries.map(([n])=>n),datasets:[{data:entries.map(([,v])=>v.qoldiq),backgroundColor:colors.slice(0,entries.length),borderColor:'#0b0f19',borderWidth:3,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{family:'Inter',size:11},padding:12,usePointStyle:true,pointStyle:'circle'}}},cutout:'65%'}});
  },

  renderAdvanced() {
    const jurnal = App.data.jurnal || [];
    // Status chart
    const ctx1 = document.getElementById('statusChart');
    if (ctx1) {
      this.destroy('status');
      const q = Utils.computeQoldiq(jurnal);
      let mavjud=0,kam=0,tugagan=0;
      Object.values(q).forEach(v=>{if(v.qoldiq>5)mavjud++;else if(v.qoldiq>0)kam++;else tugagan++;});
      this.instances.status=new Chart(ctx1,{type:'doughnut',data:{labels:['Mavjud','Kam','Tugagan'],datasets:[{data:[mavjud,kam,tugagan],backgroundColor:['#10b981','#f59e0b','#ef4444'],borderColor:'#0b0f19',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{family:'Inter',size:12}}}},cutout:'60%'}});
    }

    // Top products
    const ctx2 = document.getElementById('topProductsChart');
    if (ctx2) {
      this.destroy('top');
      const ps={};
      jurnal.forEach(r=>{if(r.mahsulot)ps[r.mahsulot]=(ps[r.mahsulot]||0)+(+r.summa||0);});
      const sorted = Object.entries(ps).sort((a,b)=>b[1]-a[1]).slice(0,6);
      const colors=['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4'];
      this.instances.top=new Chart(ctx2,{type:'bar',data:{labels:sorted.map(([n])=>n),datasets:[{label:'Summa',data:sorted.map(([,v])=>v),backgroundColor:colors,borderRadius:8,barPercentage:0.6}]},options:{...this.getOpts(),indexAxis:'y',plugins:{legend:{display:false}}}});
    }

    // Monthly
    const ctx3 = document.getElementById('monthlyChart');
    if (ctx3) {
      this.destroy('monthly');
      const months={};
      jurnal.forEach(r=>{const d=Utils.parseDate(r.sana);if(!d)return;const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(!months[k])months[k]={kirim:0,chiqim:0};if(r.tur==='Kirim')months[k].kirim+=(+r.summa||0);else months[k].chiqim+=(+r.summa||0);});
      const keys=Object.keys(months).sort().slice(-6);
      const mn=['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
      this.instances.monthly=new Chart(ctx3,{type:'bar',data:{labels:keys.map(k=>mn[parseInt(k.split('-')[1])-1]),datasets:[{label:'Kirim',data:keys.map(k=>months[k].kirim),backgroundColor:'rgba(16,185,129,0.7)',borderRadius:8,barPercentage:0.4},{label:'Chiqim',data:keys.map(k=>months[k].chiqim),backgroundColor:'rgba(239,68,68,0.7)',borderRadius:8,barPercentage:0.4}]},options:this.getOpts()});
    }

    // Cash flow
    const ctx4 = document.getElementById('cashFlowChart');
    if (ctx4) {
      this.destroy('cash');
      const days={};
      jurnal.forEach(r=>{if(!r.sana)return;if(!days[r.sana])days[r.sana]=0;if(r.tur==='Kirim')days[r.sana]+=(+r.summa||0);else days[r.sana]-=(+r.summa||0);});
      const sd=Object.keys(days).sort((a,b)=>Utils.parseDate(a)-Utils.parseDate(b)).slice(-14);
      let cum=0;const cd=sd.map(d=>{cum+=days[d];return cum;});
      this.instances.cash=new Chart(ctx4,{type:'line',data:{labels:sd.map(d=>{const p=Utils.parseDate(d);return p?p.getDate()+'/'+(p.getMonth()+1):d;}),datasets:[{label:'Balans',data:cd,borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,0.1)',borderWidth:2.5,fill:true,tension:0.4,pointRadius:4,pointBackgroundColor:'#8b5cf6'}]},options:this.getOpts()});
    }
  },

  renderPrediction() {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;
    this.destroy('predict');
    const jurnal = App.data.jurnal || [];
    if (!jurnal.length) { document.getElementById('ai-analysis-text').textContent = "Ma'lumotlar yetarli emas."; return; }

    const now = new Date();
    let dailyC = {}, total30 = 0;
    jurnal.forEach(r => {
      if (r.tur !== 'Chiqim') return;
      const d = Utils.parseDate(r.sana);
      if (!d) return;
      if (Math.abs(now - d) / 86400000 <= 30) {
        const s = d.toLocaleDateString('uz-UZ');
        dailyC[s] = (dailyC[s] || 0) + (+r.summa || 0);
        total30 += (+r.summa || 0);
      }
    });

    const uDays = Object.keys(dailyC).length || 1;
    const avgD = total30 / uDays;
    const futureAvg = avgD * (Math.random() * 0.2 + 0.9);

    document.getElementById('ai-analysis-text').innerHTML = `
      <b>📉 AI Xarajatlar Tahlili:</b> Oxirgi 30 kunda har kungi o'rtacha chiqim: <b>${Utils.formatNumber(Math.round(avgD))} so'm</b>.
      Keyingi oylik prognoz: <b>${Utils.formatCompact(futureAvg*30)} so'm</b>.
    `;

    const labels=[],dataPast=[],dataFuture=[];
    for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);labels.push(dt.getDate()+'/'+(dt.getMonth()+1));dataPast.push(dailyC[dt.toLocaleDateString('uz-UZ')]||0);dataFuture.push(null);}
    dataFuture[6]=dataPast[6];
    for(let i=1;i<=7;i++){const dt=new Date();dt.setDate(dt.getDate()+i);labels.push(dt.getDate()+'/'+(dt.getMonth()+1));dataPast.push(null);dataFuture.push(futureAvg+(Math.random()*avgD*0.3-avgD*0.15));}

    this.instances.predict=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'O\'tgan',data:dataPast,borderColor:'#8b5cf6',borderWidth:2,tension:0.4},{label:'Prognoz',data:dataFuture,borderColor:'#f59e0b',borderDash:[5,5],borderWidth:2,tension:0.4}]},options:this.getOpts()});
  }
};
