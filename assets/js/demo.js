/* =============================================
   DATA
============================================= */
const PLT = {
  claude:  { name:'Claude Sonnet 4',   vendor:'Anthropic',  accent:'#F0A030', glow:'#F0A03015', dim:'#160E00' },
  gpt4o:   { name:'GPT-4o',            vendor:'OpenAI',     accent:'#1ED98A', glow:'#1ED98A15', dim:'#001A14' },
  gemini:  { name:'Gemini 1.5 Pro',    vendor:'Google',     accent:'#A78BFA', glow:'#A78BFA15', dim:'#100826' },
  copilot: { name:'Microsoft Copilot', vendor:'Microsoft',  accent:'#38BDF8', glow:'#38BDF815', dim:'#001626' },
};

const DOCS_MAP = {
  ambient:'Ambient Scribe — Business Plan Q1/2026',
  aios:'AIOSHealth OS Framework — Thuyết minh v2',
  evalaih:'EvalAIH Thuyết minh Giải pháp v2.0',
  investor:'HealthV Investor Deck — Series A 2026',
  market:'Digital Health VN Market Report 2025',
};

const VM = {
  VERIFIED:    { label:'✓ VERIFIED',    c:'#1ED98A', bg:'#021D10', bd:'#12402A' },
  RELIABLE:    { label:'◉ RELIABLE',    c:'#F5B93A', bg:'#1A1000', bd:'#3D2C00' },
  CONDITIONAL: { label:'⚡ CONDITIONAL', c:'#F07B44', bg:'#1A0C00', bd:'#3D2000' },
  HIGH_RISK:   { label:'▲ HIGH RISK',   c:'#F05050', bg:'#1A0000', bd:'#3D0000' },
  CAUTION:     { label:'◈ CAUTION',     c:'#F5B93A', bg:'#1A1000', bd:'#3D2C00' },
  REJECT:      { label:'✕ REJECT',      c:'#E8459E', bg:'#1A000E', bd:'#3D0026' },
};

