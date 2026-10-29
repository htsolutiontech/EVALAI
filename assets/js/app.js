/* =============================================================
   EvalAIH — khởi tạo ứng dụng & điều hướng
============================================================= */
'use strict';

const App = (() => {
  const C = window.EVALAI_CONFIG;
  const VIEWS = ['demo', 'live', 'agent', 'feedback'];

  function show(view, push = true) {
    if (!VIEWS.includes(view)) view = 'demo';
    VIEWS.forEach((v) => { U.$('#view-' + v).hidden = v !== view; });
    U.$$('#mainnav a[data-view]').forEach((a) => { a.classList.toggle('on', a.dataset.view === view); a.setAttribute('aria-current', a.dataset.view === view ? 'page' : 'false'); });
    U.$('#stepper').style.visibility = view === 'demo' ? 'visible' : 'hidden';
    U.$('#resetBtn').style.display = view === 'demo' && S.step > 1 ? 'inline-block' : 'none';
    if (push && location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    document.title = { demo: 'Demo kiểm chứng', live: 'Đánh giá trực tiếp', agent: 'Agent chuyên gia', feedback: 'Góp ý & đánh giá' }[view] + ' — EvalAIH | HealthV';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goLive(text, platform) { show('live'); Live.load(text, platform); U.toast('Đã chuyển nội dung file sang Đánh giá trực tiếp.'); }
  function goFeedback(pre) { show('feedback'); Feedback.prefill(pre || {}); }

  function liveBadge() {
    const s = KB.stats();
    U.$('#kbLiveTxt').textContent = `KB Live · ${s.total}`;
    U.$('#kbLiveTxt').title = `${s.byStatus.validated || 0} mục đã đồng thuận · ${s.experts} chuyên gia`;
  }

  function init() {
    U.$$('[data-disclaimer]').forEach((el) => { el.textContent = C.DISCLAIMER_VI; });
    U.$$('[data-disclaimer-en]').forEach((el) => { el.textContent = C.DISCLAIMER_EN; });
    U.$$('[data-email]').forEach((el) => { el.textContent = C.RECIPIENT_EMAIL; });
    U.$$('[data-email-link]').forEach((el) => { el.textContent = C.RECIPIENT_EMAIL; el.href = 'mailto:' + C.RECIPIENT_EMAIL; });
    U.$('#verPill').textContent = 'MVP v' + C.VERSION;
    U.$('#ftVer').textContent = 'v' + C.VERSION + ' (' + C.BUILD_DATE + ')';

    demoInit();
    Live.init();
    Agent.init();
    Feedback.init();

    U.$$('#mainnav a[data-view]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(a.dataset.view); }));
    window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
    show(location.hash.slice(1) || 'demo', false);

    liveBadge();
    KB.on(liveBadge);
    setTimeout(() => Mailer.flush(), 2500);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { show, goLive, goFeedback };
})();
