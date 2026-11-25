/* Core: synthetic data, preprocessing and ML models (pure JavaScript, no libraries) */
const Core = (() => {
  let R = Math.random;
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const norm = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))) || 1; };
  const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const quant = (a, q) => { const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); };
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const CATS = ['Electronics', 'Fashion', 'Home', 'Beauty', 'Books', 'Sports'];
  const PRODUCTS = [
    { id: 0, name: 'Wireless Earbuds', cat: 0, price: 2499 }, { id: 1, name: 'Smart Watch', cat: 0, price: 4999 },
    { id: 2, name: 'Running Shoes', cat: 5, price: 3299 }, { id: 3, name: 'Yoga Mat', cat: 5, price: 899 },
    { id: 4, name: 'Denim Jacket', cat: 1, price: 2199 }, { id: 5, name: 'Cotton Kurta', cat: 1, price: 1299 },
    { id: 6, name: 'Cookware Set', cat: 2, price: 3499 }, { id: 7, name: 'LED Table Lamp', cat: 2, price: 799 },
    { id: 8, name: 'Face Serum', cat: 3, price: 999 }, { id: 9, name: 'Perfume', cat: 3, price: 1799 },
    { id: 10, name: 'Bestseller Novel', cat: 4, price: 399 }, { id: 11, name: 'Data Science Handbook', cat: 4, price: 899 }
  ];
  const FEATS = ['age', 'income', 'visits', 'pages', 'cart', 'past', 'rating', 'recency', 'male', 'tier'];
  const FEAT_LABELS = ['Age', 'Income (₹k/mo)', 'Visits/month', 'Pages viewed', 'Cart adds', 'Past orders', 'Avg rating', 'Days since last order', 'Male (1/0)', 'City tier'];
  const feat = d => [d.age, d.income, d.visits, d.pages, d.cart, d.past, d.rating, d.recency, d.gender === 'Male' ? 1 : 0, d.tier];

  /* ---------- 1. COLLECT: synthetic raw data (with realistic mess) ---------- */
  function generate(n = 600) {
    const rows = [];
    for (let i = 1; i <= n; i++) {
      const tier = 1 + Math.floor(R() * 3), age = Math.round(18 + R() * 47), gender = R() < .5 ? 'Male' : 'Female';
      const income = Math.round(Math.min(150, 15 + Math.abs(norm()) * 35 + (4 - tier) * 8));
      const visits = Math.max(1, Math.round(4 + R() * 16 + norm() * 2));
      const pages = Math.round(visits * (3 + R() * 5)), cart = Math.round(visits * R() * .6);
      const past = Math.max(0, Math.round(visits * .4 + norm() * 2 + income / 40));
      const rating = +clamp(3.6 + norm() * .7, 1, 5).toFixed(1), recency = Math.round(1 + R() * R() * 90);
      const fav = Math.floor(R() * 6), sec = Math.floor(R() * 6);
      const bought = PRODUCTS.map(p => R() < (p.cat === fav ? .45 : .06) + (p.cat === sec ? .18 : 0) ? 1 : 0);
      const spend = Math.max(0, Math.round(500 + 40 * income + 120 * visits + 450 * past + 15 * pages - 25 * recency + 300 * rating + norm() * 700));
      const logit = -2.4 + .1 * visits + .3 * cart + .6 * (rating - 3.5) - .02 * recency + .08 * past;
      rows.push({ id: i, age, gender, tier, income, visits, pages, cart, past, rating, recency, spend, buy: R() < 1 / (1 + Math.exp(-logit)) ? 1 : 0, bought, fav });
    }
    // add mess: missing values, duplicates, outliers
    rows.forEach(r => { if (R() < .03) r.income = null; if (R() < .03) r.rating = null; });
    for (let k = 0; k < 12; k++) rows.push({ ...rows[Math.floor(R() * n)] });
    for (let k = 0; k < 8; k++) rows[Math.floor(R() * n)].spend *= 4;
    return rows;
  }

  /* ---------- 2. PREPROCESS ---------- */
  function clean(raw) {
    const seen = new Set(), uniq = [];
    raw.forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); uniq.push({ ...r }); } });
    const dups = raw.length - uniq.length;
    const medInc = median(uniq.filter(r => r.income != null).map(r => r.income));
    const medRat = median(uniq.filter(r => r.rating != null).map(r => r.rating));
    let missing = 0;
    uniq.forEach(r => { if (r.income == null) { r.income = medInc; missing++; } if (r.rating == null) { r.rating = medRat; missing++; } });
    const sp = uniq.map(r => r.spend), q1 = quant(sp, .25), q3 = quant(sp, .75), hi = q3 + 1.5 * (q3 - q1);
    let outliers = 0; uniq.forEach(r => { if (r.spend > hi) { r.spend = Math.round(hi); outliers++; } });
    return { data: uniq, report: { rawRows: raw.length, dups, missing, outliers, finalRows: uniq.length, medInc, medRat, cap: Math.round(hi) } };
  }

  /* ---------- helpers: algebra & metrics ---------- */
  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => [...r, b[i]]);
    for (let i = 0; i < n; i++) {
      let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
      [M[i], M[p]] = [M[p], M[i]];
      for (let r = i + 1; r < n; r++) { const f = M[r][i] / M[i][i]; for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; }
    }
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let c = i + 1; c < n; c++) s -= M[i][c] * x[c]; x[i] = s / M[i][i]; }
    return x;
  }
  const dot = (w, x) => x.reduce((s, v, i) => s + v * w[i + 1], w[0]);
  const sig = z => 1 / (1 + Math.exp(-z));
  const fitScaler = X => { const d = X[0].length, m = [], s = []; for (let j = 0; j < d; j++) { const c = X.map(r => r[j]); m.push(mean(c)); s.push(std(c)); } return { m, s }; };
  const scale = (x, sc) => x.map((v, j) => (v - sc.m[j]) / sc.s[j]);
  const rmse = (y, p) => Math.sqrt(mean(y.map((v, i) => (v - p[i]) ** 2)));
  const mae = (y, p) => mean(y.map((v, i) => Math.abs(v - p[i])));
  const r2 = (y, p) => { const m = mean(y); return 1 - y.reduce((s, v, i) => s + (v - p[i]) ** 2, 0) / y.reduce((s, v) => s + (v - m) ** 2, 0); };
  const corr = (a, b) => { const ma = mean(a), mb = mean(b); return a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / (a.length * std(a) * std(b)); };

  /* ---------- 4a. Linear Regression (ridge via normal equation) ---------- */
  function fitLin(X, y, lam = 0) {
    const d = X[0].length + 1, A = Array.from({ length: d }, () => Array(d).fill(0)), b = Array(d).fill(0);
    X.forEach((x, k) => { const z = [1, ...x]; for (let i = 0; i < d; i++) { b[i] += z[i] * y[k]; for (let j = 0; j < d; j++) A[i][j] += z[i] * z[j]; } });
    for (let i = 1; i < d; i++) A[i][i] += lam;
    return solve(A, b);
  }
  /* ---------- 4b. Logistic Regression (batch gradient descent, L2) ---------- */
  function fitLog(X, y, lr = .1, it = 300, lam = .01) {
    const d = X[0].length, w = Array(d + 1).fill(0), n = X.length;
    for (let t = 0; t < it; t++) {
      const g = Array(d + 1).fill(0);
      for (let k = 0; k < n; k++) { const e = sig(dot(w, X[k])) - y[k]; g[0] += e; for (let i = 0; i < d; i++) g[i + 1] += e * X[k][i]; }
      for (let i = 0; i <= d; i++) w[i] -= lr * (g[i] / n + (i ? lam * w[i] : 0));
    }
    return w;
  }
  function clsMetrics(y, p) {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    y.forEach((v, i) => { const q = p[i] >= .5 ? 1 : 0; if (v && q) tp++; else if (!v && !q) tn++; else if (!v && q) fp++; else fn++; });
    const acc = (tp + tn) / y.length, pr = tp / (tp + fp || 1), rc = tp / (tp + fn || 1);
    return { acc, pr, rc, f1: 2 * pr * rc / (pr + rc || 1), tp, tn, fp, fn };
  }
  const folds = (n, k) => { const idx = shuffle([...Array(n).keys()]); return Array.from({ length: k }, (_, f) => ({ te: idx.filter((_, i) => i % k === f), tr: idx.filter((_, i) => i % k !== f) })); };

  /* ---------- 4c. K-Means ---------- */
  const d2 = (a, b) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
  function kmeans(P, k, it = 40) {
    let C = [P[Math.floor(R() * P.length)]];
    while (C.length < k) { const d = P.map(p => Math.min(...C.map(c => d2(p, c)))); let r = R() * d.reduce((a, b) => a + b, 0), i = 0; for (; i < d.length - 1 && (r -= d[i]) > 0; i++); C.push(P[i]); }
    let a = [];
    for (let t = 0; t < it; t++) {
      a = P.map(p => { let b = 0, bd = Infinity; C.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); return b; });
      C = C.map((c, j) => { const m = P.filter((_, i) => a[i] === j); return m.length ? c.map((_, q) => mean(m.map(p => p[q]))) : c; });
    }
    return { C, a, inertia: P.reduce((s, p, i) => s + d2(p, C[a[i]]), 0) };
  }
  const bestKM = (P, k) => { let b; for (let i = 0; i < 5; i++) { const r = kmeans(P, k); if (!b || r.inertia < b.inertia) b = r; } return b; };

  /* ---------- 4d. KNN product recommender (collaborative, on category profiles) ---------- */
  const profile = bought => { const v = Array(6).fill(0); bought.forEach((b, i) => { if (b) v[PRODUCTS[i].cat]++; }); const s = v.reduce((a, b) => a + b, 0); return s ? v.map(x => x / s) : v; };
  function recommend(data, prof, owned, k, skipId, top = 3) {
    const nb = data.filter(d => d.id !== skipId).map(d => ({ d, dist: Math.sqrt(d2(prof, d.prof)) })).sort((a, b) => a.dist - b.dist).slice(0, k);
    const score = PRODUCTS.map(p => nb.reduce((s, n) => s + n.d.bought[p.id] / (1 + n.dist), 0));
    return PRODUCTS.filter(p => !owned.has(p.id)).map(p => ({ ...p, score: score[p.id] })).sort((a, b) => b.score - a.score).slice(0, top);
  }
  function knnHitRate(data, k) {
    let hit = 0, n = 0;
    data.forEach(c => {
      const own = c.bought.map((b, i) => b ? i : -1).filter(i => i >= 0);
      if (own.length < 2) return;
      const hid = own[0], rest = c.bought.map((b, i) => i === hid ? 0 : b);
      const rec = recommend(data, profile(rest), new Set(own.slice(1)), k, c.id);
      n++; if (rec.some(r => r.id === hid)) hit++;
    });
    return hit / n;
  }

  /* ---------- MAIN PIPELINE ---------- */
  let M = null;
  function run(seed = 42) {
    R = rng(seed);
    const raw = generate(), { data, report } = clean(raw);
    data.forEach(d => d.prof = profile(d.bought));
    const idx = shuffle(data.map((_, i) => i)), nT = Math.round(data.length * .2), te = idx.slice(0, nT), tr = idx.slice(nT);
    const X = data.map(feat), sc = fitScaler(tr.map(i => X[i])), Z = X.map(x => scale(x, sc));
    const Ztr = tr.map(i => Z[i]), Zte = te.map(i => Z[i]);
    const ys = data.map(d => d.spend), yb = data.map(d => d.buy);
    const ytr = tr.map(i => ys[i]), yte = te.map(i => ys[i]), btr = tr.map(i => yb[i]), bte = te.map(i => yb[i]);
    const F = folds(Ztr.length, 5);

    // Optimisation: hyper-parameters chosen by 5-fold cross-validation
    const cvLin = lam => mean(F.map(f => rmse(f.te.map(i => ytr[i]), f.te.map(i => dot(fitLin(f.tr.map(j => Ztr[j]), f.tr.map(j => ytr[j]), lam), Ztr[i])))));
    const cvLog = lr => mean(F.map(f => { const w = fitLog(f.tr.map(j => Ztr[j]), f.tr.map(j => btr[j]), lr); return clsMetrics(f.te.map(i => btr[i]), f.te.map(i => sig(dot(w, Ztr[i])))).acc; }));
    const lams = [0, 1, 10, 50, 100, 300, 1000], lrs = [.01, .02, .05, .1, .3, .5];
    const lamCV = lams.map(cvLin), lrCV = lrs.map(cvLog);
    const bestLam = lams[lamCV.indexOf(Math.min(...lamCV))], bestLr = lrs[lrCV.indexOf(Math.max(...lrCV))];

    const evalLin = w => { const p = Zte.map(z => dot(w, z)); return { r2: r2(yte, p), rmse: rmse(yte, p), mae: mae(yte, p), pred: p }; };
    const wBase = fitLin(Ztr, ytr, 0), wLin = fitLin(Ztr, ytr, bestLam);
    const linBase = evalLin(wBase), lin = evalLin(wLin);
    const wLogBase = fitLog(Ztr, btr, .02, 100), wLog = fitLog(Ztr, btr, bestLr, 300);
    const logBase = clsMetrics(bte, Zte.map(z => sig(dot(wLogBase, z)))), log = clsMetrics(bte, Zte.map(z => sig(dot(wLog, z))));

    // K-Means customer segmentation
    const segRaw = d => [d.spend, d.visits, d.past, d.income], SP = data.map(segRaw), ssc = fitScaler(SP), SZ = SP.map(p => scale(p, ssc));
    const elbow = [2, 3, 4, 5, 6].map(k => bestKM(SZ, k).inertia);
    const km = bestKM(SZ, 3);
    const order = [0, 1, 2].sort((a, b) => mean(data.filter((_, i) => km.a[i] === b).map(d => d.spend)) - mean(data.filter((_, i) => km.a[i] === a).map(d => d.spend)));
    const names = ['Premium', 'Regular', 'Occasional'], label = Array(3); order.forEach((c, r) => label[c] = names[r]);
    data.forEach((d, i) => d.segment = label[km.a[i]]);
    const segs = names.map(n => { const g = data.filter(d => d.segment === n); return { name: n, count: g.length, spend: mean(g.map(d => d.spend)), visits: mean(g.map(d => d.visits)), past: mean(g.map(d => d.past)), income: mean(g.map(d => d.income)) }; });

    // KNN optimisation
    const ks = [1, 3, 5, 10, 15, 25, 40], knnHits = ks.map(k => knnHitRate(data, k)), bestK = ks[knnHits.indexOf(Math.max(...knnHits))];
    const pop = PRODUCTS.map(p => data.filter(d => d.bought[p.id]).length);
    const popTop = [...PRODUCTS].sort((a, b) => pop[b.id] - pop[a.id]).slice(0, 3).map(p => p.id);
    let ph = 0, pn = 0; data.forEach(c => { const own = c.bought.map((b, i) => b ? i : -1).filter(i => i >= 0); if (own.length < 2) return; pn++; if (popTop.includes(own[0]) && !own.slice(1).some(o => popTop.includes(o) && false)) ph++; });
    const popHit = ph / pn;

    // 5-fold CV score of the final tuned models
    const cvFinal = { rmse: Math.min(...lamCV), acc: Math.max(...lrCV) };
    M = { raw, data, report, X, sc, wLin, wLog, ssc, km, label, segs, names, lin, linBase, log, logBase, te, tr, yte, bestLam, bestLr, bestK, lams, lamCV, lrs, lrCV, elbow, ks, knnHits, popHit, cvFinal, pop, corrs: FEATS.map((f, j) => corr(X.map(r => r[j]), ys)), seed };
    return M;
  }

  function predict(inp, interests, owned = []) {
    const x = [inp.age, inp.income, inp.visits, inp.pages, inp.cart, inp.past, inp.rating, inp.recency, inp.gender === 'Male' ? 1 : 0, inp.tier];
    const z = scale(x, M.sc), spend = Math.max(0, dot(M.wLin, z)), prob = sig(dot(M.wLog, z));
    const sp = scale([spend, inp.visits, inp.past, inp.income], M.ssc);
    let bj = 0, bd = Infinity; M.km.C.forEach((c, j) => { const d = d2(sp, c); if (d < bd) { bd = d; bj = j; } });
    let prof = Array(6).fill(0); if (interests.length) interests.forEach(c => prof[c] = 1 / interests.length);
    const recs = interests.length || owned.length ? recommend(M.data, owned.length ? profile(PRODUCTS.map(p => owned.includes(p.id) ? 1 : 0)) : prof, new Set(owned), M.bestK) : [];
    return { spend, prob, segment: M.label[bj], recs };
  }
  const get = () => M;
  const api = { run, predict, get, CATS, PRODUCTS, FEATS, FEAT_LABELS, mean };
  if (typeof module !== 'undefined') module.exports = api;
  return api;
})();