const DB = {
  claude:[
    {id:1,claim:'Thị trường AI y tế toàn cầu đạt $928B vào 2035, CAGR 37.66%',type:'MARKET',mpvs:73,ecs:84,verdict:'CAUTION',htype:'Data Aggregation',analysis:'Nguồn tồn tại (Towards Healthcare 2024). Math check: $52.28B × (1.3766)¹² ≈ $903B — sai lệch 2.7% trong ngưỡng ±5%. Tuy nhiên CAGR 37.66% cao bất thường so với median ngành 18–22%. Dùng được nhưng cần disclaimer rõ ràng khi trình bày nhà đầu tư.'},
    {id:2,claim:'Luật AI 134/2025 bắt buộc human-in-the-loop với AI rủi ro cao trong y tế',type:'REGULATORY',mpvs:78,ecs:80,verdict:'RELIABLE',htype:'Cần đối chiếu điều khoản',analysis:'RELIABLE ◉ Luật Trí tuệ nhân tạo 134/2025/QH15 (hiệu lực 01/03/2026) quản lý AI theo mức rủi ro và yêu cầu cơ chế giám sát, can thiệp của con người. Số điều/khoản cụ thể cần đối chiếu nguyên văn trước khi trích dẫn. Khớp KB pháp lý BYT + HL7 FHIR AuditEvent requirement. An toàn sử dụng trong tài liệu chính thức.'},
    {id:3,claim:'Ambient Scribe giúp tiết kiệm 2–3 giờ/ngày cho bác sĩ theo nghiên cứu Stanford 2024',type:'CITATION',mpvs:31,ecs:93,verdict:'REJECT',htype:'Citation Phantom',analysis:'⛔ CITATION PHANTOM: CrossRef + PubMed search không tìm thấy nghiên cứu Stanford 2024 về Ambient Scribe. DOI không tồn tại. Nguồn thật có thể là Nuance DAX 2022 (1.4h/ngày, n=50 bác sĩ). KHÔNG dùng trong tài liệu chính thức — nguy cơ mất uy tín với investor sophisticated.'},
    {id:4,claim:'WTP bác sĩ VN cho Ambient Scribe: 300,000–599,000 VND/tháng',type:'MARKET',mpvs:22,ecs:96,verdict:'REJECT',htype:'Data Fabrication',analysis:'⛔ DATA FABRICATION: Không có survey nào (GSO, IQVIA, HealthV) xác nhận con số này. Assumption thuần túy không có evidence. KHÔNG dùng trong investor deck. Yêu cầu field survey ≥50 bác sĩ trước khi publish bất kỳ tài liệu nào.'},
    {id:5,claim:'HL7 FHIR R4 là tiêu chuẩn trao đổi dữ liệu y tế quốc tế',type:'CLINICAL',mpvs:96,ecs:98,verdict:'VERIFIED',htype:'—',analysis:'VERIFIED ✓ HL7 FHIR R4 published 2019 — tiêu chuẩn interoperability y tế quốc tế. Áp dụng tại Mỹ (21st Century Cures Act), EU, Australia. Việt Nam: đối chiếu văn bản BYT hiện hành về chuẩn trao đổi dữ liệu trước khi trích dẫn. Độ tin cậy cao.'},
  ],
  gpt4o:[
    {id:1,claim:'AI phát hiện ung thư vú với độ chính xác 94.5% theo McKinsey 2024',type:'CITATION',mpvs:41,ecs:89,verdict:'HIGH_RISK',htype:'Citation Phantom',analysis:'⚠️ HIGH RISK: McKinsey không publish nghiên cứu clinical accuracy. Số 94.5% thực ra từ Google DeepMind/Nature 2020 (mammography) — nguồn bị gán nhầm. Nguy hiểm cao nếu dùng trong tài liệu y tế hoặc investor deck.'},
    {id:2,claim:'Kháng kháng sinh gây 5 triệu tử vong/năm toàn cầu theo WHO 2022',type:'CLINICAL',mpvs:72,ecs:83,verdict:'RELIABLE',htype:'Source Error',analysis:'Gần đúng — sai nguồn: Lancet 2022 (không phải WHO) báo cáo 1.27M tử vong trực tiếp + 4.95M liên quan. Số 5M xấp xỉ đúng nhưng attribution sai. Cite đúng: Murray CJL et al., Lancet 2022.'},
    {id:3,claim:'NĐ 13/2023/NĐ-CP quy định phạt tối đa 100 triệu VND vi phạm dữ liệu cá nhân',type:'REGULATORY',mpvs:58,ecs:75,verdict:'CONDITIONAL',htype:'Vague Claim',analysis:'CONDITIONAL: Từ 01/01/2026 Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 có hiệu lực — cần kiểm tra hiệu lực còn lại của NĐ 13/2023. NĐ 13/2023 có quy định vi phạm dữ liệu nhưng mức phạt 100 triệu chưa verify điều khoản cụ thể. Legal expert review bắt buộc trước khi cite trong hợp đồng.'},
    {id:4,claim:'Thị trường Digital Health VN 2024 đạt 1.2 tỷ USD',type:'MARKET',mpvs:19,ecs:94,verdict:'REJECT',htype:'Data Fabrication',analysis:'⛔ DATA FABRICATION: $1.2B Digital Health VN 2024 không có nguồn xác nhận. Ước tính thực tế: $50–200M. Điển hình AI suy diễn global figures rồi áp vào VN — loại ảo giác nguy hiểm nhất.'},
  ],
  gemini:[
    {id:1,claim:'HL7 FHIR R4 là tiêu chuẩn WHO-certified cho trao đổi dữ liệu y tế',type:'CLINICAL',mpvs:71,ecs:82,verdict:'RELIABLE',htype:'Context Error',analysis:'Phần đúng: FHIR R4 là chuẩn HL7. Phần sai: WHO không "certify" FHIR — WHO recommends nhưng không cấp chứng nhận. Sửa: "tiêu chuẩn HL7 FHIR R4, được WHO khuyến nghị sử dụng". Sai lệch nhỏ nhưng quan trọng trong ngữ cảnh pháp lý.'},
    {id:2,claim:'Việt Nam có 1,578 bệnh viện công và 230 bệnh viện tư năm 2023',type:'STATISTICAL',mpvs:84,ecs:88,verdict:'VERIFIED',htype:'—',analysis:'VERIFIED ✓ Khớp Niên giám BYT 2023: 1,578 BV công. BV tư: 243 (không phải 230 — sai lệch nhỏ do cut-off date). Đủ chính xác cho context tổng quan, ghi rõ nguồn.'},
    {id:3,claim:'Deloitte 2026: 61% executives đã deploy hoặc budget AI agentic',type:'CITATION',mpvs:79,ecs:86,verdict:'RELIABLE',htype:'—',analysis:'RELIABLE ✓ Deloitte State of GenAI Q4 2025/Q1 2026 xác nhận 61% IT/business leaders có kế hoạch deploy AI agents. Lưu ý: "executives surveyed" ≠ toàn bộ doanh nghiệp. Ghi rõ context khi trích dẫn.'},
    {id:4,claim:'AI giảm 30% thời gian documentation bác sĩ tại bệnh viện Mỹ',type:'MARKET',mpvs:52,ecs:69,verdict:'CONDITIONAL',htype:'Vague Aggregation',analysis:'CONDITIONAL: Không có nghiên cứu đơn lẻ nào đo đúng "30% reduction". Sinsky et al. JAMA 2016 đo EHR burden; Nuance DAX 2022 đo AI reduction riêng lẻ. "30%" là aggregate — cần cite studies cụ thể.'},
  ],
  copilot:[
    {id:1,claim:'Tỷ lệ đái tháo đường tại Việt Nam là 7.3% dân số trưởng thành 2023',type:'CLINICAL',mpvs:74,ecs:81,verdict:'RELIABLE',htype:'Minor Deviation',analysis:'Gần đúng: IDF Diabetes Atlas 2023 = 6.0%; WHO STEPS VN 2022 = 7.1%. Con số 7.3% trong khoảng ước tính nhưng không khớp chính xác nguồn nào. Khuyến nghị: "ước tính 6–7.5% tùy phương pháp (IDF 2023, WHO STEPS 2022)".'},
    {id:2,claim:'ISO/IEC 42001:2023 là tiêu chuẩn quản lý AI đầu tiên được ISO công nhận',type:'REGULATORY',mpvs:93,ecs:95,verdict:'VERIFIED',htype:'—',analysis:'VERIFIED ✓ ISO/IEC 42001:2023 published December 2023 — AI Management System Standard đầu tiên của ISO. Claim hoàn toàn chính xác, an toàn sử dụng trong mọi tài liệu.'},
    {id:3,claim:'VinBrain đã huy động hơn 100 triệu USD từ nhà đầu tư quốc tế',type:'MARKET',mpvs:63,ecs:72,verdict:'CONDITIONAL',htype:'Unconfirmed',analysis:'Partially true: Bloomberg/TechCrunch 2022 đưa tin VinBrain nhận đầu tư từ GIC, SoftBank. Tổng >$100M có thể đúng nhưng VinBrain chưa xác nhận chính thức. Dùng được với caveat rõ.'},
    {id:4,claim:'Doanh thu telemedicine VN 2024 đạt 1.2 tỷ USD',type:'MARKET',mpvs:17,ecs:93,verdict:'REJECT',htype:'Data Fabrication',analysis:'⛔ DATA FABRICATION: $1.2B telemedicine VN 2024 vô lý về kinh tế. Mordor Intelligence 2024 ước tính VN ~$135–180M. Điển hình nhất của loại ảo giác Data Fabrication từ global figures.'},
  ],
};

