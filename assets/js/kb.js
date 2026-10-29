/* =============================================================
   EvalAIH — Kho tri thức chuyên gia (Expert Knowledge Base)
   - Lưu cục bộ, chuỗi băm SHA-256 (audit trail chống sửa ngầm)
   - Đồng thuận chéo: mục chỉ "validated" khi đủ KB_VALIDATION_QUORUM chuyên gia độc lập
   - Phát sự kiện thời gian thực (BroadcastChannel + storage) để bộ đánh giá áp dụng ngay
   - Xuất JSON / JSONL huấn luyện; nhập gói JSON gửi về qua email
============================================================= */
'use strict';

const KB = (() => {
  const C = window.EVALAI_CONFIG;
  const KEY = 'evalaih.kb.v1';
  const PROFILE = 'evalaih.expert.v1';
  const chan = ('BroadcastChannel' in window) ? new BroadcastChannel('evalaih-kb') : null;
  const listeners = new Set();

  const KINDS = {
    correction: 'Hiệu chỉnh output AI',
    dose_rule: 'Quy tắc liều thuốc',
    gold_qa: 'Câu trả lời chuẩn (gold)',
    red_flag: 'Phát biểu nguy hiểm (cờ đỏ)',
    guideline: 'Cập nhật hướng dẫn / văn bản',
  };
  const SPECIALTIES = ['Nội tổng quát', 'Tim mạch', 'Truyền nhiễm', 'Dược lâm sàng', 'Nhi khoa', 'Sản phụ khoa', 'Ung bướu',
    'Chẩn đoán hình ảnh', 'Nội tiết – Đái tháo đường', 'Hô hấp', 'Thần kinh', 'Hồi sức – Cấp cứu', 'Thận – Lọc máu',
    'Tiêu hóa – Nội soi', 'Y tế công cộng – Dịch tễ', 'Điều dưỡng', 'Quản lý bệnh viện', 'Pháp chế y tế', 'Khác'];

  /* Mục mẫu duy nhất để minh họa quy tắc liều — trạng thái 'seed', trọng số thấp, cần chuyên gia xác nhận. */
  const SEED = [{
    id: 'seed-paracetamol-adult', kind: 'dose_rule', specialty: 'Dược lâm sàng', status: 'seed',
    created_at: '2026-10-29T00:00:00.000Z',
    author: { name: 'EvalAIH (mẫu minh họa)', title: '', org: 'HealthV', specialty: 'Dược lâm sàng', license: '', key: 'seed' },
    content: { drug: 'paracetamol', aliases: ['acetaminophen', 'panadol', 'efferalgan'], route: 'uống', population: 'người lớn',
      max_single: 1000, max_daily: 4000, unit: 'mg', note: 'Ngưỡng thường dùng trên nhãn thuốc cho người lớn; thấp hơn với bệnh gan, nghiện rượu, cân nặng thấp.' },
    keywords: ['paracetamol', 'acetaminophen', 'liều'],
    evidence: { source: 'Nhãn thuốc / Dược thư Quốc gia Việt Nam — cần chuyên gia đối chiếu', ref: '', level: 'Hướng dẫn / nhãn thuốc' },
    confidence: 3, reviews: [], hash: 'seed', prev_hash: '', synced: { email: true, webhook: true },
  }];

  let data = load();

  function load() {
    const d = U.store.get(KEY, null);
    if (d && Array.isArray(d.entries)) return d;
    return { schema: 'evalaih.kb/1', entries: SEED.slice(), updated_at: new Date().toISOString() };
  }
  function persist(reason) {
    data.updated_at = new Date().toISOString();
    U.store.set(KEY, data);
    const msg = { type: 'kb:change', reason, at: data.updated_at, count: data.entries.length };
    if (chan) chan.postMessage(msg);
    listeners.forEach((fn) => { try { fn(msg); } catch (e) { console.error(e); } });
  }
  function onExternal(msg) { data = load(); listeners.forEach((fn) => { try { fn({ ...msg, external: true }); } catch (e) { console.error(e); } }); }
  if (chan) chan.onmessage = (ev) => { if (ev.data && ev.data.type === 'kb:change') onExternal(ev.data); };
  window.addEventListener('storage', (ev) => { if (ev.key === KEY) onExternal({ type: 'kb:change', reason: 'storage' }); });

  const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const all = () => data.entries.slice();
  const get = (id) => data.entries.find((e) => e.id === id);

  /* ---------- Hồ sơ chuyên gia ---------- */
  const getProfile = () => U.store.get(PROFILE, null);
  async function saveProfile(p) {
    const key = (await U.sha256(U.norm(p.name) + '|' + U.norm(p.license || p.email || ''))).slice(0, 16);
    const prof = { ...p, key, saved_at: new Date().toISOString() };
    U.store.set(PROFILE, prof);
    return prof;
  }
  const publicAuthor = (p) => ({ name: p.name, title: p.title || '', org: p.org || '', specialty: p.specialty, license: p.license ? '***' + String(p.license).slice(-3) : '', key: p.key });

  /* ---------- Trạng thái theo đồng thuận ---------- */
  function computeStatus(e) {
    if (e.status === 'seed' && !e.reviews.length) return 'seed';
    const agree = new Set(e.reviews.filter((r) => r.verdict === 'agree').map((r) => r.reviewer_key));
    const disagree = e.reviews.filter((r) => r.verdict === 'disagree').length;
    if (disagree > 0) return 'disputed';
    const supporters = agree.size + (e.status === 'seed' ? 0 : 1); // tác giả tính là 1
    return supporters >= C.KB_VALIDATION_QUORUM ? 'validated' : 'pending';
  }
  /** Trọng số khi bộ đánh giá áp dụng mục KB. */
  const weight = (e) => ({ validated: 1, pending: 0.5, seed: 0.4, disputed: 0 }[e.status] ?? 0);

  async function chainHash(entry) {
    const prev = data.entries.length ? data.entries[data.entries.length - 1].hash : '';
    const core = JSON.stringify({ id: entry.id, kind: entry.kind, content: entry.content, author: entry.author.key, created_at: entry.created_at, prev });
    return { hash: await U.sha256(core), prev_hash: prev };
  }

  async function add({ kind, specialty, content, keywords, evidence, confidence }, profile) {
    if (!KINDS[kind]) throw new Error('Loại đóng góp không hợp lệ');
    const entry = {
      id: U.uid('kb'), kind, specialty, status: 'pending', created_at: new Date().toISOString(),
      author: publicAuthor(profile), content, keywords: keywords || [], evidence: evidence || {},
      confidence: Number(confidence) || 3, reviews: [], synced: { email: false, webhook: !C.KB_WEBHOOK_URL },
    };
    Object.assign(entry, await chainHash(entry));
    entry.status = computeStatus(entry);
    data.entries.push(entry);
    persist('add');
    return entry;
  }

  function review(id, profile, verdict, note) {
    const e = get(id);
    if (!e) throw new Error('Không tìm thấy mục');
    if (e.author.key === profile.key) throw new Error('Tác giả không thể tự thẩm định mục của mình');
    e.reviews = e.reviews.filter((r) => r.reviewer_key !== profile.key);
    e.reviews.push({ reviewer: profile.name, reviewer_specialty: profile.specialty, reviewer_key: profile.key, verdict, note: note || '', at: new Date().toISOString() });
    e.status = computeStatus(e);
    persist('review');
    return e;
  }

  function markSynced(id, channel) { const e = get(id); if (e) { e.synced[channel] = true; persist('sync'); } }

  /** Gộp gói JSON (từ email payload_json hoặc file xuất). Không ghi đè mục trùng id; gộp thẩm định. */
  function importBundle(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('Không phải JSON hợp lệ'); }
    const list = Array.isArray(obj) ? obj : (obj.entries || (obj.entry ? [obj.entry] : (obj.kind ? [obj] : [])));
    let added = 0, merged = 0;
    list.forEach((x) => {
      if (!x || !x.id || !KINDS[x.kind] || !x.content) return;
      const cur = get(x.id);
      if (!cur) { data.entries.push({ reviews: [], synced: { email: true, webhook: true }, ...x }); added++; return; }
      (x.reviews || []).forEach((r) => { if (!cur.reviews.some((c) => c.reviewer_key === r.reviewer_key)) { cur.reviews.push(r); merged++; } });
      cur.status = computeStatus(cur);
    });
    if (added || merged) persist('import');
    return { added, merged };
  }

  function exportJSON() {
    return JSON.stringify({ schema: data.schema, exported_at: new Date().toISOString(), app_version: C.VERSION, disclaimer: C.DISCLAIMER_VI, entries: data.entries }, null, 2);
  }

  /** JSONL cho pipeline huấn luyện bộ đánh giá (critic) — mỗi dòng một mẫu có trọng số theo đồng thuận. */
  function exportJSONL() {
    return data.entries.filter((e) => e.status !== 'disputed').map((e) => JSON.stringify({
      id: e.id, task: 'evaluate_' + e.kind, specialty: e.specialty, status: e.status, weight: weight(e),
      input: e.kind === 'correction' ? { ai_output: e.content.ai_output, platform: e.content.platform }
        : e.kind === 'gold_qa' ? { question: e.content.question }
          : e.kind === 'red_flag' ? { statement: e.content.statement }
            : e.content,
      target: e.kind === 'correction' ? { verdict: e.content.verdict, corrected: e.content.corrected, severity: e.content.severity, error_type: e.content.error_type }
        : e.kind === 'gold_qa' ? { reference: e.content.reference, key_points: e.content.key_points, must_not_say: e.content.must_not_say }
          : e.kind === 'red_flag' ? { label: 'unsafe', reason: e.content.reason, severity: e.content.severity }
            : null,
      evidence: e.evidence, confidence: e.confidence, reviewers: e.reviews.length + 1, hash: e.hash,
    })).join('\n');
  }

  async function verifyChain() {
    let prev = '';
    for (const e of data.entries) {
      if (e.status === 'seed' || e.hash === 'seed') continue;
      if (e.prev_hash === undefined) continue; // mục nhập từ thiết bị khác
      const core = JSON.stringify({ id: e.id, kind: e.kind, content: e.content, author: e.author.key, created_at: e.created_at, prev: e.prev_hash });
      if (await U.sha256(core) !== e.hash) return { ok: false, id: e.id };
      prev = e.hash;
    }
    return { ok: true, last: prev };
  }

  function stats() {
    const s = { total: data.entries.length, byStatus: {}, byKind: {}, bySpecialty: {}, experts: new Set(), unsynced: 0 };
    data.entries.forEach((e) => {
      s.byStatus[e.status] = (s.byStatus[e.status] || 0) + 1;
      s.byKind[e.kind] = (s.byKind[e.kind] || 0) + 1;
      s.bySpecialty[e.specialty] = (s.bySpecialty[e.specialty] || 0) + 1;
      if (e.author.key !== 'seed') s.experts.add(e.author.key);
      e.reviews.forEach((r) => s.experts.add(r.reviewer_key));
      if (!e.synced.email) s.unsynced++;
    });
    s.experts = s.experts.size;
    return s;
  }

  function clearLocal() { data = { schema: 'evalaih.kb/1', entries: SEED.slice(), updated_at: new Date().toISOString() }; persist('clear'); }

  return { KINDS, SPECIALTIES, on, all, get, add, review, weight, markSynced, importBundle, exportJSON, exportJSONL, verifyChain, stats, getProfile, saveProfile, clearLocal };
})();
