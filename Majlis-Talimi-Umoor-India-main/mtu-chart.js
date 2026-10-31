/* Majlis Talimi Umoor - shared bar chart + downloadable poster image.
   Used by index.html, shoba-qirat dashboard and academic inspector dashboard. */
(function () {
  'use strict';
  var PAL = [
    ['#6366f1', '#4338ca'], ['#14b8a6', '#0f766e'], ['#f59e0b', '#b45309'], ['#ef4444', '#b91c1c'],
    ['#8b5cf6', '#6d28d9'], ['#06b6d4', '#0e7490'], ['#84cc16', '#4d7c0f'], ['#ec4899', '#be185d'],
    ['#f97316', '#c2410c'], ['#0ea5e9', '#0369a1']
  ];
  var MEDAL = [['#fde68a', '#b45309', '#fbbf24'], ['#f3f4f6', '#4b5563', '#d1d5db'], ['#fdba74', '#7c2d12', '#fb923c']];
  var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var KIND = { jaiza: 'Jaiza Results', test: 'Monthly Test Results' };
  var profile = null;

  function monthText(v) {
    if (/^\d{4}-\d{2}$/.test(v || '')) { var p = v.split('-'); return MN[+p[1] - 1] + ' ' + p[0]; }
    return v || '';
  }
  function prettyRegion(r) {
    r = String(r || '').trim();
    if (!r || r === 'N/A' || r === 'Loading...') return 'Majlis Talimi Umoor';
    if (/^[a-z0-9_ -]+$/.test(r) && r.indexOf('_') > -1) r = r.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    return r;
  }
  function regionOf(p) { p = p || profile || {}; return prettyRegion(p.zimmedari || p.region || p.state || p.role); }
  function fmt(v) { v = +v || 0; return (Math.round(v * 10) / 10) + '%'; }

  /* stable colour per jamia: alphabetical position */
  function colorMap(labels) {
    var s = labels.slice().sort(function (a, b) { return String(a).localeCompare(String(b)); }), m = {};
    s.forEach(function (l, i) { m[l] = PAL[i % PAL.length]; });
    return m;
  }

  var deco = {
    id: 'mtuDeco',
    beforeDatasetsDraw: function (chart) {
      var ctx = chart.ctx; ctx.save();
      ctx.shadowColor = 'rgba(15,23,42,0.30)'; ctx.shadowBlur = 14; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 6;
    },
    afterDatasetsDraw: function (chart) {
      chart.ctx.restore();
      var ctx = chart.ctx, meta = chart.getDatasetMeta(0), ds = chart.data.datasets[0], base = chart.scales.y.getPixelForValue(0);
      ctx.save();
      meta.data.forEach(function (bar, i) {
        var v = +ds.data[i] || 0; if (!(v > 0)) return;
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = (ds._dark && ds._dark[i]) || '#374151'; ctx.font = '700 12px Poppins, sans-serif';
        ctx.fillText(fmt(v), bar.x, bar.y - 6);
        if (i < 3) {
          var r = Math.max(8, Math.min(14, (bar.width || 30) / 2 - 3)), cy = base - r - 6, c = MEDAL[i];
          var g = ctx.createLinearGradient(bar.x, cy - r, bar.x, cy + r); g.addColorStop(0, c[0]); g.addColorStop(1, c[2]);
          ctx.beginPath(); ctx.arc(bar.x, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = c[1]; ctx.stroke();
          ctx.fillStyle = c[1]; ctx.font = '700 ' + Math.round(r * 1.1) + 'px Poppins, sans-serif'; ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), bar.x, cy + 1);
        }
      });
      ctx.restore();
    }
  };

  function mount(id, o) {
    var cv = document.getElementById(id);
    if (!cv || typeof Chart === 'undefined') return null;
    var old = Chart.getChart(cv); if (old) old.destroy();
    var pairs = (o.labels || []).map(function (l, i) { return { l: l, v: parseFloat(o.values[i]) || 0 }; })
      .sort(function (a, b) { return b.v - a.v; });
    var cm = colorMap(pairs.map(function (p) { return p.l; }));
    var ch = new Chart(cv.getContext('2d'), {
      type: 'bar',
      data: {
        labels: pairs.map(function (p) { return p.l; }),
        datasets: [{
          label: KIND[o.kind] || 'Performance',
          data: pairs.map(function (p) { return p.v; }),
          backgroundColor: function (cx) {
            var a = cx.chart.chartArea, pr = cm[pairs[cx.dataIndex] && pairs[cx.dataIndex].l] || PAL[0];
            if (!a) return pr[0];
            var g = cx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, pr[0]); g.addColorStop(1, pr[1]); return g;
          },
          _dark: pairs.map(function (p) { return cm[p.l][1]; }),
          borderRadius: { topLeft: 10, topRight: 10 }, borderSkipped: false, barPercentage: 0.62, categoryPercentage: 0.9
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 24 } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Poppins, sans-serif', size: 11, weight: '600' }, color: '#374151', maxRotation: 55, minRotation: 0, autoSkip: false } },
          y: { beginAtZero: true, max: 100, ticks: { stepSize: 20, color: '#6b7280' }, grid: { color: '#eef2f7' } }
        },
        plugins: { legend: { display: false }, title: { display: false }, datalabels: { display: false }, tooltip: { callbacks: { label: function (c) { return fmt(c.parsed.y); } } } }
      },
      plugins: [deco]
    });
    ch.$mtuKind = o.kind;
    return ch;
  }

  /* ---------- poster (downloadable image) ---------- */
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function fit(x, text, font, maxW, size) { do { x.font = font.replace('{s}', size); size -= 2; } while (x.measureText(text).width > maxW && size > 14); return x.font; }
  function skyline(x, W, H) {
    x.save(); x.fillStyle = 'rgba(13,148,136,0.09)';
    [[40, 1], [W - 40, -1]].forEach(function (s) {
      var bx = s[0], d = s[1];
      for (var i = 0; i < 4; i++) {
        var cx = bx + d * i * 70, w = 46 + (i % 2) * 14, h = 90 + ((i * 37) % 70);
        x.fillRect(cx - w / 2, H - h, w, h);
        x.beginPath(); x.arc(cx, H - h, w / 2, Math.PI, 0); x.fill();
        x.fillRect(cx - 3, H - h - w / 2 - 22, 6, 22);
      }
    });
    x.restore();
  }
  function iconAvg(x, cx, cy) { x.save(); x.strokeStyle = '#0f766e'; x.lineWidth = 5; rr(x, cx - 26, cy - 34, 52, 68, 8); x.stroke(); x.beginPath(); [-14, 0, 14].forEach(function (d) { x.moveTo(cx - 14, cy + d); x.lineTo(cx + 14, cy + d); }); x.stroke(); x.restore(); }
  function iconBars(x, cx, cy) { x.save(); x.fillStyle = '#0f766e'; [[-26, 20], [-6, 40], [14, 62]].forEach(function (b) { rr(x, cx + b[0], cy + 32 - b[1], 16, b[1], 4); x.fill(); }); x.restore(); }
  function iconPeople(x, cx, cy) { x.save(); x.fillStyle = '#1d6fa5'; [[-26, 8, 13], [0, -4, 17], [26, 8, 13]].forEach(function (p) { x.beginPath(); x.arc(cx + p[0], cy + p[1] - 10, p[2], 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(cx + p[0], cy + p[1] + 22, p[2] * 1.5, Math.PI, 0); x.fill(); }); x.restore(); }

  function poster(items, o) {
    var n = items.length || 1, W = Math.max(1600, n * 135 + 320), H = 1110;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d7eefb'); g.addColorStop(1, '#eafaf5');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    skyline(x, W, H);
    x.textAlign = 'center'; x.textBaseline = 'middle';

    var kindText = KIND[o.kind] || 'Results';
    // title
    var tf = fit(x, o.region, '700 {s}px Poppins, sans-serif', W - 360, 80);
    var tw = Math.min(W - 160, x.measureText(o.region).width + 150);
    rr(x, (W - tw) / 2, 36, tw, 124, 62); x.fillStyle = '#1e3a8a'; x.fill();
    x.fillStyle = '#fff'; x.font = tf; x.fillText(o.region, W / 2, 99);
    // subtitle
    var st = n + ' Jamiaat ' + kindText;
    var sf = fit(x, st, '700 {s}px Poppins, sans-serif', W - 400, 54);
    var sw = Math.min(W - 200, x.measureText(st).width + 120);
    rr(x, (W - sw) / 2, 176, sw, 92, 46); x.fillStyle = '#fff7e3'; x.fill();
    x.fillStyle = '#1e3a8a'; x.font = sf; x.fillText(st, W / 2, 223);
    // month
    var mf = '700 40px Poppins, sans-serif'; x.font = mf;
    var mw = x.measureText(o.monthText || '').width + 110;
    rr(x, (W - mw) / 2, 284, mw, 66, 33); x.fillStyle = '#0f766e'; x.fill();
    x.fillStyle = '#fff'; x.fillText(o.monthText || '', W / 2, 318);

    // chart card
    var cx0 = 40, cy0 = 372, cw = W - 80, ch = 470;
    rr(x, cx0, cy0, cw, ch, 34); x.fillStyle = 'rgba(255,255,255,0.88)'; x.fill();
    var L = 140, R = W - 90, T = 420, B = 730;
    x.font = '600 22px Poppins, sans-serif'; x.textAlign = 'right'; x.fillStyle = '#4b5563'; x.strokeStyle = '#e3e9f1'; x.lineWidth = 2;
    for (var v = 0; v <= 100; v += 10) {
      var yy = B - (v / 100) * (B - T);
      x.beginPath(); x.moveTo(L - 16, yy); x.lineTo(R, yy); x.stroke(); x.fillText(String(v), L - 28, yy);
    }
    var slot = (R - L) / n, bw = Math.min(140, slot * 0.62);
    items.forEach(function (it, i) {
      var cxm = L + slot * i + slot / 2, h = Math.max(0, (it.v / 100) * (B - T)), top = B - h;
      if (h > 0) {
        var bg = x.createLinearGradient(0, top, 0, B); bg.addColorStop(0, it.c[0]); bg.addColorStop(1, it.c[1]);
        x.save(); x.shadowColor = 'rgba(15,23,42,0.28)'; x.shadowBlur = 22; x.shadowOffsetY = 10; x.fillStyle = bg; x.beginPath(); x.moveTo(cxm - bw / 2, B); x.lineTo(cxm - bw / 2, top + 16); x.arcTo(cxm - bw / 2, top, cxm - bw / 2 + 16, top, 16); x.lineTo(cxm + bw / 2 - 16, top); x.arcTo(cxm + bw / 2, top, cxm + bw / 2, top + 16, 16); x.lineTo(cxm + bw / 2, B); x.closePath(); x.fill(); x.restore();
        x.textAlign = 'center'; x.fillStyle = it.c[1]; x.font = '700 34px Poppins, sans-serif'; x.fillText(fmt(it.v), cxm, top - 22);
        if (i < 3) {
          var m = MEDAL[i], r = Math.min(34, bw / 2 - 4), my = B - r - 10;
          var mg = x.createLinearGradient(cxm, my - r, cxm, my + r); mg.addColorStop(0, m[0]); mg.addColorStop(1, m[2]);
          x.beginPath(); x.arc(cxm, my, r, 0, Math.PI * 2); x.fillStyle = mg; x.fill(); x.lineWidth = 3; x.strokeStyle = m[1]; x.stroke();
          x.fillStyle = m[1]; x.font = '700 ' + Math.round(r * 1.15) + 'px Poppins, sans-serif'; x.fillText(String(i + 1), cxm, my + 2);
        }
      } else {
        x.textAlign = 'center'; x.fillStyle = '#9ca3af'; x.font = '700 28px Poppins, sans-serif'; x.fillText('-', cxm, B - 20);
      }
      // name pill
      var pw = Math.min(slot - 14, 190), pf = fit(x, it.l, '700 {s}px Poppins, sans-serif', pw - 16, 28);
      rr(x, cxm - pw / 2, B + 22, pw, 54, 16); x.fillStyle = it.c[0] + '2e'; x.fill();
      x.fillStyle = it.c[1]; x.font = pf; x.textAlign = 'center'; x.fillText(/^[\x00-\x7f]*$/.test(String(it.l)) ? String(it.l).toUpperCase() : String(it.l), cxm, B + 50);
    });

    // footer cards
    var vals = items.map(function (i) { return i.v; }).filter(function (v) { return v > 0; });
    var avg = vals.length ? vals.reduce(function (a, b) { return a + b; }, 0) / vals.length : 0;
    var top1 = items.length ? items[0] : { l: '-', v: 0 };
    var cards = [
      { icon: iconAvg, label: 'Average', big: fmt(avg), cap: 'OVERALL PERFORMANCE', color: '#0f766e', pill: '#dcfce7' },
      { icon: iconBars, label: 'Highest', big: fmt(top1.v), cap: String(top1.l).toUpperCase(), color: '#0f766e', pill: '#dcfce7' },
      { icon: iconPeople, label: 'Total', big: String(n), cap: 'JAMIAAT', color: '#1d6fa5', pill: '#dbeafe' }
    ];
    var gap = 22, fw = (cw - gap * 2) / 3, fy = 868, fh = 190;
    cards.forEach(function (c, i) {
      var fx = cx0 + i * (fw + gap);
      rr(x, fx, fy, fw, fh, 30); x.fillStyle = 'rgba(255,255,255,0.9)'; x.fill();
      c.icon(x, fx + 90, fy + 92);
      x.textAlign = 'left'; x.fillStyle = '#1f2937'; x.font = '700 38px Poppins, sans-serif'; x.fillText(c.label, fx + 170, fy + 48);
      x.fillStyle = c.color; x.font = '700 74px Poppins, sans-serif'; x.fillText(c.big, fx + 170, fy + 112);
      var cf = fit(x, c.cap, '600 {s}px Poppins, sans-serif', fw - 210, 26), pw2 = Math.min(fw - 200, x.measureText(c.cap).width + 44);
      rr(x, fx + 170, fy + 146, pw2, 34, 17); x.fillStyle = c.pill; x.fill();
      x.fillStyle = c.color; x.font = cf; x.textAlign = 'center'; x.fillText(c.cap, fx + 170 + pw2 / 2, fy + 164);
    });
    return cv;
  }

  function download(id, o) {
    o = o || {};
    var chart = (typeof Chart !== 'undefined') && Chart.getChart(document.getElementById(id));
    if (!chart) { alert('Chart abhi load nahi hua.'); return; }
    var kind = o.kind || chart.$mtuKind || 'jaiza';
    var labels = chart.data.labels, data = chart.data.datasets[0].data;
    var cm = colorMap(labels.slice());
    var items = labels.map(function (l, i) { return { l: l, v: +data[i] || 0, c: cm[l] }; }).sort(function (a, b) { return b.v - a.v; });
    var region = o.region ? prettyRegion(o.region) : regionOf();
    var mt = monthText(o.monthText || o.month);
    var fonts = ['700 40px Poppins', '600 28px Poppins'];
    var wait = (document.fonts && document.fonts.load) ? Promise.all(fonts.map(function (f) { return document.fonts.load(f).catch(function () {}); })) : Promise.resolve();
    wait.then(function () {
      var cv = poster(items, { kind: kind, region: region, monthText: mt });
      var a = document.createElement('a');
      a.download = (region + '_' + (KIND[kind] || 'Results') + '_' + mt).replace(/[^\w\u0600-\u06FF-]+/g, '_') + '.png';
      a.href = cv.toDataURL('image/png');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });
  }

  window.MTUChart = { _poster: poster, mount: mount, download: download, monthText: monthText, setProfile: function (p) { profile = p; }, region: regionOf };
})();