const BM = [
  {nm:'MedQA (USMLE 4-option)',  src:'Jin et al. 2021',       c:88.2,g:90.1,m:86.7,x:82.3,h:87.0,low:false,intl:true},
  {nm:'MedMCQA (India entrance)', src:'Pal et al. 2022',       c:72.4,g:75.1,m:71.2,x:68.9,h:90.0,low:false,intl:true},
  {nm:'PubMedQA (biomedical QA)', src:'Jin et al. 2019',       c:78.9,g:80.4,m:76.3,x:73.1,h:78.0,low:false,intl:true},
  {nm:'MMLU Medical',             src:'Hendrycks et al. 2021', c:83.1,g:87.4,m:81.8,x:78.2,h:89.0,low:false,intl:true},
  {nm:'Citation Accuracy ↑',      src:'CrossRef/PubMed API',   c:68.4,g:65.2,m:63.8,x:59.1,h:97.0,low:false,intl:true},
  {nm:'Hallucination Rate ↓',     src:'EvalAIH internal ⚠️',   c:18.3,g:21.4,m:22.1,x:26.8,h:3.0, low:true, intl:false},
  {nm:'ClinicalBench VN ↑',       src:'EvalAIH internal ⚠️',   c:61.2,g:58.7,m:57.9,x:52.4,h:91.0,low:false,intl:false},
  {nm:'BYT Regulatory VN ↑',      src:'EvalAIH internal ⚠️',   c:54.1,g:47.3,m:51.8,x:43.6,h:88.0,low:false,intl:false},
  {nm:'Drug Safety BHYT 2025 ↑',  src:'EvalAIH internal ⚠️',   c:71.3,g:69.8,m:68.1,x:64.7,h:94.0,low:false,intl:false},
  {nm:'MPVS Composite ↑',         src:'EvalAIH Framework ⚠️',  c:68.0,g:65.0,m:64.0,x:61.0,h:92.0,low:false,intl:false},
];

const STAGES = [
  'Khởi tạo Knowledge Base Engine…',
  'Phân tích cấu trúc tài liệu…',
  'Trích xuất Claims đơn vị…',
  'Tra cứu CrossRef & PubMed API…',
  'Kiểm chứng KB BYT Việt Nam…',
  'Đối chiếu Luật AI 134/2025…',
  'Chạy 5 Verification Agents song song…',
  'Tổng hợp MPVS Scoring…',
  'Meta-Evaluation — tính ECS…',
  'Hoàn thiện báo cáo EvalAIH…',
];

