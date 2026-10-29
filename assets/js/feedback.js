/* =============================================================
   EvalAIH — Form góp ý & đánh giá của các bên liên quan
============================================================= */
'use strict';

const Feedback = (() => {
  const C = window.EVALAI_CONFIG;
  const HIST = 'evalaih.feedback.history.v1';
  const CRITERIA = [
    ['need', 'Mức độ cần thiết với đơn vị'],
    ['usability', 'Tính dễ sử dụng'],
    ['trust', 'Độ tin cậy, minh bạch của kết quả'],
    ['feasible', 'Khả năng triển khai tại đơn vị'],
    ['compliance', 'Hỗ trợ tuân thủ pháp lý (Luật AI, dữ liệu cá nhân)'],
  ];
  const state = { ratings: {}, nps: null, startedAt: Date.now() };

  function stars(key, label) {
    return `<div class="rating" role="radiogroup" aria-label="${U.esc(label)}" data-key="${key}">
      <span class="rt-l">${U.esc(label)}</span>
      <span class="rt-s">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${n} điểm" data-v="${n}">★</button>`).join('')}</span>
      <span class="rt-v" aria-hidden="true">—</span></div>`;
  }

  function paintRating(group, v) {
    U.$$('button', group).forEach((b) => { const on = Number(b.dataset.v) <= v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(Number(b.dataset.v) === v)); });
    U.$('.rt-v', group).textContent = v ? v + '/5' : '—';
  }

  function init() {
    U.$('#fbRatings').innerHTML = CRITERIA.map(([k, l]) => stars(k, l)).join('');
    U.$('#fbRatings').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      const g = b.closest('.rating'); const v = Number(b.dataset.v);
      state.ratings[g.dataset.key] = state.ratings[g.dataset.key] === v ? 0 : v;
      paintRating(g, state.ratings[g.dataset.key]);
    });
    U.$('#fbNps').innerHTML = Array.from({ length: 11 }, (_, i) => `<button type="button" role="radio" aria-checked="false" data-n="${i}">${i}</button>`).join('');
    U.$('#fbNps').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-n]'); if (!b) return;
      state.nps = Number(b.dataset.n);
      U.$$('#fbNps button').forEach((x) => { const on = Number(x.dataset.n) === state.nps; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
    });
    const msg = U.$('#fbMsg');
    msg.addEventListener('input', () => { U.$('#fbCount').textContent = msg.value.length.toLocaleString('vi-VN'); });
    U.$('#fbForm').addEventListener('submit', onSubmit);
    renderHistory();
    document.addEventListener('outbox:change', renderHistory);
    const env = Mailer.envProblem();
    if (env) {
      const n = document.createElement('div'); n.className = 'notice err'; n.setAttribute('role', 'alert');
      n.innerHTML = '<b>Kênh gửi tự động không khả dụng:</b> ' + U.esc(env) + ' Bạn vẫn có thể điền form — hệ thống sẽ đưa ra cách gửi thay thế.';
      U.$('#fbForm').prepend(n);
    }
  }

  function prefill({ topic, msg }) {
    if (topic) U.$('#fbTopic').value = topic;
    if (msg) { U.$('#fbMsg').value = msg; U.$('#fbMsg').dispatchEvent(new Event('input')); }
    setTimeout(() => U.$('#fbMsg').focus(), 300);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target, st = U.$('#fbStatus');
    // chống bot: trường ẩn + thời gian điền quá nhanh
    if (U.$('#fbHoney').value || Date.now() - state.startedAt < 3000) { st.textContent = 'Không gửi được. Vui lòng thử lại.'; return; }
    U.$$('.invalid', f).forEach((x) => x.classList.remove('invalid'));
    const bad = U.$$('input[required],select[required],textarea[required]', f).filter((x) => (x.type === 'checkbox' ? !x.checked : !x.checkValidity()));
    const phone = U.$('#fbPhone');
    if (phone.value && !phone.checkValidity()) bad.push(phone);
    if (bad.length) {
      bad.forEach((x) => x.classList.add('invalid'));
      bad[0].focus();
      U.toast('Vui lòng kiểm tra các trường được đánh dấu.', 'err'); return;
    }
    const msgText = U.$('#fbMsg').value.trim();
    const pii = U.detectPII(msgText.replace(U.$('#fbEmail').value, '').replace(phone.value, ''));
    const box = U.$('#fbPii');
    if (pii.some((p) => p.label !== 'Email' && p.label !== 'Số điện thoại')) {
      box.hidden = false;
      box.innerHTML = `<b>Nội dung có thể chứa thông tin người bệnh:</b> ${pii.map((p) => U.esc(p.label)).join(', ')}. Vui lòng bỏ các thông tin này trước khi gửi.`;
      return;
    }
    box.hidden = true;
    const wait = Mailer.cooldownLeft('feedback');
    if (wait) { U.toast(`Bạn vừa gửi góp ý. Vui lòng chờ ${Math.ceil(wait / 1000)} giây.`, 'warn'); return; }

    const data = {
      name: U.$('#fbName').value.trim(), email: U.$('#fbEmail').value.trim(), phone: phone.value.trim(), org: U.$('#fbOrg').value.trim(),
      role: U.$('#fbRole').value, topic: U.$('#fbTopic').value, ratings: { ...state.ratings }, nps: state.nps,
      message: msgText, wants_contact: U.$('#fbContact').checked, consent: true,
      page: location.href.split('#')[0], lang: navigator.language, submitted_at: new Date().toISOString(), app_version: C.VERSION,
    };
    const rated = Object.values(data.ratings).filter(Boolean);
    const avg = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : '—';
    const fields = {
      'Họ tên': data.name, 'Email': data.email, 'Điện thoại': data.phone, 'Tổ chức': data.org, 'Vai trò': data.role, 'Chủ đề': data.topic,
      ...Object.fromEntries(CRITERIA.map(([k, l]) => [l, data.ratings[k] ? data.ratings[k] + '/5' : '—'])),
      'Điểm trung bình': avg, 'Điểm giới thiệu (0–10)': data.nps ?? '—', 'Nội dung': data.message,
      'Muốn được liên hệ': data.wants_contact ? 'Có' : 'Không', 'Thời điểm gửi': U.fmtDate(data.submitted_at), 'Trang': data.page,
    };
    const btn = U.$('#fbSubmit');
    btn.disabled = true; st.textContent = 'Đang gửi…';
    const subject = `[EvalAIH] Góp ý — ${data.topic} — ${data.role} — ${data.name}`;
    const res = await Mailer.send('feedback', subject, fields, { type: 'feedback', ...data }, data.email);
    btn.disabled = false; st.textContent = '';
    const hist = U.store.get(HIST, []);
    hist.unshift({ ref: res.ref, at: data.submitted_at, topic: data.topic, ok: res.ok });
    U.store.set(HIST, hist.slice(0, 20));
    done(res, { 'Mã tham chiếu': res.ref, ...fields }, subject);
    renderHistory();
  }

  function done(res, fields, subject) {
    const el = U.$('#fbDone');
    el.hidden = false;
    el.className = 'panel ' + (res.ok ? 'done-ok' : 'done-warn');
    if (res.ok) {
      el.innerHTML = `<h2 class="ph">Cảm ơn bạn đã góp ý</h2><p>Góp ý đã được chuyển tới đội ngũ HealthV. Mã tham chiếu: <code>${U.esc(res.ref)}</code>.</p>
        <button class="btn-ghost" type="button" data-fb="again">Gửi góp ý khác</button>`;
    } else {
      el.innerHTML = `<h2 class="ph">Góp ý đã được lưu nhưng chưa gửi tự động được</h2>
        <p class="notice err">${U.esc(res.error || 'Không kết nối được dịch vụ gửi form.')}</p>
        <p>Chọn <b>một</b> trong các cách dưới đây để gửi ngay (dữ liệu đã điền sẵn):</p>
        <ol class="fb-alt">
          <li><button class="btn-main" type="button" data-fb="page">① Gửi qua trang FormSubmit</button>
            <span class="hint">Mở tab mới và gửi trực tiếp. Lần đầu, chủ hộp thư ${U.esc(C.RECIPIENT_EMAIL)} phải bấm “Activate Form” trong email FormSubmit gửi tới.</span></li>
          <li><a class="btn-ghost" target="_blank" rel="noopener" href="${Mailer.gmailLink(subject, fields)}">② Mở Gmail soạn sẵn</a>
            <span class="hint">Gmail mở cửa sổ soạn thư đã điền người nhận và nội dung — <b>bạn cần bấm nút “Gửi” trong Gmail</b>.</span></li>
          <li><button class="btn-ghost" type="button" data-fb="copy">③ Sao chép nội dung</button>
            <span class="hint">Dán vào email, Zalo hoặc bất kỳ kênh nào gửi tới ${U.esc(C.RECIPIENT_EMAIL)}.</span></li>
          <li><a class="btn-ghost" href="${Mailer.mailtoLink(subject, fields)}">④ Ứng dụng email trên máy</a>
            <span class="hint">Chỉ hoạt động khi máy đã cài Outlook / Mail / Thunderbird.</span></li>
        </ol>
        <p class="hint">Hệ thống vẫn tự thử gửi lại khi kết nối được. Mã tham chiếu: <code>${U.esc(res.ref)}</code></p>
        <div class="actions"><button class="btn-ghost" type="button" data-fb="retry">⟳ Thử gửi tự động lại</button>
        <button class="btn-ghost" type="button" data-fb="again">Gửi góp ý khác</button></div>`;
    }
    U.$('#fbForm').hidden = true;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-fb]'); if (!b) return;
      const act = b.dataset.fb;
      if (act === 'again') reset();
      else if (act === 'page') { Mailer.postViaPage(subject, fields); U.toast('Đã mở tab FormSubmit. Nếu trang báo cần kích hoạt, kiểm tra hộp thư ' + C.RECIPIENT_EMAIL + '.', 'ok', 7000); }
      else if (act === 'copy') { const ok = await Mailer.copyText(Mailer.plainText(subject, fields)); U.toast(ok ? 'Đã sao chép nội dung góp ý.' : 'Trình duyệt không cho sao chép — hãy dùng cách ② hoặc ①.', ok ? 'ok' : 'err'); }
      else if (act === 'retry') {
        b.disabled = true; const n = await Mailer.flush(); b.disabled = false;
        if (n) { el.innerHTML = `<h2 class="ph">Đã gửi thành công</h2><p>Góp ý đã được chuyển tới HealthV.</p><button class="btn-ghost" type="button" data-fb="again">Gửi góp ý khác</button>`; el.className = 'panel done-ok'; }
        else U.toast(Mailer.envProblem() || 'Vẫn chưa kết nối được dịch vụ — hãy dùng cách ① hoặc ②.', 'warn', 6000);
      }
    };
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.dispatchEvent(new CustomEvent('outbox:change'));
  }

  function reset() {
    U.$('#fbForm').reset(); U.$('#fbForm').hidden = false; U.$('#fbDone').hidden = true;
    state.ratings = {}; state.nps = null; state.startedAt = Date.now();
    U.$$('#fbRatings .rating').forEach((g) => paintRating(g, 0));
    U.$$('#fbNps button').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
    U.$('#fbCount').textContent = '0';
  }

  function renderHistory() {
    const h = U.store.get(HIST, []);
    const el = U.$('#fbHistory');
    el.hidden = !h.length;
    if (!h.length) return;
    const waiting = new Set(U.store.get('evalaih.outbox.v1', []).map((x) => x.ref));
    el.innerHTML = `<h3 class="ph3">Góp ý đã gửi từ thiết bị này</h3><ul class="kb-revs">${h.map((x) => `<li>${U.fmtDate(x.at)} · ${U.esc(x.topic)} · <code>${U.esc(x.ref.slice(-8))}</code> · ${waiting.has(x.ref) ? 'chờ gửi lại' : 'đã gửi'}</li>`).join('')}</ul>`;
  }

  return { init, prefill };
})();
