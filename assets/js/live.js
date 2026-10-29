/* =============================================================
   EvalAIH — Giao diện Đánh giá trực tiếp
============================================================= */
'use strict';

const Live = (() => {
  const C = window.EVALAI_CONFIG;
  const VMX = {
    VERIFIED: { label: '✓ VERIFIED', c: '#1ED98A', bg: '#021D10', bd: '#12402A' },
    RELIABLE: { label: '◉ RELIABLE', c: '#F5B93A', bg: '#1A1000', bd: '#3D2C00' },
    CONDITIONAL: { label: '⚡ CONDITIONAL', c: '#F07B44', bg: '#1A0C00', bd: '#3D2000' },
    HIGH_RISK: { label: '▲ HIGH RISK', c: '#F05050', bg: '#1A0000', bd: '#3D0000' },
    REJECT: { label: '✕ REJECT', c: '#E8459E', bg: '#1A000E', bd: '#3D0026' },
    UNVERIFIED: { label: '? CHƯA KIỂM CHỨNG', c: '#9FBCD6', bg: '#0C1220', bd: '#243550' },
  };
  const ST = { pass: ['✓', 'ok'], fail: ['✕', 'bad'], warn: ['!', 'warnc'], unv: ['?', 'mut'] };
  const TYPE_VI = { CITATION: 'Trích dẫn', CLINICAL: 'Lâm sàng', REGULATORY: 'Pháp lý', MARKET: 'Thị trường', STATISTICAL: 'Số liệu', GENERAL: 'Chung' };

  const SAMPLE = {
    prompt: 'Liều paracetamol tối đa cho người lớn là bao nhiêu và có quy định pháp lý nào về AI y tế?',
    text: `Paracetamol an toàn tuyệt đối, người lớn có thể dùng tới 6 g/ngày khi sốt cao.
Theo nghiên cứu của Stanford năm 2024, AI giúp bác sĩ tiết kiệm 3 giờ mỗi ngày.
Mạng học sâu đã được tổng quan trên Nature, DOI 10.1038/nature14539.
Một nghiên cứu khác chứng minh AI chẩn đoán đúng 99% ca viêm phổi, DOI 10.5555/evalaih.fake.2024.001.
Luật Trí tuệ nhân tạo 134/2025/QH15 có hiệu lực từ 7/2025 và yêu cầu con người giám sát hệ thống AI rủi ro cao.
Dữ liệu sức khỏe được bảo vệ theo Luật 91/2025/QH15 về bảo vệ dữ liệu cá nhân.
Thị trường AI y tế Việt Nam đạt 2,1 tỷ USD vào năm 2030.`,
  };

  let last = null;
  let lastInput = null;

  function init() {
    const f = U.$('#liveForm'), txt = U.$('#lvText'), cnt = U.$('#lvCount');
    txt.addEventListener('input', () => { cnt.textContent = txt.value.length.toLocaleString('vi-VN'); });
    U.$('#lvSample').addEventListener('click', () => {
      U.$('#lvPlatform').value = 'Khác'; U.$('#lvModel').value = 'Ví dụ minh họa';
      U.$('#lvPrompt').value = SAMPLE.prompt; txt.value = SAMPLE.text; txt.dispatchEvent(new Event('input'));
    });
    U.$('#lvClear').addEventListener('click', () => { f.reset(); cnt.textContent = '0'; U.$('#lvResult').hidden = true; U.$('#lvPii').hidden = true; last = null; });
    U.$('#lvFile').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) { U.toast('File tối đa 2 MB.', 'err'); return; }
      const rd = new FileReader();
      rd.onload = () => { txt.value = String(rd.result).slice(0, 30000); txt.dispatchEvent(new Event('input')); };
      rd.readAsText(file, 'utf-8');
    });
    f.addEventListener('submit', (e) => { e.preventDefault(); run(); });
    U.$('#lvResult').addEventListener('click', onResultClick);

    // Thời gian thực: kho tri thức thay đổi → đánh giá lại kết quả đang mở
    KB.on(U.debounce((msg) => {
      if (!lastInput || U.$('#lvResult').hidden) return;
      run(true, msg);
    }, 600));
  }

  async function run(isRerun = false, msg) {
    const text = U.$('#lvText').value.trim();
    const platform = U.$('#lvPlatform').value;
    if (!isRerun) {
      if (!platform) { U.toast('Chọn nền tảng AI cần đánh giá.', 'err'); U.$('#lvPlatform').focus(); return; }
      if (text.length < 20) { U.toast('Output cần tối thiểu 20 ký tự.', 'err'); U.$('#lvText').focus(); return; }
      const pii = U.detectPII(text + ' ' + U.$('#lvPrompt').value);
      const box = U.$('#lvPii');
      if (pii.length) {
        box.hidden = false;
        box.innerHTML = `<b>Phát hiện khả năng có thông tin định danh:</b> ${pii.map((p) => `${U.esc(p.label)} (“${U.esc(p.sample)}”)`).join(', ')}. Vui lòng xóa trước khi đánh giá. Phân tích chạy trên trình duyệt, nhưng DOI/PMID được tra trên dịch vụ bên ngoài.`;
        return;
      }
      box.hidden = true;
      lastInput = { text, platform, model: U.$('#lvModel').value.trim(), prompt: U.$('#lvPrompt').value.trim() };
    }
    const btn = U.$('#lvRun'), st = U.$('#lvStatus');
    btn.disabled = true; st.textContent = isRerun ? 'Kho tri thức cập nhật — đang đánh giá lại…' : 'Đang tách luận điểm và tra cứu nguồn…';
    try {
      last = await Engine.evaluate(lastInput.text, lastInput);
      render(last, isRerun);
      st.textContent = `Hoàn tất trong ${last.ms} ms · ${last.claims.length} luận điểm.`;
      if (isRerun) U.toast(`Kho tri thức vừa ${msg && msg.external ? 'được cập nhật từ cửa sổ khác' : 'cập nhật'} — đã đánh giá lại.`, 'ok');
    } catch (e) {
      console.error(e); st.textContent = 'Lỗi: ' + e.message; U.toast('Không đánh giá được: ' + e.message, 'err');
    } finally { btn.disabled = false; }
  }

  function render(r, isRerun) {
    const v = VMX[r.verdict] || VMX.UNVERIFIED;
    const cnt = (f) => r.claims.filter(f).length;
    const colorScore = (s) => (s >= 75 ? '#1ED98A' : s >= 55 ? '#F5B93A' : '#F05050');
    const el = U.$('#lvResult');
    el.hidden = false;
    el.innerHTML = `
      ${r.needsReview ? `<div class="notice err"><b>Bắt buộc chuyên gia review:</b> ${r.critical ? 'phát hiện lỗi nghiêm trọng (liều thuốc / cờ đỏ / sai theo chuyên gia). ' : ''}${r.ecs < C.ECS_HUMAN_REVIEW_THRESHOLD ? `độ phủ kiểm chứng ECS-H ${r.ecs}% thấp hơn ngưỡng ${C.ECS_HUMAN_REVIEW_THRESHOLD}%.` : ''}</div>` : ''}
      <div class="lv-top panel">
        <div>
          <div class="hint">${U.esc(r.platform)}${r.model ? ' · ' + U.esc(r.model) : ''} · ${U.fmtDate(r.at)}${isRerun ? ' · <b>đã đánh giá lại theo KB mới</b>' : ''}</div>
          <h2 class="ph" style="margin:6px 0 10px">Kết quả đánh giá trực tiếp</h2>
          <div class="stat-row">
            ${[['Đạt', cnt((c) => ['VERIFIED', 'RELIABLE'].includes(c.verdict)), '#1ED98A'], ['Cảnh báo', cnt((c) => c.verdict === 'CONDITIONAL'), '#F5B93A'], ['Rủi ro / từ chối', cnt((c) => ['HIGH_RISK', 'REJECT'].includes(c.verdict)), '#F05050'], ['Chưa kiểm chứng', cnt((c) => c.verdict === 'UNVERIFIED'), '#9FBCD6']]
      .map(([l, n, c]) => `<div class="stat-chip" style="border-color:${c}40"><span class="chip-n" style="color:${c}">${n}</span><span class="chip-l" style="color:${c}">${l}</span></div>`).join('')}
          </div>
          <p class="hint" style="margin-top:10px">KB áp dụng: ${r.kbVersion.entries} mục (${r.kbVersion.validated} đã đồng thuận) · Engine ${U.esc(r.engine)}</p>
        </div>
        <div class="lv-score">
          <div class="mpvs-lbl">MPVS-H</div>
          <div class="lv-num" style="color:${colorScore(r.mpvs)}">${r.mpvs}</div>
          <div class="v-badge" style="color:${v.c};background:${v.bg};border-color:${v.bd}">${v.label}</div>
          <div class="mpvs-ecs">ECS-H ${r.ecs}% độ phủ</div>
        </div>
      </div>
      ${r.docFindings.length ? `<div class="panel"><h3 class="ph3">Đối chiếu câu trả lời chuẩn của chuyên gia</h3>${r.docFindings.map((d) => `<div class="chk ${ST[d.state][1]}"><span class="chk-i">${ST[d.state][0]}</span><span>${U.esc(d.msg)}</span></div>`).join('')}</div>` : ''}
      <div class="lv-claims">${r.claims.map((c, i) => claimCard(c, i)).join('')}</div>
      <div class="notice warn"><b>Lưu ý:</b> ${U.esc(C.DISCLAIMER_VI)} MPVS-H là điểm sàng lọc heuristic, chưa phải MPVS chuẩn hóa.</div>
      <div class="actions no-print">
        <button class="btn-main" type="button" data-act="print">🖨 In / Lưu PDF</button>
        <button class="btn-ghost" type="button" data-act="json">⬇ Tải báo cáo JSON</button>
        <button class="btn-ghost" type="button" data-act="fhir">⬇ FHIR R4 (AuditEvent + Observation)</button>
        <button class="btn-ghost" type="button" data-act="feedback">Góp ý về kết quả này</button>
      </div>`;
    if (!isRerun) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function claimCard(c, i) {
    const v = VMX[c.verdict] || VMX.UNVERIFIED;
    return `<article class="cl-card lv-cl" style="border-color:${v.bd}">
      <div class="cl-top" style="cursor:default">
        <div class="cl-body">
          <div class="cl-badges">
            <span class="v-badge" style="color:${v.c};background:${v.bg};border-color:${v.bd}">${v.label}</span>
            <span class="cl-tag">${TYPE_VI[c.type] || c.type}</span>
            ${c.htype !== '—' ? `<span class="cl-tag ht">${U.esc(c.htype)}</span>` : ''}
            <span class="cl-tag mono">MPVS-H ${c.mpvs}</span>
          </div>
          <p class="cl-text">“${U.esc(c.claim)}”</p>
          <div class="chks">${c.checks.map((k) => `<div class="chk ${ST[k.state][1]}"><span class="chk-i" aria-label="${k.state}">${ST[k.state][0]}</span><span><b>${U.esc(k.label)}</b>${k.src ? ` <span class="src">${U.esc(k.src)}</span>` : ''} — ${U.esc(k.msg)}</span></div>`).join('')}</div>
          <div class="actions"><button class="btn-tiny" type="button" data-act="expert" data-i="${i}">✎ Chuyên gia hiệu chỉnh luận điểm này</button></div>
        </div>
      </div>
    </article>`;
  }

  function fhirBundle(r) {
    const now = r.at;
    const entries = [{
      resource: {
        resourceType: 'AuditEvent', id: r.id,
        type: { system: 'http://dicom.nema.org/resources/ontology/DCM', code: '110100', display: 'Application Activity' },
        action: 'E', recorded: now, outcome: '0',
        agent: [{ requestor: false, who: { display: r.engine } }],
        source: { observer: { display: 'EvalAIH · HealthV MedTech' } },
        entity: [{ what: { display: (r.platform + ' ' + r.model).trim() }, description: 'AI output evaluated (text, no patient data)' }],
      },
    }];
    r.claims.forEach((c, i) => entries.push({
      resource: {
        resourceType: 'Observation', id: `${r.id}-c${i + 1}`, status: c.verdict === 'UNVERIFIED' ? 'preliminary' : 'final',
        code: { text: 'EvalAIH MPVS-H claim reliability score' },
        effectiveDateTime: now, valueQuantity: { value: c.mpvs, unit: 'score', system: 'http://unitsofmeasure.org', code: '{score}' },
        interpretation: [{ text: c.verdict }],
        note: [{ text: c.claim }, ...c.checks.map((k) => ({ text: `[${k.state}] ${k.label}: ${k.msg}` })), { text: C.DISCLAIMER_VI }],
      },
    }));
    return { resourceType: 'Bundle', type: 'collection', timestamp: now, entry: entries };
  }

  function onResultClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !last) return;
    const act = b.dataset.act;
    if (act === 'print') window.print();
    else if (act === 'json') U.download(`evalaih-live-${last.id}.json`, JSON.stringify(last, null, 2));
    else if (act === 'fhir') U.download(`evalaih-fhir-${last.id}.json`, JSON.stringify(fhirBundle(last), null, 2), 'application/fhir+json');
    else if (act === 'feedback') App.goFeedback({ topic: 'Báo lỗi / sai sót kết quả', msg: `Về kết quả đánh giá ${last.id} (${last.platform}, MPVS-H ${last.mpvs}, ${last.verdict}): ` });
    else if (act === 'expert') {
      const c = last.claims[Number(b.dataset.i)];
      Agent.prefillCorrection({ ai_output: c.claim, platform: (last.platform + ' ' + last.model).trim() });
    }
  }

  function load(text, platform) {
    U.$('#lvText').value = String(text).slice(0, 30000);
    U.$('#lvText').dispatchEvent(new Event('input'));
    const sel = U.$('#lvPlatform');
    const opt = Array.from(sel.options).find((o) => platform && o.text.toLowerCase().includes(platform.split(' ')[0].toLowerCase()));
    sel.value = opt ? opt.value || opt.text : 'Khác';
  }

  return { init, load };
})();