const PIDS = ['claude','gpt4o','gemini','copilot'];
const ACCENTS = ['#F0A030','#1ED98A','#A78BFA','#38BDF8'];
const TICOMAP = {CITATION:'📚',CLINICAL:'🏥',REGULATORY:'⚖️',MARKET:'📈',STATISTICAL:'📊'};

/* =============================================
   STATE
============================================= */
let S = { step:1, pid:null, doc:null, upload:null, uploadText:null };

function sc(v,low=false){ const s=low?100-v:v; return s>=75?'#1ED98A':s>=55?'#F5B93A':'#F05050'; }
function avg(arr,k){ return Math.round(arr.reduce((a,x)=>a+x[k],0)/arr.length); }

/* =============================================
   SCREEN NAVIGATION
============================================= */
function showScreen(n){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s'+n).classList.add('on');
  S.step=n;
  updateStepper();
  document.getElementById('resetBtn').style.display=n>1?'inline-block':'none';
  window.scrollTo({top:0,behavior:'smooth'});
}

function updateStepper(){
  for(let i=1;i<=4;i++){
    const dot=document.getElementById('sd'+i),lbl=document.getElementById('sl'+i);
    dot.className='stp-dot';lbl.className='stp-lbl';
    if(i<S.step){dot.classList.add('done');}
    else if(i===S.step){dot.classList.add('now');lbl.classList.add('now');}
    if(i<4){const bar=document.getElementById('sb'+i);bar.className='stp-bar'+(i<S.step?' done':'');}
  }
}

function goS1(){showScreen(1);}

function goS2(){
  if(!S.pid)return;
  const p=PLT[S.pid];
  document.getElementById('s2dot').style.background=p.accent;
  document.getElementById('s2lbl').textContent='BƯỚC 02 / 04 — '+p.name.toUpperCase();
  const acc=document.getElementById('s2accent');
  acc.style.cssText=`background:linear-gradient(90deg,${p.accent},${p.accent}BB);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text`;
  showScreen(2);
}

/* =============================================
   STEP 1 — PLATFORM
============================================= */
function selectPlt(id){
  S.pid=id;
  const p=PLT[id];
  PIDS.forEach(pid=>{
    const card=document.getElementById('pc-'+pid);
    const ico=document.getElementById('pi-'+pid);
    const pp=PLT[pid];
    if(pid===id){
      card.style.cssText=`border-color:${p.accent};box-shadow:0 0 0 1px ${p.accent},0 0 26px ${p.glow};background:${p.dim}`;
      ico.style.background=p.glow;ico.style.borderColor=p.accent+'70';
      card.querySelector('.plt-nm').style.color='#EBF2FA';
      let chk=card.querySelector('.plt-chk');
      if(!chk){chk=document.createElement('div');chk.className='plt-chk';card.appendChild(chk);}
      chk.style.background=p.accent;chk.textContent='✓';
    }else{
      card.style.cssText='';ico.style.cssText=`background:${pp.dim};border-color:${pp.accent}40;color:${pp.accent}`;
      card.querySelector('.plt-nm').style.cssText='';
      const chk=card.querySelector('.plt-chk');if(chk)chk.remove();
    }
  });
  const btn=document.getElementById('btn12');
  btn.disabled=false;
  btn.style.background=`linear-gradient(135deg,${p.accent}EE,${p.accent}AA)`;
  btn.style.color='#000';
}

/* =============================================
   STEP 2 — DOCUMENT
============================================= */
function selectDoc(id){
  S.doc=id;S.upload=null;
  const p=PLT[S.pid];
  ['ambient','aios','evalaih','investor','market'].forEach(d=>{
    const r=document.getElementById('dr-'+d);
    if(d===id){r.style.borderColor=p.accent;r.style.background='var(--bg2)';}
    else{r.style.borderColor='';r.style.background='';}
  });
  document.getElementById('btn23').disabled=false;
}

