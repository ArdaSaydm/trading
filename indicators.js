window.SV = window.SV || {};

SV.ind = (() => {
  const sma = (a, n) => {
    const o = new Array(a.length).fill(null);
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      s += a[i];
      if (i >= n) s -= a[i - n];
      if (i >= n - 1) o[i] = s / n;
    }
    return o;
  };

  const ema = (a, n) => {
    const o = [], k = 2 / (n + 1);
    let e = a[0];
    for (let i = 0; i < a.length; i++) {
      e = i ? a[i] * k + e * (1 - k) : a[0];
      o.push(e);
    }
    return o;
  };

  const stdev = (a, n, mean) => a.map((_, i) => {
    if (mean[i] == null) return null;
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (a[j] - mean[i]) ** 2;
    return Math.sqrt(s / n);
  });

  const rsi = (c, n = 14) => {
    const o = new Array(c.length).fill(null);
    let ag = 0, al = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1], g = Math.max(d, 0), l = Math.max(-d, 0);
      if (i <= n) {
        ag += g / n; al += l / n;
        if (i < n) continue;
      } else {
        ag = (ag * (n - 1) + g) / n;
        al = (al * (n - 1) + l) / n;
      }
      o[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return o;
  };

  const atr = (bars, n = 14) => {
    const o = [];
    let a = 0;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i], pc = i ? bars[i - 1].c : b.c;
      const tr = Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
      a = i < n ? (a * i + tr) / (i + 1) : (a * (n - 1) + tr) / n;
      o.push(a);
    }
    return o;
  };

  const macd = c => {
    const e12 = ema(c, 12), e26 = ema(c, 26);
    const line = c.map((_, i) => e12[i] - e26[i]);
    const sig = ema(line, 9);
    return { line, sig, hist: line.map((x, i) => x - sig[i]) };
  };

  const pivots = (bars, L) => {
    const highs = [], lows = [];
    for (let i = L; i < bars.length - L; i++) {
      let hi = true, lo = true;
      for (let j = i - L; j <= i + L && (hi || lo); j++) {
        if (j === i) continue;
        if (j < i ? bars[j].h >= bars[i].h : bars[j].h > bars[i].h) hi = false;
        if (j < i ? bars[j].l <= bars[i].l : bars[j].l < bars[i].l) lo = false;
      }
      if (hi) highs.push({ i, p: bars[i].h, kind: 'h' });
      if (lo) lows.push({ i, p: bars[i].l, kind: 'l' });
    }
    return { highs, lows };
  };

  const median = a => {
    const s = a.filter(x => x != null).sort((x, y) => x - y);
    return s.length ? s[s.length >> 1] : null;
  };

  return { sma, ema, stdev, rsi, atr, macd, pivots, median };
})();

SV.prec = p => p >= 1000 ? 2 : p >= 10 ? 3 : p >= 1 ? 4 : p >= 0.01 ? 5 : 7;
SV.fmt = p => {
  const d = SV.prec(Math.abs(p));
  return p.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
SV.pct = x => `${x >= 0 ? '+' : ''}${x.toFixed(2).replace('.', ',')}%`;
