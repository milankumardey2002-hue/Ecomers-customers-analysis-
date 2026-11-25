(() => {
  const $ = s => document.querySelector(s), { PRODUCTS, CATS, FEATS, FEAT_LABELS, mean } = Core;
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN'), pct = n => (n * 100).toFixed(1) + '%';
  const PAL = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], SEGC = { Premium: '#4f46e5', Regular: '#0ea5e9', Occasional: '#f59e0b' };
  const short = v => Math.abs(v) >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(v % 1e3 ? 1 : 0) + 'k' : (+v.toFixed(2)).toString();
  let S;

  /* ---------- tiny canvas chart helpers ---------- */
  function cv(id, h = 240) {
    const c = $('#' + id), w = Math.max(280, c.parentElement.clientWidth - 32), d = devicePixelRatio || 1;
    c.width = w * d; c.height = h * d; c.style.height = h + 'px';
    const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h); g.font = '11px system-ui'; return { g, w, h };
  }
  function frame(g, w, h, m, lo, hi, fy) {
    g.strokeStyle = '#e5e7eb'; g.fillStyle = '#6b7280'; g.textAlign = 'right';
    for (let i = 0; i <= 4; i++) { const y = m.t + (h - m.t - m.b) * i / 4; g.beginPath(); g.moveTo(m.l, y); g.lineTo(w - m.r, y); g.stroke(); g.fillText(fy(hi - (hi - lo) * i / 4), m.l - 6, y + 4); }
  }
  function bars(id, labels, vals, o = {}) {
    const { g, w, h } = cv(id, o.h || 240), m = { l: 48, r: 8, t: 10, b: labels.length > 6 ? 58 : 30 };
    const hi = Math.max(0, ...vals) * 1.1 || 1, lo = Math.min(0, ...vals) * 1.1, fy = o.fy || short;
    frame(g, w, h, m, lo, hi, fy);
    const Y = v => m.t + (h - m.t - m.b) * (hi - v) / (hi - lo), bw = (w - m.l - m.r) / vals.length;
    vals.forEach((v, i) => {
      g.fillStyle = o.colors ? o.colors[i % o.colors.length] : PAL[0]; g.fillRect(m.l + i * bw + bw * .15, Y(Math.max(v, 0)), bw * .7, Math.abs(Y(v) - Y(0)));
      g.fillStyle = '#374151'; g.save(); g.translate(m.l + i * bw + bw / 2, h - m.b + 14);
      if (labels.length > 6) { g.rotate(-.6); g.textAlign = 'right'; } else g.textAlign = 'center'; g.fillText(labels[i], 0, 0); g.restore();
    });
  }
  function line(id, labels, vals, o = {}) {
    const { g, w, h } = cv(id, o.h || 240), m = { l: 52, r: 14, t: 12, b: 30 }, pad = (Math.max(...vals) - Math.min(...vals)) * .15 || 1;
    const lo = o.zero ? 0 : Math.min(...vals) - pad, hi = Math.max(...vals) + pad, fy = o.fy || short;
    frame(g, w, h, m, lo, hi, fy);
    const X = i => m.l + (w - m.l - m.r) * (vals.length > 1 ? i / (vals.length - 1) : .5), Y = v => m.t + (h - m.t - m.b) * (hi - v) / (hi - lo);
    g.strokeStyle = PAL[0]; g.lineWidth = 2; g.beginPath(); vals.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
    vals.forEach((v, i) => { const best = o.mark === i; g.fillStyle = best ? '#ef4444' : PAL[0]; g.beginPath(); g.arc(X(i), Y(v), best ? 5 : 3, 0, 7); g.fill(); g.fillStyle = '#374151'; g.textAlign = 'center'; g.fillText(labels[i], X(i), h - 10); });
  }
  function scatter(id, pts, o = {}) {
    const { g, w, h } = cv(id, o.h || 260), m = { l: 52, r: 12, t: 10, b: 32 }, xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    frame(g, w, h, m, y0, y1, short);
    const X = v => m.l + (w - m.l - m.r) * (v - x0) / (x1 - x0 || 1), Y = v => m.t + (h - m.t - m.b) * (y1 - v) / (y1 - y0 || 1);
    if (o.diag) { g.strokeStyle = '#ef4444'; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(X(Math.max(x0, y0)), Y(Math.max(x0, y0))); g.lineTo(X(Math.min(x1, y1)), Y(Math.min(x1, y1))); g.stroke(); g.setLineDash([]); }
    pts.forEach(p => { g.fillStyle = p.c || PAL[0]; g.globalAlpha = .65; g.beginPath(); g.arc(X(p.x), Y(p.y), 3, 0, 7); g.fill(); }); g.globalAlpha = 1;
    g.fillStyle = '#6b7280'; g.textAlign = 'center'; g.fillText(o.xl || '', (w + m.l) / 2, h - 6);
    for (let i = 0; i <= 4; i++) g.fillText(short(x0 + (x1 - x0) * i / 4), m.l + (w - m.l - m.r) * i / 4, h - 18);
    if (o.legend) o.legend.forEach(([n, c], i) => { g.fillStyle = c; g.fillRect(m.l + 8 + i * 90, m.t + 4, 10, 10); g.fillStyle = '#374151'; g.textAlign = 'left'; g.fillText(n, m.l + 22 + i * 90, m.t + 13); });
  }

  /* ---------- render sections ---------- */
  const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
  function renderData() {
    const r = S.report;
    $('#cards').innerHTML = stat(r.rawRows, 'Raw records') + stat(r.dups, 'Duplicates removed') + stat(r.missing, 'Missing values imputed') + stat(r.outliers, 'Outliers capped') + stat(r.finalRows, 'Clean records');
    $('#steps').innerHTML = `<li>Removed <b>${r.dups}</b> duplicate customer records (same customer ID).</li>
      <li>Filled <b>${r.missing}</b> missing income / rating values with the median (₹${r.medInc}k and ${r.medRat}★).</li>
      <li>Capped <b>${r.outliers}</b> spending outliers using the IQR rule (upper limit ${inr(r.cap)}).</li>
      <li>Encoded categorical data: gender → 0/1, city tier → 1/2/3, product purchases → 0/1 matrix, category-interest profile per customer.</li>
      <li>Split into 80% training / 20% test, then standardised every numeric feature (mean 0, std 1) using training statistics only.</li>`;
    const cols = ['id', 'age', 'gender', 'tier', 'income', 'visits', 'pages', 'cart', 'past', 'rating', 'recency', 'spend', 'buy', 'segment'];
    $('#preview').innerHTML = '<tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>' + S.data.slice(0, 12).map(d => '<tr>' + cols.map(c => `<td>${c === 'spend' ? inr(d[c]) : d[c]}</td>`).join('') + '</tr>').join('');
  }
  function renderAnalysis() {
    const D = S.data, catRev = CATS.map((_, c) => D.reduce((s, d) => s + PRODUCTS.filter(p => p.cat === c && d.bought[p.id]).reduce((a, p) => a + p.price, 0), 0));
    bars('cRev', CATS, catRev, { colors: PAL });
    const order = [...PRODUCTS].sort((a, b) => S.pop[b.id] - S.pop[a.id]).slice(0, 8);
    bars('cTop', order.map(p => p.name.split(' ').slice(0, 2).join(' ')), order.map(p => S.pop[p.id]), { colors: [PAL[1]] });
    const tot = D.reduce((s, d) => s + d.spend, 0), season = [.8, .78, .85, .88, .9, .86, .92, 1, 1.1, 1.4, 1.35, 1.2], sm = season.reduce((a, b) => a + b);
    line('cMonth', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], season.map(s => tot * s / sm / 1e5), { zero: true, fy: v => v.toFixed(0) });
    const sp = D.map(d => d.spend), mx = Math.max(...sp), B = 10, bw = mx / B, hist = Array(B).fill(0); sp.forEach(v => hist[Math.min(B - 1, Math.floor(v / bw))]++);
    bars('cHist', hist.map((_, i) => short(i * bw)), hist, { colors: [PAL[2]], fy: v => Math.round(v) });
    bars('cCorr', FEAT_LABELS.map(l => l.split(' (')[0]), S.corrs, { colors: S.corrs.map(c => c >= 0 ? PAL[0] : PAL[4]), fy: v => v.toFixed(1), h: 260 });
    const ag = [[18, 27], [28, 37], [38, 47], [48, 57], [58, 65]];
    bars('cAge', ag.map(a => a.join('-')), ag.map(a => mean(D.filter(d => d.age >= a[0] && d.age <= a[1]).map(d => d.spend))), { colors: [PAL[3]] });
    const top = [...FEATS.keys()].sort((a, b) => Math.abs(S.corrs[b]) - Math.abs(S.corrs[a])).slice(0, 3);
    const best = CATS[catRev.indexOf(Math.max(...catRev))], pop = [...PRODUCTS].sort((a, b) => S.pop[b.id] - S.pop[a.id])[0];
    $('#insights').innerHTML = `<li>Spending is most strongly related to <b>${top.map(i => FEAT_LABELS[i]).join(', ')}</b>.</li>
      <li><b>${best}</b> brings the highest revenue; the most-bought product is <b>${pop.name}</b> (${S.pop[pop.id]} buyers).</li>
      <li>Sales peak in <b>Oct–Nov</b> (festive season) — the best window for campaigns.</li>
      <li>Average spend is ${inr(mean(sp))}; ${pct(S.data.filter(d => d.buy).length / S.data.length)} of customers are likely purchasers.</li>
      <li>Recent customers (low "days since last order") spend more — retention offers help.</li>`;
  }
  function renderModels() {
    const l = S.lin, g = S.log;
    $('#linM').innerHTML = stat(l.r2.toFixed(3), 'R² score') + stat(inr(l.rmse), 'RMSE') + stat(inr(l.mae), 'MAE');
    scatter('cPred', S.te.map((_, i) => ({ x: S.yte[i], y: l.pred[i] })), { diag: true, xl: 'Actual spend (₹)' });
    $('#logM').innerHTML = stat(pct(g.acc), 'Accuracy') + stat(pct(g.pr), 'Precision') + stat(pct(g.rc), 'Recall') + stat(pct(g.f1), 'F1 score');
    $('#conf').innerHTML = `<div class="conf"><span></span><b>Pred. No</b><b>Pred. Yes</b><b>Actual No</b><div style="background:#d1fae5">${g.tn}</div><div style="background:#fee2e2">${g.fp}</div><b>Actual Yes</b><div style="background:#fee2e2">${g.fn}</div><div style="background:#d1fae5">${g.tp}</div></div>`;
    $('#segT').innerHTML = '<tr><th>Segment</th><th>Customers</th><th>Avg spend</th><th>Visits</th><th>Orders</th><th>Income</th></tr>' + S.segs.map(s => `<tr><td><span class="badge" style="background:${SEGC[s.name]}">${s.name}</span></td><td>${s.count}</td><td>${inr(s.spend)}</td><td>${s.visits.toFixed(1)}</td><td>${s.past.toFixed(1)}</td><td>₹${s.income.toFixed(0)}k</td></tr>`).join('');
    scatter('cSeg', S.data.map(d => ({ x: d.visits, y: d.spend, c: SEGC[d.segment] })), { xl: 'Visits per month', legend: Object.entries(SEGC) });
    $('#knnM').innerHTML = stat(S.bestK, 'Best k') + stat(pct(S.knnHits[S.ks.indexOf(S.bestK)]), 'KNN hit rate') + stat(pct(S.popHit), 'Popularity baseline');
    line('cKnn', S.ks, S.knnHits, { mark: S.ks.indexOf(S.bestK), fy: v => (v * 100).toFixed(0) + '%' });
  }
  function renderOpt() {
    const fmtc = v => v.toFixed(3);
    $('#optT').innerHTML = `<tr><th>Model</th><th>Before tuning</th><th>After tuning (CV-selected)</th><th>Chosen setting</th></tr>
      <tr><td>Linear Regression (test RMSE)</td><td>${inr(S.linBase.rmse)}</td><td>${inr(S.lin.rmse)}</td><td>ridge λ = ${S.bestLam}</td></tr>
      <tr><td>Logistic Regression (test accuracy)</td><td>${pct(S.logBase.acc)}</td><td>${pct(S.log.acc)}</td><td>learning rate = ${S.bestLr}, 300 iterations</td></tr>
      <tr><td>KNN Recommender (hit rate)</td><td>${pct(S.knnHits[0])} (k=1)</td><td>${pct(S.knnHits[S.ks.indexOf(S.bestK)])}</td><td>k = ${S.bestK}</td></tr>
      <tr><td>K-Means</td><td colspan="2">Elbow curve flattens around k = 3–4</td><td>k = 3 (Premium / Regular / Occasional)</td></tr>
      <tr><td>5-fold CV score (best settings)</td><td colspan="2">RMSE ${inr(S.cvFinal.rmse)} · Accuracy ${pct(S.cvFinal.acc)}</td><td>validated on unseen folds</td></tr>`;
    line('cLam', S.lams, S.lamCV, { mark: S.lams.indexOf(S.bestLam) });
    line('cLr', S.lrs, S.lrCV, { mark: S.lrs.indexOf(S.bestLr), fy: v => (v * 100).toFixed(1) + '%' });
    line('cElb', [2, 3, 4, 5, 6], S.elbow, { mark: 1 });
    line('cKnn2', S.ks, S.knnHits, { mark: S.ks.indexOf(S.bestK), fy: v => (v * 100).toFixed(0) + '%' });
  }

  /* ---------- predictor ---------- */
  const FIELDS = [['age', 'Age', 18, 65, 30], ['income', 'Income (₹k/mo)', 10, 150, 60], ['visits', 'Visits / month', 1, 30, 12], ['pages', 'Pages viewed', 5, 200, 60], ['cart', 'Cart adds', 0, 20, 4], ['past', 'Past orders', 0, 25, 6], ['rating', 'Avg rating (1-5)', 1, 5, 4], ['recency', 'Days since last order', 1, 120, 10]];
  function buildForm() {
    $('#form').innerHTML = FIELDS.map(f => `<label>${f[1]}<input id="f_${f[0]}" type="number" min="${f[2]}" max="${f[3]}" step="${f[0] === 'rating' ? .1 : 1}" value="${f[4]}"></label>`).join('') +
      '<label>Gender<select id="f_gender"><option>Male</option><option>Female</option></select></label><label>City tier<select id="f_tier"><option>1</option><option>2</option><option>3</option></select></label>';
    $('#cats').innerHTML = CATS.map((c, i) => `<label><input type="checkbox" value="${i}" ${i === 0 || i === 5 ? 'checked' : ''}> ${c}</label>`).join('');
    $('#load').innerHTML = '<option value="">— enter manually —</option>' + S.data.slice(0, 60).map(d => `<option value="${d.id}">Customer #${d.id} (${d.segment})</option>`).join('');
  }
  let owned = [];
  $('#load').addEventListener('change', e => {
    owned = []; const d = S.data.find(x => x.id == e.target.value); if (!d) return;
    FIELDS.forEach(f => $('#f_' + f[0]).value = d[f[0]]); $('#f_gender').value = d.gender; $('#f_tier').value = d.tier;
    const cs = new Set(PRODUCTS.filter(p => d.bought[p.id]).map(p => p.cat)); document.querySelectorAll('#cats input').forEach(c => c.checked = cs.has(+c.value));
    owned = PRODUCTS.filter(p => d.bought[p.id]).map(p => p.id);
  });
  $('#go').addEventListener('click', () => {
    const inp = {}; FIELDS.forEach(f => inp[f[0]] = +$('#f_' + f[0]).value); inp.gender = $('#f_gender').value; inp.tier = +$('#f_tier').value;
    const ints = [...document.querySelectorAll('#cats input:checked')].map(c => +c.value);
    const r = Core.predict(inp, ints, $('#load').value ? owned : []);
    $('#out').innerHTML = `<h3>Predicted future spending</h3><div class="big">${inr(r.spend)}</div>
      <h3>Purchase probability</h3><div class="big">${pct(r.prob)}</div><div class="bar"><i style="width:${r.prob * 100}%"></i></div>
      <p>${r.prob >= .5 ? '✅ Likely to purchase' : '⚠️ Unlikely to purchase — consider a discount or reminder'}</p>
      <h3>Customer segment</h3><span class="badge" style="background:${SEGC[r.segment]}">${r.segment}</span>
      <h3>Recommended products (KNN, k=${S.bestK})</h3>${r.recs.length ? '<ol>' + r.recs.map(p => `<li><b>${p.name}</b> · ${CATS[p.cat]} · ${inr(p.price)}</li>`).join('') + '</ol>' : '<p class="sub">Select at least one category of interest.</p>'}`;
  });

  /* ---------- wiring ---------- */
  function renderAll() { renderData(); buildForm(); ['analysis', 'models', 'opt'].forEach(t => { const el = $('#t-' + t), was = el.hidden; el.hidden = false; ({ analysis: renderAnalysis, models: renderModels, opt: renderOpt })[t](); el.hidden = was; }); }
  function show(t) { document.querySelectorAll('main>section').forEach(s => s.hidden = s.id !== 't-' + t); document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); if (['analysis', 'models', 'opt'].includes(t)) ({ analysis: renderAnalysis, models: renderModels, opt: renderOpt })[t](); }
  $('#tabs').addEventListener('click', e => { if (e.target.dataset.tab) show(e.target.dataset.tab); });
  $('#regen').addEventListener('click', () => { $('#regen').textContent = 'Working…'; setTimeout(() => { S = Core.run(+$('#seed').value || 1); renderAll(); $('#regen').textContent = 'Regenerate dataset'; }, 20); });
  $('#dl').addEventListener('click', () => {
    const cols = ['id', 'age', 'gender', 'tier', 'income', 'visits', 'pages', 'cart', 'past', 'rating', 'recency', 'spend', 'buy', 'segment'];
    const csv = cols.join(',') + '\n' + S.data.map(d => cols.map(c => d[c]).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cleaned_customers.csv'; a.click();
  });
  window.addEventListener('resize', () => { const t = document.querySelector('#tabs .on').dataset.tab; if (['analysis', 'models', 'opt'].includes(t)) show(t); });
  S = Core.run(42); renderAll();
})();