function doFile(inp){
  const f=inp.files[0];if(!f)return;
  S.upload=f.name;S.doc=null;S.uploadText=null;
  if(f.size>5*1024*1024){U.toast('File lớn hơn 5 MB — vui lòng chọn file nhỏ hơn.','err');return;}
  if(/\.(txt|md)$/i.test(f.name)){const rd=new FileReader();rd.onload=()=>{S.uploadText=String(rd.result||'');};rd.readAsText(f,'utf-8');}
  ['ambient','aios','evalaih','investor','market'].forEach(d=>{
    const r=document.getElementById('dr-'+d);r.style.borderColor='';r.style.background='';
  });
  const p=PLT[S.pid];
  document.getElementById('upContent').innerHTML=
    `<div style="font-size:32px;margin-bottom:10px">📄</div>
     <div style="font-size:15px;font-weight:700;color:#EBF2FA;margin-bottom:7px;word-break:break-all">${U.esc(f.name)}</div>
     <span style="padding:3px 14px;background:#021D10;color:#1ED98A;border-radius:20px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace">Sẵn sàng phân tích</span>`;
  document.getElementById('upBox').style.borderColor=p.accent;
  document.getElementById('btn23').disabled=false;
}

function doDrop(e){
  e.preventDefault();
  document.getElementById('upBox').classList.remove('drag');
  const f=e.dataTransfer.files[0];if(!f)return;
  const dt=new DataTransfer();dt.items.add(f);
  const fi=document.getElementById('fi');fi.files=dt.files;doFile(fi);
}

/* =============================================
   STEP 3 — SCANNING
============================================= */
function startScan(){
  if(!S.pid||(!S.doc&&!S.upload))return;
  const p=PLT[S.pid];
  document.getElementById('or1').style.color=p.accent;
  document.getElementById('or2').style.color='#4293FF';
  document.getElementById('or3').style.color='#7B6FFF';
  document.getElementById('sLine').style.background=`linear-gradient(90deg,transparent,${p.accent},transparent)`;
  document.getElementById('sPct').style.color=p.accent;
  showScreen(3);
  let i=0;
  const iv=setInterval(()=>{
    i++;
    document.getElementById('sPct').textContent=i*10+'%';
    document.getElementById('pFill').style.width=i*10+'%';
    document.getElementById('sStg').textContent=STAGES[Math.min(i-1,9)];
    document.getElementById('sStg').style.color=p.accent;
    if(i>=2){const ag=document.getElementById('ag'+(i-2));if(ag){ag.style.borderColor='#1A2B3C';ag.style.color='var(--t3)';ag.querySelector('.agent-dot').style.background='#1ED98A';}}
    if(i>=10){clearInterval(iv);setTimeout(()=>buildResults(S.pid,S.doc||S.upload),400);}
  },360);
}

