/* =============================================================
   EvalAIH — Agent EvalAI: thu nhận tri thức từ bác sĩ, chuyên gia
============================================================= */
'use strict';

const Agent = (() => {
  const C = window.EVALAI_CONFIG;
  const SEV = ['Không ảnh hưởng', 'Nhẹ', 'Trung bình', 'Nghiêm trọng', 'Nguy hiểm tính mạng'];
  const ERR = ['Trích dẫn bịa / không tồn tại', 'Sai liều thuốc', 'Sai phác đồ / chỉ định', 'Thiếu chống chỉ định / tương tác', 'Sai số liệu',
    'Thông tin lỗi thời', 'Không phù hợp bối cảnh Việt Nam', 'Sai thông tin pháp lý', 'Suy diễn quá mức', 'Khác'];

  /* Lược đồ trường theo loại đóng góp */
  const SCHEMA = {
    correction: [
      { k: 'platform', l: 'Nền tảng / mô hình AI', t: 'text', max: 100 },
      { k: 'ai_output', l: 'Đoạn output AI được đánh giá', t: 'area', req: true, max: 3000, rows: 4 },
      { k: 'verdict', l: 'Kết luận của chuyên gia', t: 'select', req: true, o: ['Đúng', 'Đúng một phần', 'Sai', 'Nguy hiểm'] },
      { k: 'corrected', l: 'Nội dung đúng / đính chính', t: 'area', max: 3000, rows: 3, reqIf: (v) => v.verdict !== 'Đúng' },
      { k: 'severity', l: 'Mức độ ảnh hưởng nếu áp dụng', t: 'select', req: true, o: SEV },
      { k: 'error_type', l: 'Loại lỗi', t: 'select', o: ['—', ...ERR] },
    ],
    dose_rule: [
      { k: 'drug', l: 'Hoạt chất (tên chung)', t: 'text', req: true, max: 80 },
      { k: 'aliases', l: 'Tên khác / biệt dược (phân tách dấu phẩy)', t: 'text', max: 200, list: true },
      { k: 'route', l: 'Đường dùng', t: 'select', o: ['uống', 'tiêm tĩnh mạch', 'tiêm bắp', 'tiêm dưới da', 'đặt trực tràng', 'khác'] },
      { k: 'population', l: 'Đối tượng', t: 'select', req: true, o: ['người lớn', 'trẻ em', 'người cao tuổi', 'suy thận', 'suy gan', 'phụ nữ có thai', 'khác'] },
      { k: 'max_single', l: 'Liều tối đa mỗi lần', t: 'number', min: 0 },
      { k: 'max_daily', l: 'Liều tối đa mỗi ngày', t: 'number', min: 0 },
      { k: 'unit', l: 'Đơn vị', t: 'select', req: true, o: ['mg', 'mg/kg'] },
      { k: 'note', l: 'Ghi chú lâm sàng', t: 'area', max: 1000, rows: 2 },
    ],
    gold_qa: [
      { k: 'question', l: 'Câu hỏi lâm sàng / tình huống', t: 'area', req: true, max: 1500, rows: 2 },
      { k: 'reference', l: 'Câu trả lời chuẩn', t: 'area', req: true, max: 4000, rows: 4 },
      { k: 'key_points', l: 'Ý chính bắt buộc có (mỗi dòng một ý)', t: 'area', max: 2000, rows: 3, lines: true },
      { k: 'must_not_say', l: 'Nội dung không được nêu (mỗi dòng một ý)', t: 'area', max: 2000, rows: 2, lines: true },
    ],
    red_flag: [
      { k: 'statement', l: 'Phát biểu nguy hiểm (mẫu)', t: 'area', req: true, max: 1500, rows: 2 },
      { k: 'reason', l: 'Vì sao nguy hiểm', t: 'area', req: true, max: 1500, rows: 2 },
      { k: 'severity', l: 'Mức độ', t: 'select', req: true, o: SEV.slice(2) },
    ],
    guideline: [
      { k: 'doc_id', l: 'Số hiệu văn bản (VD: 134/2025/QH15)', t: 'text', req: true, max: 40, pattern: '\\d{1,4}\\s*/\\s*\\d{4}\\s*/\\s*[A-Za-zĐđ0-9-]+' },
      { k: 'title', l: 'Tên văn bản / hướng dẫn', t: 'text', req: true, max: 200 },
      { k: 'status', l: 'Tình trạng hiệu lực', t: 'select', req: true, o: [['in_force', 'Đang có hiệu lực'], ['check', 'Cần kiểm tra'], ['superseded', 'Hết hiệu lực / bị thay thế']] },
      { k: 'effective', l: 'Ngày hiệu lực (dd/mm/yyyy)', t: 'text', max: 10, pattern: '\\d{2}/\\d{2}/\\d{4}' },
      { k: 'note', l: 'Ghi chú (văn bản thay thế, phạm vi)', t: 'area', max: 1000, rows: 2 },
    ],
  };

  let kind = 'correction';

  const opt = (o) => (Array.isArray(o) ? `<option value="${U.esc(o[0])}">${U.esc(o[1])}</option>` : `<option>${U.esc(o)}</option>`);

  function renderKindFields() {
    U.$('#kindFields').innerHTML = SCHEMA[kind].map((f) => {
      const id = 'kf_' + f.k;
      const lab = `<label for="${id}">${U.esc(f.l)}${f.req ? ' <span class="req">*</span>' : ''}</label>`;
      const req = f.req ? ' required' : '';
      const max = f.max ? ` maxlength="${f.max}"` : '';
      let input;
      if (f.t === 'area') input = `<textarea id="${id}" rows="${f.rows || 3}"${req}${max}></textarea>`;
      else if (f.t === 'select') input = `<select id="${id}"${req}>${f.o.map(opt).join('')}</select>`;
      else if (f.t === 'number') input = `<input id="${id}" type="number" step="any" min="${f.min ?? ''}"${req}>`;
      else input = `<input id="${id}" type="text"${req}${max}${f.pattern ? ` pattern="${f.pattern}"` : ''}>`;
      return `<div class="field">${lab}${input}</div>`;
    }).join('');
    U.$$('#kindSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.kind === kind)));
  }

  function collect() {
    const v = {};
    SCHEMA[kind].forEach((f) => {
      const el = U.$('#kf_' + f.k); let val = el.value.trim();
      if (f.t === 'number') val = val === '' ? null : Number(val);
      else if (f.list) val = val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];
      else if (f.lines) val = val ? val.split('\n').map((s) => s.trim()).filter(Boolean) : [];
      v[f.k] = val;
    });
    return v;
  }

  function validate(v) {
    const errs = [];
    SCHEMA[kind].forEach((f) => {
      const el = U.$('#kf_' + f.k);
      const empty = v[f.k] === null || v[f.k] === '' || (Array.isArray(v[f.k]) && !v[f.k].length);
      const need = f.req || (f.reqIf && f.reqIf(v));
      el.classList.toggle('invalid', false);
      if (need && empty) { errs.push(f.l); el.classList.add('invalid'); }
      else if (!empty && f.pattern && !new RegExp('^' + f.pattern + '$').test(String(v[f.k]))) { errs.push(f.l + ' (sai định dạng)'); el.classList.add('invalid'); }
    });
    if (kind === 'dose_rule') {
      if (!v.max_single && !v.max_daily) errs.push('Cần ít nhất một ngưỡng liều');
      if (v.max_single && v.max_daily && v.max_single > v.max_daily) errs.push('Liều mỗi lần không thể lớn hơn liều mỗi ngày');
    }
    return errs;
  }

  /* ---------- Hồ sơ ---------- */
  function fillProfile() {
    const p = KB.getProfile();
    const st = U.$('#profState');
    if (!p) { st.textContent = 'Hoàn tất hồ sơ để bắt đầu đóng góp.'; return; }
    U.$('#pfName').value = p.name || ''; U.$('#pfTitle').value = p.title || ''; U.$('#pfYears').value = p.years || '';
    U.$('#pfSpec').value = p.specialty || ''; U.$('#pfOrg').value = p.org || ''; U.$('#pfEmail').value = p.email || '';
    U.$('#pfLicense').value = p.license || ''; U.$('#pfCoi').value = p.coi || ''; U.$('#pfConsent').checked = true;
    st.innerHTML = `Đang đóng góp với tư cách <b>${U.esc(p.title ? p.title + ' ' : '')}${U.esc(p.name)}</b> · ${U.esc(p.specialty)} · mã ẩn danh <code>${U.esc(p.key)}</code>`;
    if (!U.$('#ctSpec').dataset.touched) U.$('#ctSpec').value = p.specialty;
  }

  async function onProfile(e) {
    e.preventDefault();
    const f = e.target;
    const p = {
      name: U.$('#pfName').value.trim(), title: U.$('#pfTitle').value.trim(), years: U.$('#pfYears').value,
      specialty: U.$('#pfSpec').value, org: U.$('#pfOrg').value.trim(), email: U.$('#pfEmail').value.trim(),
      license: U.$('#pfLicense').value.trim(), coi: U.$('#pfCoi').value.trim(),
    };
    if (!f.checkValidity() || !U.$('#pfConsent').checked) { f.reportValidity(); U.toast('Vui lòng điền đủ các trường bắt buộc và đồng ý xử lý dữ liệu.', 'err'); return; }
    const isNew = !KB.getProfile();
    const saved = await KB.saveProfile(p);
    fillProfile();
    U.toast('Đã lưu hồ sơ chuyên gia.');
    if (isNew) {
      Mailer.send('expert_profile', `[EvalAIH] Chuyên gia mới — ${p.specialty} — ${p.name}`, {
        'Loại': 'Đăng ký chuyên gia', 'Họ tên': p.name, 'Chức danh': p.title, 'Chuyên khoa': p.specialty, 'Cơ sở': p.org,
        'Email': p.email, 'Số CCHN': p.license, 'Kinh nghiệm (năm)': p.years, 'Xung đột lợi ích': p.coi || 'Không khai báo', 'Mã ẩn danh': saved.key,
      }, { type: 'expert_profile', profile: { ...p, key: saved.key } }, p.email).then(showOutbox);
    }
  }

  /* ---------- Gửi đóng góp ---------- */
  async function onContribute(e) {
    e.preventDefault();
    const prof = KB.getProfile();
    if (!prof) { U.toast('Vui lòng lưu hồ sơ chuyên gia trước.', 'err'); U.$('#pfName').focus(); return; }
    const v = collect();
    const errs = validate(v);
    if (!U.$('#evSource').value.trim()) errs.push('Nguồn bằng chứng');
    if (!U.$('#ctDeid').checked) errs.push('Xác nhận đã khử định danh');
    if (!U.$('#ctConsent').checked) errs.push('Đồng ý chia sẻ');
    if (errs.length) { U.toast('Thiếu / sai: ' + errs.join('; '), 'err', 6000); return; }

    const allText = JSON.stringify(v) + ' ' + U.$('#ctKeywords').value;
    const pii = U.detectPII(allText);
    const box = U.$('#ctPii');
    if (pii.length) {
      box.hidden = false;
      box.innerHTML = `<b>Không gửi được — nghi có thông tin định danh người bệnh:</b> ${pii.map((p) => `${U.esc(p.label)} (“${U.esc(p.sample)}”)`).join(', ')}. Xóa hoặc thay bằng mô tả chung (VD: “nam, 60 tuổi”).`;
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    box.hidden = true;

    const btn = U.$('#ctSubmit'), st = U.$('#ctStatus');
    btn.disabled = true; st.textContent = 'Đang ghi vào kho tri thức…';
    try {
      const entry = await KB.add({
        kind, specialty: U.$('#ctSpec').value, content: v,
        keywords: U.$('#ctKeywords').value.split(',').map((s) => s.trim()).filter(Boolean),
        evidence: { source: U.$('#evSource').value.trim(), ref: U.$('#evRef').value.trim(), level: U.$('#evLevel').value },
        confidence: U.$('#ctConf').value,
      }, prof);
      st.textContent = 'Đã áp dụng vào bộ đánh giá. Đang gửi về HealthV…';
      const res = await syncEntry(entry, prof);
      st.textContent = res.ok ? `Đã gửi · mã ${entry.id.slice(-8)}` : `Đã lưu, chờ gửi lại (${res.error || 'lỗi mạng'})`;
      U.toast(res.ok ? 'Đóng góp đã được ghi nhận và gửi về HealthV.' : 'Đã lưu đóng góp; sẽ tự gửi lại khi kết nối được.', res.ok ? 'ok' : 'warn', 6000);
      SCHEMA[kind].forEach((f) => { const el = U.$('#kf_' + f.k); if (f.t !== 'select') el.value = ''; });
      U.$('#evRef').value = ''; U.$('#ctKeywords').value = ''; U.$('#ctDeid').checked = false;
    } catch (err) {
      console.error(err); st.textContent = 'Lỗi: ' + err.message; U.toast('Không ghi được: ' + err.message, 'err');
    } finally { btn.disabled = false; }
  }

  function entryFields(entry) {
    const f = { 'Loại': KB.KINDS[entry.kind], 'Chuyên khoa': entry.specialty, 'Trạng thái': Engine.statusLabel(entry.status), 'Chuyên gia': `${entry.author.title} ${entry.author.name}`.trim(), 'Cơ sở': entry.author.org };
    Object.entries(entry.content).forEach(([k, v]) => { f['• ' + k] = Array.isArray(v) ? v.join(' | ') : v; });
    f['Nguồn bằng chứng'] = `${entry.evidence.source} ${entry.evidence.ref || ''} (${entry.evidence.level})`;
    f['Mức tự tin'] = entry.confidence; f['Từ khóa'] = entry.keywords; f['Hash'] = entry.hash;
    return f;
  }

  async function syncEntry(entry, prof) {
    let res = { ok: true };
    if (!entry.synced.email) {
      res = await Mailer.send('kb_entry', `[EvalAIH KB] ${KB.KINDS[entry.kind]} — ${entry.specialty} — ${prof.name}`, entryFields(entry), { type: 'kb_entry', entry }, prof.email);
      if (res.ok) KB.markSynced(entry.id, 'email');
    }
    if (C.KB_WEBHOOK_URL && !entry.synced.webhook && C.MAIL_PROVIDER !== 'webhook') {
      try {
        await U.fetchTimeout(C.KB_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ type: 'kb_entry', entry, app_version: C.VERSION }) }, 15000);
        KB.markSynced(entry.id, 'webhook');
      } catch (e) { console.warn('webhook', e); }
    }
    showOutbox();
    return res;
  }

  async function syncAll() {
    const prof = KB.getProfile() || { name: 'Chưa rõ', email: '' };
    const list = KB.all().filter((e) => !e.synced.email || (C.KB_WEBHOOK_URL && !e.synced.webhook));
    if (!list.length) { await Mailer.flush(); U.toast('Không còn mục nào chờ đồng bộ.'); return; }
    let ok = 0;
    for (const e of list) { const r = await syncEntry(e, prof); if (r.ok) ok++; }
    U.toast(`Đồng bộ ${ok}/${list.length} mục.`, ok === list.length ? 'ok' : 'warn');
  }

  /* ---------- Danh sách & thẩm định ---------- */
  function renderStats() {
    const s = KB.stats();
    U.$('#navKbCnt').textContent = s.total;
    const spec = Object.entries(s.bySpecialty).sort((a, b) => b[1] - a[1]).slice(0, 6);
    U.$('#kbStats').innerHTML = `
      ${[['Tổng mục', s.total, '#9FBCD6'], ['Đã đồng thuận', s.byStatus.validated || 0, '#1ED98A'], ['Chờ đồng thuận', s.byStatus.pending || 0, '#F5B93A'],
        ['Tranh chấp', s.byStatus.disputed || 0, '#F05050'], ['Chuyên gia', s.experts, '#7B6FFF'], ['Chưa gửi', s.unsynced, '#F07B44']]
      .map(([l, n, c]) => `<div class="sum-card"><div class="sum-n" style="color:${c}">${n}</div><div class="sum-l">${l}</div></div>`).join('')}
      <div class="kb-spec">${spec.map(([k, n]) => `<span class="cl-tag">${U.esc(k)} · ${n}</span>`).join('')}</div>`;
  }

  function renderList() {
    const q = U.norm(U.$('#kbQ').value), fk = U.$('#kbFKind').value, fs = U.$('#kbFSpec').value, fst = U.$('#kbFStatus').value;
    const me = KB.getProfile();
    const list = KB.all().reverse().filter((e) => (!fk || e.kind === fk) && (!fs || e.specialty === fs) && (!fst || e.status === fst)
      && (!q || U.norm(JSON.stringify(e.content) + ' ' + e.keywords.join(' ') + ' ' + e.author.name).includes(q)));
    const ST = { validated: ['Đã đồng thuận', '#1ED98A'], pending: ['Chờ đồng thuận', '#F5B93A'], disputed: ['Tranh chấp', '#F05050'], seed: ['Mẫu – cần xác nhận', '#9FBCD6'] };
    U.$('#kbList').innerHTML = list.length ? list.slice(0, 60).map((e) => {
      const [sl, sc] = ST[e.status] || [e.status, '#9FBCD6'];
      const c = e.content;
      const head = e.kind === 'correction' ? `${c.verdict} · ${c.severity}` : e.kind === 'dose_rule' ? `${c.drug} · ${c.population} · ${c.max_single ? 'tối đa ' + c.max_single + ' ' + c.unit + '/lần' : ''}${c.max_daily ? ' · ' + c.max_daily + ' ' + c.unit + '/ngày' : ''}`
        : e.kind === 'gold_qa' ? c.question : e.kind === 'red_flag' ? `${c.severity}` : `${c.doc_id} · ${c.title}`;
      const body = e.kind === 'correction' ? `<p><b>AI:</b> ${U.esc(c.ai_output)}</p>${c.corrected ? `<p><b>Đính chính:</b> ${U.esc(c.corrected)}</p>` : ''}`
        : e.kind === 'gold_qa' ? `<p>${U.esc(c.reference)}</p>${(c.key_points || []).length ? `<p><b>Ý chính:</b> ${U.esc(c.key_points.join(' · '))}</p>` : ''}`
          : e.kind === 'red_flag' ? `<p><b>Mẫu:</b> ${U.esc(c.statement)}</p><p><b>Lý do:</b> ${U.esc(c.reason)}</p>`
            : `<p>${U.esc(c.note || '')}</p>`;
      const mine = me && me.key === e.author.key;
      const myRev = me && e.reviews.find((r) => r.reviewer_key === me.key);
      return `<article class="kb-item" data-id="${U.esc(e.id)}">
        <div class="kb-ih"><span class="v-badge" style="color:${sc};border-color:${sc}55">${sl}</span><span class="cl-tag">${U.esc(KB.KINDS[e.kind])}</span><span class="cl-tag">${U.esc(e.specialty)}</span>
          <span class="kb-meta">${U.esc(e.author.name)} · ${U.fmtDate(e.created_at)} · ${e.reviews.length} thẩm định${e.synced.email ? '' : ' · <span style="color:#F07B44">chưa gửi</span>'}</span></div>
        <h4>${U.esc(head)}</h4>${body}
        <p class="hint">Nguồn: ${U.esc(e.evidence.source || '—')} ${U.esc(e.evidence.ref || '')} · ${U.esc(e.evidence.level || '')} · tự tin ${e.confidence}/5</p>
        ${e.reviews.length ? `<ul class="kb-revs">${e.reviews.map((r) => `<li>${r.verdict === 'agree' ? '✓' : '✕'} ${U.esc(r.reviewer)} (${U.esc(r.reviewer_specialty || '')})${r.note ? ': ' + U.esc(r.note) : ''}</li>`).join('')}</ul>` : ''}
        ${me && !mine ? `<div class="kb-rev"><input type="text" maxlength="300" placeholder="Nhận xét thẩm định (bắt buộc khi không đồng thuận)" aria-label="Nhận xét thẩm định" value="${myRev ? U.esc(myRev.note) : ''}">
          <button class="btn-tiny ok" type="button" data-rev="agree">✓ Đồng thuận</button><button class="btn-tiny bad" type="button" data-rev="disagree">✕ Không đồng thuận</button></div>` : ''}
      </article>`;
    }).join('') + (list.length > 60 ? `<p class="hint">Hiển thị 60/${list.length} mục — dùng bộ lọc để thu hẹp.</p>` : '') : '<div class="empty">Chưa có mục phù hợp.</div>';
  }

  async function onListClick(e) {
    const b = e.target.closest('[data-rev]'); if (!b) return;
    const item = b.closest('.kb-item'); const id = item.dataset.id;
    const me = KB.getProfile(); if (!me) { U.toast('Lưu hồ sơ chuyên gia để thẩm định.', 'err'); return; }
    const note = item.querySelector('input').value.trim();
    if (b.dataset.rev === 'disagree' && note.length < 10) { U.toast('Ghi rõ lý do không đồng thuận (≥ 10 ký tự).', 'err'); return; }
    if (U.detectPII(note).length) { U.toast('Nhận xét có thể chứa thông tin định danh — vui lòng sửa.', 'err'); return; }
    try {
      const entry = KB.review(id, me, b.dataset.rev, note);
      U.toast(`Đã ghi thẩm định · trạng thái: ${Engine.statusLabel(entry.status)}.`);
      Mailer.send('kb_review', `[EvalAIH KB] Thẩm định — ${b.dataset.rev === 'agree' ? 'Đồng thuận' : 'Không đồng thuận'} — ${me.name}`, {
        'Mục KB': id, 'Loại': KB.KINDS[entry.kind], 'Chuyên khoa': entry.specialty, 'Người thẩm định': `${me.title || ''} ${me.name}`.trim(),
        'Chuyên khoa người thẩm định': me.specialty, 'Kết luận': b.dataset.rev, 'Nhận xét': note, 'Trạng thái mới': Engine.statusLabel(entry.status),
      }, { type: 'kb_review', entry_id: id, review: entry.reviews.find((r) => r.reviewer_key === me.key), entry }, me.email).then(showOutbox);
    } catch (err) { U.toast(err.message, 'err'); }
  }

  function showOutbox() {
    const n = Mailer.pending();
    U.$('#outboxInfo').textContent = n ? `⏳ ${n} bản ghi đang chờ gửi về ${C.RECIPIENT_EMAIL} — sẽ tự gửi lại khi có mạng.` : '';
  }

  function prefillCorrection({ ai_output, platform }) {
    App.show('agent');
    kind = 'correction'; renderKindFields();
    U.$('#kf_ai_output').value = ai_output || '';
    U.$('#kf_platform').value = platform || '';
    U.$('#contribForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => U.$('#kf_verdict').focus(), 400);
    if (!KB.getProfile()) U.toast('Lưu hồ sơ chuyên gia trước khi gửi hiệu chỉnh.', 'warn');
  }

  function init() {
    U.$('#quorumN').textContent = C.KB_VALIDATION_QUORUM;
    const specOpts = '<option value="">— chọn —</option>' + KB.SPECIALTIES.map((s) => `<option>${U.esc(s)}</option>`).join('');
    U.$('#pfSpec').innerHTML = specOpts; U.$('#ctSpec').innerHTML = specOpts;
    U.$('#kbFSpec').innerHTML += KB.SPECIALTIES.map((s) => `<option>${U.esc(s)}</option>`).join('');
    U.$('#kbFKind').innerHTML += Object.entries(KB.KINDS).map(([k, v]) => `<option value="${k}">${U.esc(v)}</option>`).join('');
    U.$('#kindSeg').innerHTML = Object.entries(KB.KINDS).map(([k, v]) => `<button type="button" role="radio" data-kind="${k}" aria-checked="false">${U.esc(v)}</button>`).join('');
    U.$('#kindSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (b) { kind = b.dataset.kind; renderKindFields(); } });
    U.$('#ctSpec').addEventListener('change', (e) => { e.target.dataset.touched = '1'; });
    renderKindFields();
    fillProfile();
    U.$('#profForm').addEventListener('submit', onProfile);
    U.$('#contribForm').addEventListener('submit', onContribute);
    ['#kbQ', '#kbFKind', '#kbFSpec', '#kbFStatus'].forEach((s) => U.$(s).addEventListener('input', U.debounce(renderList, 150)));
    U.$('#kbList').addEventListener('click', onListClick);
    U.$('#kbSync').addEventListener('click', syncAll);
    U.$('#kbExport').addEventListener('click', () => U.download(`evalaih-kb-${U.today()}.json`, KB.exportJSON()));
    U.$('#kbExportL').addEventListener('click', () => U.download(`evalaih-kb-train-${U.today()}.jsonl`, KB.exportJSONL(), 'application/x-ndjson'));
    U.$('#kbImport').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try { const r = KB.importBundle(String(rd.result)); U.toast(`Đã nhập ${r.added} mục mới, gộp ${r.merged} thẩm định.`); } catch (err) { U.toast(err.message, 'err'); }
        e.target.value = '';
      };
      rd.readAsText(file, 'utf-8');
    });
    U.$('#kbVerify').addEventListener('click', async () => {
      const r = await KB.verifyChain();
      U.toast(r.ok ? 'Chuỗi băm toàn vẹn — không phát hiện chỉnh sửa ngầm.' : `Phát hiện mục bị sửa: ${r.id}`, r.ok ? 'ok' : 'err', 6000);
    });
    KB.on(() => { renderStats(); renderList(); });
    document.addEventListener('outbox:change', showOutbox);
    renderStats(); renderList(); showOutbox();
  }

  return { init, prefillCorrection };
})();
