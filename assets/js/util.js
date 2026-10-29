/* =============================================================
   EvalAIH — tiện ích dùng chung (không phụ thuộc thư viện ngoài)
============================================================= */
'use strict';

const U = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Thoát HTML cho mọi chuỗi do người dùng nhập trước khi đưa vào innerHTML. */
  const esc = (v) => String(v ?? '').replace(/[&<>"'`]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
  }[c]));

  const uid = (prefix = 'id') => {
    const r = (crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(2)) : [Math.random() * 1e9, Date.now()]);
    return `${prefix}-${Date.now().toString(36)}-${Array.from(r).map((n) => n.toString(36)).join('')}`.slice(0, 32);
  };

  async function sha256(text) {
    if (!crypto.subtle) return 'nohash-' + String(text).length;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Bỏ dấu tiếng Việt + chữ thường để so khớp từ khóa. */
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

  const STOP = new Set(('va la cua cho cac nhung mot the nay do voi trong khi duoc bi tai tu den o thi ma neu vi nen cung da se dang co khong rat hon nhat ' +
    'the a an of to in on for and or is are be by with as at from that this it its was were has have can will may').split(' '));

  const tokens = (s) => norm(s).replace(/[^a-z0-9%./ -]/g, ' ').split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

  /** Độ tương đồng: tỷ lệ từ khóa của mẫu xuất hiện trong văn bản (containment), ổn định hơn Jaccard với câu dài. */
  function containment(patternText, targetText) {
    const p = new Set(tokens(patternText));
    if (!p.size) return 0;
    const t = new Set(tokens(targetText));
    let hit = 0;
    p.forEach((x) => { if (t.has(x)) hit++; });
    return hit / p.size;
  }

  /* ---------- Phát hiện thông tin định danh người bệnh (Luật 91/2025/QH15) ---------- */
  const PII_RULES = [
    { label: 'Email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { label: 'Số điện thoại', re: /(?:\+?84|0)(?:3|5|7|8|9)\d{8}\b/g },
    { label: 'Số CCCD/CMND', re: /\b\d{12}\b|\b\d{9}\b/g },
    { label: 'Mã thẻ BHYT', re: /\b[A-Z]{2}\d{13}\b/g },
    { label: 'Mã bệnh án / mã người bệnh', re: /(m[aã]\s*(b[eệ]nh\s*[aá]n|BA|BN|b[eệ]nh\s*nh[aâ]n)|s[oố]\s*b[eệ]nh\s*[aá]n|PID|MRN)\s*[:#]?\s*[A-Z0-9-]{3,}/gi },
    { label: 'Ngày sinh', re: /(ng[aà]y\s*sinh|sinh\s*ng[aà]y|DOB|date of birth)\s*[:]?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/gi },
    { label: 'Họ tên người bệnh', re: /(?:^|[\s,;:("“])(?:[Bb][eệ]nh\s*nh[aâ]n|BN|[Nn]g[uư][oờ]i\s*b[eệ]nh|[OoÔô]ng|[Bb][aà]|[Cc]h[aá]u)\s+[A-ZĐÂĂÊÔƠƯÁÀẢÃẠ][a-zà-ỹ]+(\s+[A-ZĐÂĂÊÔƠƯÁÀẢÃẠ][a-zà-ỹ]+){1,3}/g },
  ];
  function detectPII(text) {
    const found = [];
    const s = String(text || '');
    PII_RULES.forEach(({ label, re }) => {
      re.lastIndex = 0;
      const m = s.match(re);
      if (m) { const x = m[0].replace(/^[^\p{L}\p{N}+]+/u, ''); found.push({ label, sample: x.slice(0, 24) + (x.length > 24 ? '…' : ''), count: m.length }); }
    });
    return found;
  }

  /* ---------- localStorage an toàn ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) {
        toast('Không lưu được vào bộ nhớ trình duyệt (đầy hoặc bị chặn).', 'err'); return false;
      }
    },
  };

  async function fetchTimeout(url, opts = {}, ms = 8000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctl.signal }); } finally { clearTimeout(t); }
  }

  function download(filename, text, mime = 'application/json') {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('vi-VN'); } catch (e) { return iso; } };
  const today = () => new Date().toISOString().slice(0, 10);

  let toastTimer;
  function toast(msg, kind = 'ok', ms = 4200) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.className = 'toast show ' + kind;
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast ' + kind; }, ms);
  }

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  return { $, $$, esc, uid, sha256, norm, tokens, containment, detectPII, store, fetchTimeout, download, fmtDate, today, toast, debounce };
})();