/* =============================================
   STEP 4 — RESULTS
============================================= */
function buildResults(pid,docKey){
  const claims=DB[pid],p=PLT[pid];
  const mpvs=avg(claims,'mpvs'),ecs=avg(claims,'ecs');
  const vm=mpvs>=75?VM.VERIFIED:mpvs>=55?VM.RELIABLE:mpvs>=40?VM.CONDITIONAL:VM.REJECT;

  document.getElementById('rdot').style.background=p.accent;
  document.getElementById('rbadge').textContent='EVALAIH — '+p.name.toUpperCase();
  document.getElementById('rdoc').textContent=DOCS_MAP[docKey]||docKey;
  const dn=document.getElementById('demoNotice');
  dn.innerHTML=S.upload
    ? `<b>Chế độ Demo:</b> kết quả bên dưới là <b>dữ liệu mẫu minh họa</b> của ${U.esc(p.name)}, chưa phân tích nội dung file “${U.esc(S.upload)}”. ${S.uploadText?'<button class="btn-tiny" data-action="demo-to-live">Phân tích nội dung thật ở tab Đánh giá trực tiếp →</button>':'Để phân tích thật, dán nội dung vào tab <a href="#live">Đánh giá trực tiếp</a> (hỗ trợ TXT/MD).'}`
    : `<b>Chế độ Demo:</b> kết quả bên dưới là <b>dữ liệu mẫu minh họa</b> đã tính sẵn cho ${U.esc(p.name)} — không phải kết quả phân tích tài liệu theo thời gian thực.`;
  document.getElementById('clCnt').textContent=claims.length;

  const pass=claims.filter(c=>['VERIFIED','RELIABLE'].includes(c.verdict)).length;
  const warn=claims.filter(c=>['CONDITIONAL','CAUTION'].includes(c.verdict)).length;
  const fail=claims.filter(c=>['REJECT','HIGH_RISK'].includes(c.verdict)).length;
  document.getElementById('statRow').innerHTML=[
    {n:pass,l:'Đạt chuẩn',c:'#1ED98A',bg:'#021D10',bc:'#1ED98A25'},
    {n:warn,l:'Cảnh báo', c:'#F5B93A',bg:'#1A1000',bc:'#F5B93A25'},
    {n:fail,l:'Từ chối',  c:'#F05050',bg:'#1A0000',bc:'#F0505025'},
  ].map(s=>`<div class="stat-chip" style="background:${s.bg};border-color:${s.bc}">
    <span class="chip-n" style="color:${s.c}">${s.n}</span>
    <span class="chip-l" style="color:${s.c}99">${s.l}</span>
  </div>`).join('');

  const mc=document.getElementById('mpvsCard');
  mc.style.borderColor=vm.bd;
  mc.style.setProperty('--glow',vm.c+'18');
  const arc=document.getElementById('mpvsArc');
  const circ=2*Math.PI*35;
  arc.style.stroke=sc(mpvs);
  setTimeout(()=>{arc.style.strokeDasharray=`${(mpvs/100)*circ} 999`;},120);
  const mn=document.getElementById('mpvsNum');mn.textContent=mpvs;mn.style.color=sc(mpvs);
  const mv=document.getElementById('mpvsVerd');mv.textContent=vm.label;
  mv.style.cssText=`color:${vm.c};background:${vm.bg};border-color:${vm.bd};display:inline-block;padding:4px 13px;border-radius:6px;font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:700;border-width:1px;border-style:solid;margin-bottom:9px`;
  document.getElementById('mpvsEcs').textContent=`ECS ${ecs}% tin cậy`;

  document.getElementById('sumCards').innerHTML=[
    {ico:'🔍',n:claims.length,l:'Total Claims',c:'#334F6A'},
    {ico:'✓', n:claims.filter(c=>c.mpvs>=70).length,l:'Score ≥70',c:'#1ED98A'},
    {ico:'⚡',n:claims.filter(c=>c.mpvs>=40&&c.mpvs<70).length,l:'Cần review',c:'#F5B93A'},
    {ico:'✕', n:claims.filter(c=>c.mpvs<40).length,l:'Từ chối',c:'#F05050'},
  ].map(s=>`<div class="sum-card">
    <div class="sum-ico">${s.ico}</div>
    <div class="sum-n" style="color:${s.c}">${s.n}</div>
    <div class="sum-l">${s.l}</div>
  </div>`).join('');

  document.getElementById('clList').innerHTML=claims.map(c=>{
    const v=VM[c.verdict];
    const ico=TICOMAP[c.type]||'📊';
    return `<div class="cl-card" id="cl-${c.id}" data-cl="${c.id}" data-bd="${v.bd}" role="button" tabindex="0" aria-expanded="false">
      <div class="cl-top">
        <div class="cl-ico">${ico}</div>
        <div class="cl-body">
          <div class="cl-badges">
            <span class="v-badge" style="color:${v.c};background:${v.bg};border-color:${v.bd}">${v.label}</span>
            <span class="cl-tag" style="background:#0C1220;color:#334F6A;border:1px solid #1A2B3C">${c.type}</span>
            ${c.htype!=='—'?`<span class="cl-tag" style="background:#0E0820;color:#9070E0;border:1px solid #261848">${c.htype}</span>`:''}
          </div>
          <p class="cl-text">"${c.claim}"</p>
          <div class="cl-bar-row">
            <span class="cl-bar-lbl">MPVS</span>
            <div class="cl-bar-tr"><div class="cl-bar-fl" data-w="${c.mpvs}" style="width:0;background:${sc(c.mpvs)}"></div></div>
            <span class="cl-bar-val" style="color:${sc(c.mpvs)}">${c.mpvs}</span>
          </div>
        </div>
        <span class="cl-chev" id="chv-${c.id}">▾</span>
      </div>
      <div class="cl-detail" id="det-${c.id}" style="display:none">
        <div class="det-grid">
          <div class="det-box">
            <div class="det-hd">PHÂN TÍCH EVALAIH</div>
            <p class="det-txt">${c.analysis}</p>
          </div>
          <div class="det-box">
            <div class="det-hd">TECHNICAL METRICS</div>
            ${[['MPVS Score',c.mpvs+'/100'],['Verdict',v.label],['Claim Type',c.type],['Hallucination',c.htype],['ECS',c.ecs+'% confidence']].map(([k,val])=>
              `<div class="met-row"><span class="met-k">${k}</span><span class="met-v">${val}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  setTimeout(()=>{
    document.querySelectorAll('.cl-bar-fl').forEach(b=>{
      const w=b.dataset.w;
      b.style.transition='width 1.2s cubic-bezier(.4,0,.2,1)';
      b.style.width=w+'%';
    });
  },180);

  buildBm(pid);
  buildReport(pid,claims,mpvs,ecs,vm,p);
  showScreen(4);
}

function toggleCl(id,bd){
  const det=document.getElementById('det-'+id);
  const chv=document.getElementById('chv-'+id);
  const card=document.getElementById('cl-'+id);
  const open=det.style.display!=='none';
  det.style.display=open?'none':'block';
  card.setAttribute('aria-expanded',String(!open));
  chv.style.transform=open?'':'rotate(180deg)';
  card.style.borderColor=open?'var(--border)':bd;
}

/* =============================================
   BENCHMARK
============================================= */
function buildBm(activePid){
  document.getElementById('bmLegend').innerHTML=
    [...PIDS.map((id,i)=>`<div class="bm-leg-item" style="opacity:${id===activePid?1:.4}">
      <div class="bm-leg-dot" style="background:${ACCENTS[i]}"></div>
      <span class="bm-leg-nm">${PLT[id].name}</span>
    </div>`),'<div class="bm-leg-item"><div class="bm-leg-dot" style="background:#5A7A96"></div><span class="bm-leg-nm">Human Expert</span></div>'].join('');
  renderBmTable('bmIntl',BM.filter(r=>r.intl),activePid);
  renderBmTable('bmInternal',BM.filter(r=>!r.intl),activePid);
}

function renderBmTable(elId,rows,activePid){
  const el=document.getElementById(elId);
  const heads=['Metric','Claude 4','GPT-4o','Gemini 1.5','Copilot','Human'];
  el.innerHTML=`<div class="bm-head">${heads.map(h=>`<div class="bm-th">${h}</div>`).join('')}</div>`+
    rows.map(row=>{
      const vals=[row.c,row.g,row.m,row.x];
      const best=row.low?Math.min(...vals):Math.max(...vals);
      const dataCells=[row.c,row.g,row.m,row.x,row.h].map((v,j)=>{
        const isBest=v===best&&j<4,isAct=j<4&&PIDS[j]===activePid;
        const col=j<4?ACCENTS[j]:'#5A7A96';
        return `<div class="bm-td bm-vc" style="${isAct?'background:rgba(20,34,54,.5)':''}">
          <span class="bm-val${isBest?' best':''}" style="color:${isBest?col:'#334F6A'}">${v}</span>
          <div class="bm-bar"><div class="bm-bar-fill" style="width:${v}%;background:${col};opacity:${isBest?1:.28}"></div></div>
          ${isBest?`<span class="bm-bl" style="color:${col}">BEST</span>`:''}
        </div>`;
      }).join('');
      return `<div class="bm-row">
        <div class="bm-td"><div class="bm-mn">${row.nm}</div><div class="bm-src">${row.src}</div></div>
        ${dataCells}
      </div>`;
    }).join('');
}

/* =============================================
   REPORT
============================================= */
function buildReport(pid,claims,mpvs,ecs,vm,p){
  const today=new Date().toLocaleDateString('vi-VN');
  document.getElementById('rptSub').textContent=`HealthV MedTech · Confidential · ${today}`;
  const rv=document.getElementById('rptVerd');
  rv.textContent=`MPVS ${mpvs}/100 · ${vm.label}`;
  rv.style.cssText=`color:${vm.c};background:${vm.bg};border-color:${vm.bd};font-size:11px;padding:5px 14px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-weight:700;border:1px solid`;

  document.getElementById('rptGrid').innerHTML=[
    ['Platform',p.name],['MPVS Score',mpvs+'/100'],['ECS',ecs+'%'],
    ['Tổng Claims',claims.length],['Đạt ≥70',claims.filter(c=>c.mpvs>=70).length+'/'+claims.length],['Verdict',vm.label],
  ].map(([k,v])=>`<div class="rpt-cell"><div class="rpt-ck">${k}</div><div class="rpt-cv">${v}</div></div>`).join('');

  document.getElementById('rptClaims').innerHTML=claims.map(c=>{
    const v=VM[c.verdict];
    return `<div class="rpt-cl" style="border-color:${v.bd}">
      <div class="rpt-cl-badges">
        <span class="v-badge" style="color:${v.c};background:${v.bg};border-color:${v.bd}">${v.label}</span>
        <span class="cl-tag" style="background:#0C1220;color:#334F6A;border:1px solid #1A2B3C">${c.type}</span>
        ${c.htype!=='—'?`<span class="cl-tag" style="background:#0E0820;color:#9070E0;border:1px solid #261848">${c.htype}</span>`:''}
        <span style="margin-left:auto;font-size:9px;color:var(--t4);font-family:'JetBrains Mono',monospace">MPVS ${c.mpvs} · ECS ${c.ecs}%</span>
      </div>
      <p class="rpt-cl-txt">"${c.claim}"</p>
      <p class="rpt-cl-ana">${c.analysis}</p>
    </div>`;
  }).join('');

  document.getElementById('metaTxt').innerHTML=
    `EvalAIH tự tin <strong style="color:#EBF2FA">${ecs}%</strong> vào kết quả kiểm chứng trên. Phần còn lại cần expert human review — đặc biệt với claims thị trường VN-specific và pháp lý mới ban hành. EvalAIH <strong style="color:#F05050">KHÔNG THAY THẾ</strong> chuyên gia y tế hoặc tư vấn pháp lý chuyên nghiệp.`;
}

/* =============================================
   TABS
============================================= */
function swTab(id,btn){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tb').forEach(b=>b.classList.remove('on'));
  document.getElementById('tp-'+id).classList.add('on');
  btn.classList.add('on');
}

/* =============================================
   UTILS
============================================= */
function doJson(){
  const data=JSON.stringify({mode:'demo_sample',platform:S.pid,doc:S.doc||S.upload,claims:DB[S.pid],disclaimer:EVALAI_CONFIG.DISCLAIMER_VI},null,2);
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(data).then(()=>U.toast('Đã copy JSON vào clipboard.')).catch(()=>U.download('evalaih-demo.json',data));
  }else{U.download('evalaih-demo.json',data);}
}

function resetApp(){
  S={step:1,pid:null,doc:null,upload:null,uploadText:null};
  document.getElementById('fi').value='';
  PIDS.forEach(pid=>{
    const card=document.getElementById('pc-'+pid);
    const ico=document.getElementById('pi-'+pid);
    const pp=PLT[pid];
    card.style.cssText='';
    ico.style.cssText=`background:${pp.dim};border-color:${pp.accent}40;color:${pp.accent}`;
    card.querySelector('.plt-nm').style.cssText='';
    const chk=card.querySelector('.plt-chk');if(chk)chk.remove();
  });
  document.getElementById('btn12').disabled=true;
  document.getElementById('btn12').style.cssText='';
  ['ambient','aios','evalaih','investor','market'].forEach(d=>{
    const r=document.getElementById('dr-'+d);r.style.cssText='';
  });
  document.getElementById('upContent').innerHTML=
    `<div class="upload-ico">⬆</div>
     <div class="upload-head">Kéo thả hoặc click để upload</div>
     <div class="upload-hint">Hỗ trợ PDF · DOCX · PPTX · TXT</div>`;
  document.getElementById('upBox').style.borderColor='';
  document.getElementById('btn23').disabled=true;
  for(let i=0;i<5;i++){
    const ag=document.getElementById('ag'+i);
    if(ag){ag.style.cssText='';ag.querySelector('.agent-dot').style.cssText='';}
  }
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('on'));
  document.getElementById('tp-claims').classList.add('on');
  document.querySelectorAll('.tb').forEach((b,i)=>{b.classList.remove('on');if(i===0)b.classList.add('on');});
  showScreen(1);
}


