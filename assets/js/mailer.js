/* =============================================================
   EvalAIH — chuyển tiếp dữ liệu form về email (site tĩnh, không backend)
   - Kênh chính theo EVALAI_CONFIG.MAIL_PROVIDER
   - Hàng đợi gửi lại (outbox) khi mất mạng / dịch vụ lỗi
   - Phương án dự phòng: mở ứng dụng email với nội dung soạn sẵn
============================================================= */
'use strict';

const Mailer = (() => {
  const C = window.EVALAI_CONFIG;
  const OUTBOX = 'evalaih.outbox.v1';
  const LAST = 'evalaih.lastSubmit.v1';

  function endpoint() {
    if (C.MAIL_PROVIDER === 'web3forms') return 'https://api.web3forms.com/submit';
    if (C.MAIL_PROVIDER === 'webhook') return C.KB_WEBHOOK_URL;
    return 'https://formsubmit.co/ajax/' + encodeURIComponent(C.FORMSUBMIT_ALIAS || C.RECIPIENT_EMAIL);
  }

  /** fields: object phẳng (hiển thị thành bảng trong email); payload: object JSON đầy đủ để nhập lại hệ thống. */
  function buildBody(kind, subject, fields, payload, replyTo) {
    const flat = {};
    Object.entries(fields).forEach(([k, v]) => {
      flat[k] = Array.isArray(v) ? v.join(', ') : (v === undefined || v === null || v === '' ? '—' : String(v));
    });
    flat['Lưu ý hệ thống'] = C.DISCLAIMER_VI;
    flat['payload_json'] = JSON.stringify(payload);
    if (C.MAIL_PROVIDER === 'web3forms') {
      return { access_key: C.WEB3FORMS_ACCESS_KEY, subject, from_name: 'EvalAIH ' + C.VERSION, replyto: replyTo || undefined, botcheck: '', ...flat };
    }
    if (C.MAIL_PROVIDER === 'webhook') {
      return { kind, subject, fields: flat, payload, sent_at: new Date().toISOString(), app_version: C.VERSION };
    }
    return { _subject: subject, _template: 'table', _captcha: 'false', _replyto: replyTo || undefined, ...flat };
  }

  async function post(body) {
    const isWebhook = C.MAIL_PROVIDER === 'webhook';
    const res = await U.fetchTimeout(endpoint(), {
      method: 'POST',
      headers: isWebhook ? { 'Content-Type': 'text/plain;charset=utf-8' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }, 15000);
    let data = {};
    try { data = await res.json(); } catch (e) { /* phản hồi không phải JSON */ }
    const ok = res.ok && (data.success === true || data.success === 'true' || isWebhook);
    if (!ok) {
      const msg = String(data.message || data.error || ('HTTP ' + res.status));
      const needsActivation = /activat/i.test(msg);
      const err = new Error(needsActivation
        ? 'Kênh email chưa được kích hoạt: chủ hộp thư ' + C.RECIPIENT_EMAIL + ' cần bấm "Activate Form" trong email từ FormSubmit. Dữ liệu đã được lưu chờ gửi lại.'
        : 'Dịch vụ gửi form trả lỗi: ' + msg);
      err.activation = needsActivation;
      throw err;
    }
    return data;
  }

  function cooldownLeft(kind) {
    const last = U.store.get(LAST, {})[kind] || 0;
    return Math.max(0, C.SUBMIT_COOLDOWN_MS - (Date.now() - last));
  }

  /**
   * Gửi một bản ghi. Trả về { ok, queued, ref, error }.
   * Dữ liệu luôn được lưu outbox trước, chỉ xóa khi dịch vụ xác nhận thành công.
   */
  async function send(kind, subject, fields, payload, replyTo) {
    const ref = payload.ref || U.uid(kind);
    const body = buildBody(kind, `${subject} · ${ref.slice(-8)}`, { 'Mã tham chiếu': ref, ...fields }, { ...payload, ref }, replyTo);
    const box = U.store.get(OUTBOX, []);
    box.push({ ref, kind, body, at: Date.now(), tries: 0 });
    U.store.set(OUTBOX, box);
    try {
      await post(body);
      removeFromOutbox(ref);
      const last = U.store.get(LAST, {}); last[kind] = Date.now(); U.store.set(LAST, last);
      return { ok: true, queued: false, ref };
    } catch (e) {
      markTry(ref);
      const env = envProblem();
      const msg = e.activation ? e.message : env ? env : (e.name === 'TypeError' || e.name === 'AbortError')
        ? 'Không kết nối được dịch vụ gửi form formsubmit.co (mạng cơ quan chặn, tường lửa hoặc trình chặn quảng cáo).' : e.message;
      return { ok: false, queued: true, ref, error: msg, activation: !!e.activation };
    }
  }

  function removeFromOutbox(ref) { U.store.set(OUTBOX, U.store.get(OUTBOX, []).filter((x) => x.ref !== ref)); }
  function markTry(ref) {
    const box = U.store.get(OUTBOX, []);
    box.forEach((x) => { if (x.ref === ref) x.tries++; });
    U.store.set(OUTBOX, box);
  }

  /** Gửi lại toàn bộ hàng đợi (gọi khi tải trang hoặc khi có mạng trở lại). */
  let flushing = false;
  async function flush() {
    if (flushing || !navigator.onLine) return 0;
    flushing = true;
    let sent = 0;
    try {
      for (const item of U.store.get(OUTBOX, [])) {
        if (item.tries > 8) continue;
        try { await post(item.body); removeFromOutbox(item.ref); sent++; } catch (e) { markTry(item.ref); if (e.activation) break; }
      }
    } finally { flushing = false; }
    if (sent) U.toast(`Đã gửi lại ${sent} bản ghi đang chờ.`, 'ok');
    document.dispatchEvent(new CustomEvent('outbox:change'));
    return sent;
  }

  const pending = () => U.store.get(OUTBOX, []).length;

  /** Liên kết mailto dự phòng (giới hạn độ dài để tương thích ứng dụng email). */
  function mailtoLink(subject, fields) {
    const lines = Object.entries(fields).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    lines.push('', 'Lưu ý: ' + C.DISCLAIMER_VI);
    let body = lines.join('\n');
    if (body.length > 1800) body = body.slice(0, 1800) + '\n…(đã rút gọn)';
    return `mailto:${C.RECIPIENT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /** Môi trường không gửi được form qua dịch vụ web (trả về thông báo, hoặc '' nếu ổn). */
  function envProblem() {
    if (location.protocol === 'file:') return 'Trang đang được mở trực tiếp từ file trên máy (file://). Dịch vụ gửi form chỉ hoạt động khi trang chạy trên web — hãy mở https://htsolutiontech.github.io/EVALAI/ hoặc chạy máy chủ cục bộ (python3 -m http.server).';
    if (!navigator.onLine) return 'Thiết bị đang mất kết nối Internet.';
    return '';
  }

  function plainText(subject, fields) {
    const lines = ['Tiêu đề: ' + subject, ''];
    Object.entries(fields).forEach(([k, v]) => lines.push(`${k}: ${Array.isArray(v) ? v.join(', ') : (v ?? '—')}`));
    lines.push('', 'Lưu ý: ' + C.DISCLAIMER_VI);
    return lines.join('\n');
  }

  /** Mở thẳng cửa sổ soạn thư Gmail trên web (không cần ứng dụng email trên máy). */
  function gmailLink(subject, fields) {
    let body = plainText(subject, fields);
    if (body.length > 1800) body = body.slice(0, 1800) + '\n…(đã rút gọn — dùng nút Sao chép để lấy đầy đủ)';
    return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(C.RECIPIENT_EMAIL)
      + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  /** Gửi bằng form HTML chuẩn (không qua fetch) tới trang FormSubmit ở tab mới — vượt được lỗi CORS / trình chặn script. */
  function postViaPage(subject, fields) {
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = 'https://formsubmit.co/' + encodeURIComponent(C.FORMSUBMIT_ALIAS || C.RECIPIENT_EMAIL);
    f.target = '_blank';
    f.acceptCharset = 'UTF-8';
    f.style.display = 'none';
    const add = (n, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = String(v ?? ''); f.appendChild(i); };
    add('_subject', subject); add('_template', 'table'); add('_captcha', 'false');
    Object.entries(fields).forEach(([k, v]) => add(k, Array.isArray(v) ? v.join(', ') : v));
    add('Lưu ý hệ thống', C.DISCLAIMER_VI);
    document.body.appendChild(f); f.submit(); f.remove();
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* rơi xuống cách dự phòng */ }
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove(); return ok;
  }

  window.addEventListener('online', flush);
  return { send, flush, pending, mailtoLink, gmailLink, postViaPage, plainText, copyText, envProblem, cooldownLeft };
})();