/* =============================================
   BINDINGS (không dùng onclick nội tuyến — tương thích CSP)
============================================= */
function demoInit(){
  U.$$('[data-plt]').forEach(el=>{
    el.addEventListener('click',()=>selectPlt(el.dataset.plt));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPlt(el.dataset.plt);}});
  });
  U.$$('[data-doc]').forEach(el=>{
    el.addEventListener('click',()=>selectDoc(el.dataset.doc));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectDoc(el.dataset.doc);}});
  });
  const up=document.getElementById('upBox'),fi=document.getElementById('fi');
  up.addEventListener('click',()=>fi.click());
  up.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fi.click();}});
  up.addEventListener('dragover',e=>{e.preventDefault();up.classList.add('drag');});
  up.addEventListener('dragleave',()=>up.classList.remove('drag'));
  up.addEventListener('drop',doDrop);
  fi.addEventListener('change',()=>doFile(fi));
  document.getElementById('btn12').addEventListener('click',goS2);
  document.getElementById('btn23').addEventListener('click',startScan);
  document.getElementById('btnBack1').addEventListener('click',goS1);
  document.getElementById('resetBtn').addEventListener('click',resetApp);
  U.$$('.tb[data-tab]').forEach(b=>b.addEventListener('click',()=>swTab(b.dataset.tab,b)));
  document.getElementById('btnPdf').addEventListener('click',()=>window.print());
  document.getElementById('btnJson').addEventListener('click',doJson);
  document.getElementById('btnNew').addEventListener('click',resetApp);
  const cl=document.getElementById('clList');
  const tog=e=>{const card=e.target.closest('[data-cl]');if(card)toggleCl(Number(card.dataset.cl),card.dataset.bd);};
  cl.addEventListener('click',tog);
  cl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog(e);}});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-action="demo-to-live"]')&&S.uploadText){App.goLive(S.uploadText,PLT[S.pid].name);}
  });
}
