/* 마취 시뮬레이터 베타 1.1 — 공통 설정 + 7단계 팝업(완료 도장) + 메인화면 확인 팝업 + 튜토리얼 블러 + SPA 전환 */
(function () {
  const KEY_FONT = 'vet_b11_font_size';   // '0' (소) | '1' (중) | '2' (대)
  const KEY_SOUND = 'vet_b11_sound';      // 'on' | 'off'
  const KEY_FS = 'vet_b11_fullscreen';    // 'on' | 'off'
  const KEY_PROG = 'vet_b11_progress';    // JSON: { ch1: { tutorial: true, ... }, ... }

  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isSoundOn() {
    try { return localStorage.getItem(KEY_SOUND) !== 'off'; } catch { return true; }
  }

  function isFullscreenOn() {
    const nativeFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    try { return nativeFs || localStorage.getItem(KEY_FS) === 'on'; } catch { return nativeFs; }
  }

  function setFullscreenPref(on) {
    try { localStorage.setItem(KEY_FS, on ? 'on' : 'off'); } catch {}
    if (document.body) document.body.classList.toggle('b11-immersive', Boolean(on));
  }

  function applySavedFullscreen() {
    if (!isFullscreenOn()) return;
    if (document.body) {
      document.body.classList.add('b11-immersive');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (isFullscreenOn()) document.body.classList.add('b11-immersive');
      }, { once: true });
    }
  }

  const GRADE_RANK = { F: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
  const STAGE_PREREQ = {
    tutorial: null,
    asymp_dog: null,
    mild_dog: 'asymp_dog',
    geriatric_dog: 'mild_dog',
    severe_dog: 'geriatric_dog',
    emerg_dog: 'severe_dog',
    asymp_cat: null,
    mild_cat: 'asymp_cat',
    geriatric_cat: 'mild_cat',
    severe_cat: 'geriatric_cat',
    emerg_cat: 'severe_cat',
    practice_dog: 'tutorial',
    practice_cat: 'tutorial'
  };

  function getProgressMap() {
    try { return JSON.parse(localStorage.getItem(KEY_PROG) || '{}') || {}; } catch { return {}; }
  }

  function getStageResult(chNum, stageId) {
    const map = getProgressMap();
    const raw = map['ch' + chNum] && map['ch' + chNum][stageId];
    if (!raw) return null;
    if (raw === true) {
      return { done: true, stamp: stageId === 'tutorial' ? '완료' : 'A', score: 90 };
    }
    if (typeof raw === 'object') {
      return {
        done: Boolean(raw.done !== false),
        stamp: String(raw.stamp || (stageId === 'tutorial' ? '완료' : '')),
        score: Number(raw.score || 0)
      };
    }
    return null;
  }

  function isStageComplete(chNum, stageId) {
    const res = getStageResult(chNum, stageId);
    return Boolean(res && res.done);
  }

  function isStageUnlocked(chNum, stageId) {
    if (!Object.prototype.hasOwnProperty.call(STAGE_PREREQ, stageId)) return true;
    const req = STAGE_PREREQ[stageId];
    if (!req) return true;
    return isStageComplete(chNum, req);
  }

  function saveStageResult(chNum, stageId, payload = {}) {
    const map = getProgressMap();
    const k = 'ch' + chNum;
    map[k] = map[k] || {};
    const prev = getStageResult(chNum, stageId);
    const score = Math.max(0, Math.min(100, Math.round(Number(payload.score ?? 100))));
    let next;

    if (stageId === 'tutorial') {
      next = { done: true, stamp: '완료', score: 100 };
    } else if (stageId === 'practice_dog' || stageId === 'practice_cat') {
      const bestScore = prev ? Math.max(prev.score || 0, score) : score;
      next = { done: true, stamp: String(bestScore), score: bestScore };
    } else {
      const grade = String(payload.grade || payload.stamp || 'F').toUpperCase();
      const prevRank = prev ? (GRADE_RANK[prev.stamp] || 0) : 0;
      const curRank = GRADE_RANK[grade] || 0;
      const bestGrade = curRank >= prevRank ? grade : prev.stamp;
      const bestScore = prev ? Math.max(prev.score || 0, score) : score;
      next = { done: true, stamp: bestGrade, score: bestScore };
    }

    map[k][stageId] = next;
    try { localStorage.setItem(KEY_PROG, JSON.stringify(map)); } catch {}
    return next;
  }

  function markStageComplete(chNum, stageId) {
    return saveStageResult(chNum, stageId, {
      stamp: stageId === 'tutorial' ? '완료' : 'A',
      grade: 'A',
      score: stageId === 'tutorial' ? 100 : 90
    });
  }

  function triggerStageGlow() {
    const btn = document.getElementById('ch-btn-stage');
    if (btn) btn.classList.add('stage-glow');
  }

  function clearStageGlow() {
    const btn = document.getElementById('ch-btn-stage');
    if (btn) btn.classList.remove('stage-glow');
  }

  function playTone(freq = 540, dur = 0.06, vol = 0.04) {
    if (!isSoundOn()) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }

  function getFontLevel() {
    try {
      const v = localStorage.getItem(KEY_FONT);
      return v === '0' || v === '1' || v === '2' ? Number(v) : 1;
    } catch { return 1; }
  }

  function applyFontLevel(lv) {
    const n = Math.max(0, Math.min(2, Number(lv)));
    const cls = ['b11-font-sm', 'b11-font-md', 'b11-font-lg'];
    document.documentElement.classList.remove(...cls);
    document.documentElement.classList.add(cls[n]);
    try { localStorage.setItem(KEY_FONT, String(n)); } catch {}
    return n;
  }

  function setSound(on) {
    try { localStorage.setItem(KEY_SOUND, on ? 'on' : 'off'); } catch {}
    if (on) playTone(620, 0.07, 0.045);
    return on;
  }

  async function toggleFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const targetOn = !(isFullscreenOn() || Boolean(fsEl));
    setFullscreenPref(targetOn);
    try {
      if (!targetOn && fsEl) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } else if (targetOn && !fsEl) {
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }).catch(() => el.requestFullscreen());
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {}
    return targetOn;
  }

  const onFsChange = () => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl && document.body && document.body.classList.contains('b11-immersive')) {
      setFullscreenPref(false);
    }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* Always share canonical main simulator link (index2.html) */
  async function shareSimulator() {
    let url = window.location.href.split('#')[0];
    try { url = new URL('index2.html', window.location.href).href; } catch {}
    const title = '수의 마취 시뮬레이터 (Beta 1.1)';
    const text = '수의 마취 자기 주도적 학습 시뮬레이터';
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return { method: 'native', ok: true };
      } catch (e) {
        if (e && e.name === 'AbortError') return { method: 'cancel', ok: false };
      }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return { method: 'clipboard', ok: true };
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return { method: 'clipboard', ok: true };
    } catch {
      return { method: 'fail', ok: false };
    }
  }

  /* Seamless SPA navigation between index2.html and chapter1~5.html so mobile native Fullscreen NEVER exits */
  const BETA11_PAGES = /^(index2|chapter[1-5])\.html$/i;
  let navBusy = false;

  async function navigateTo(url, opts = {}) {
    const push = opts.push !== false;
    const cleanFile = String(url || '').split('?')[0].split('#')[0].split('/').pop();
    if (!BETA11_PAGES.test(cleanFile) || window.location.protocol === 'file:') {
      window.location.href = url;
      return;
    }
    if (navBusy) return;
    navBusy = true;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newShell = doc.querySelector('.app-shell');
      const curShell = document.querySelector('.app-shell');
      if (!newShell || !curShell) throw new Error('Missing app-shell');

      document.querySelectorAll('.modal-backdrop, #ch-modal-host, .tut-backdrop, .tut-callout').forEach((el) => el.remove());

      document.title = doc.title || document.title;
      curShell.replaceWith(document.importNode(newShell, true));

      doc.querySelectorAll('body > .modal-backdrop').forEach((m) => {
        document.body.appendChild(document.importNode(m, true));
      });

      const extScripts = Array.from(doc.querySelectorAll('script[src]'));
      for (const sc of extScripts) {
        const src = sc.getAttribute('src');
        if (!src || /beta11-settings\.js$/i.test(src)) continue;
        const already = Array.from(document.querySelectorAll('script[src]')).some((el) => el.getAttribute('src') === src);
        if (!already) {
          await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
          });
        }
      }

      const scripts = Array.from(doc.querySelectorAll('body script:not([src])'));
      for (const sc of scripts) {
        const code = sc.textContent || '';
        if (code.trim()) new Function(code)();
      }

      if (push) history.pushState({ beta11: true, url }, '', url);
      window.scrollTo(0, 0);
      applyFontLevel(getFontLevel());
      if (isFullscreenOn()) document.body.classList.add('b11-immersive');
    } catch {
      window.location.href = url;
    } finally {
      navBusy = false;
    }
  }

  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.classList.contains('menu-btn')) return;
    const href = a.getAttribute('href') || '';
    const file = href.split('?')[0].split('#')[0].split('/').pop();
    if (BETA11_PAGES.test(file)) {
      e.preventDefault();
      navigateTo(href, { push: true });
    }
  });

  window.addEventListener('popstate', () => {
    const file = window.location.pathname.split('/').pop() || 'index2.html';
    if (BETA11_PAGES.test(file)) navigateTo(file, { push: false });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((m) => m.classList.add('hidden'));
      document.querySelectorAll('.menu-btn.fade-out-lr').forEach((b) => b.classList.remove('fade-out-lr'));
    }
  });

  /* Default Stage Rows: 튜토리얼 (단독) + 케이스 5종(개/고양이 좌우) + 실전(개/고양이 좌우) */
  const DEFAULT_STAGE_ROWS = [
    [{ id: 'tutorial', name: '튜토리얼' }],
    [{ id: 'asymp_dog', name: '무증상 (개)' },     { id: 'asymp_cat', name: '무증상 (고양이)' }],
    [{ id: 'mild_dog', name: '경증 (개)' },        { id: 'mild_cat', name: '경증 (고양이)' }],
    [{ id: 'geriatric_dog', name: '노령 (개)' },   { id: 'geriatric_cat', name: '노령 (고양이)' }],
    [{ id: 'severe_dog', name: '중증 (개)' },      { id: 'severe_cat', name: '중증 (고양이)' }],
    [{ id: 'emerg_dog', name: '응급 (개)' },       { id: 'emerg_cat', name: '응급 (고양이)' }],
    [{ id: 'practice_dog', name: '실전 (개)' },    { id: 'practice_cat', name: '실전 (고양이)' }]
  ];

  /* Mount Chapter 1~5 common top-right actions (?, 3-line stage icon, gear settings), blur popups & tutorial spotlight */
  function initChapterCommon(cfg) {
    const actionsEl = document.getElementById('chapter-top-actions');
    if (!actionsEl) return;

    const chNum = cfg.chapterNum || 1;
    const chTitle = cfg.chapterTitle || '';
    const slides = Array.isArray(cfg.helpSlides) && cfg.helpSlides.length ? cfg.helpSlides : [
      { mark: '1', label: `Chapter ${chNum} 예시 사진 1 (추후 첨부)`, desc: '빨간 마킹과 함께 핵심 조작 방법을 안내하는 영역입니다.' },
      { mark: '2', label: `Chapter ${chNum} 예시 사진 2 (추후 첨부)`, desc: '좌우 드래그(스와이프)로 다음 도움말 사진으로 넘어갑니다.' }
    ];
    const stageRows = Array.isArray(cfg.stageRows) && cfg.stageRows.length ? cfg.stageRows : DEFAULT_STAGE_ROWS;
    const tutSteps = Array.isArray(cfg.tutorialSteps) && cfg.tutorialSteps.length ? cfg.tutorialSteps : [
      { sel: '.step-tabs', text: `Chapter ${chNum}의 상단 단계 탭에서 현재 진행할 과정을 순서대로 확인합니다.` },
      { sel: '.b-card:not(.pane-hidden)', text: '현재 강조된 영역에서 해당 과정의 조작을 진행합니다.' }
    ];

    actionsEl.innerHTML = `
      <button id="ch-btn-help" type="button" class="b-btn b-btn-icon" aria-label="도움말" title="도움말">?</button>
      <button id="ch-btn-stage" type="button" class="b-btn b-btn-icon" aria-label="단계" title="단계 선택">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="4" y1="7" x2="12" y2="7"></line>
          <line x1="4" y1="12" x2="17" y2="12"></line>
          <line x1="4" y1="17" x2="21" y2="17"></line>
        </svg>
      </button>
      <button id="ch-btn-settings" type="button" class="b-btn b-btn-icon" aria-label="설정" title="설정">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
    `;

    const oldHost = document.getElementById('ch-modal-host');
    if (oldHost) oldHost.remove();

    const modalHost = document.createElement('div');
    modalHost.id = 'ch-modal-host';
    modalHost.innerHTML = `
      <!-- 도움말 팝업 (드래그 슬라이드) -->
      <div id="ch-help-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="ch-help-title" style="backdrop-filter:blur(6px);">
        <div class="modal-card">
          <h2 id="ch-help-title" class="font-maru" style="font-size:19px; font-weight:600; color:var(--brown); margin-bottom:10px;">도움말 · Chapter ${chNum}</h2>
          <div id="ch-help-viewport" class="help-viewport">
            <div id="ch-help-track" class="help-track">
              ${slides.map((s) => `
                <div class="help-slide">
                  <div class="help-img-slot">
                    <span class="help-red-mark">${s.mark}</span>
                    <strong style="color:var(--brown); font-family:var(--font-display);">${s.label}</strong>
                    <span style="font-size:11px;">(빨간 마킹 예시 이미지 영역 · 좌우 드래그)</span>
                  </div>
                  <p class="muted" style="line-height:1.55;">${s.desc}</p>
                </div>
              `).join('')}
            </div>
          </div>
          <div id="ch-help-dots" class="help-dots">
            ${slides.map((_, i) => `<button type="button" class="help-dot ${i === 0 ? 'active' : ''}" data-idx="${i}" aria-label="${i + 1}번 도움말"></button>`).join('')}
          </div>
          <div class="modal-close-wrap">
            <button id="ch-help-close" type="button" class="b-btn modal-close-btn">닫기</button>
          </div>
        </div>
      </div>

      <!-- 단계 팝업 (튜토리얼 · 케이스 5개 개/고양이 · 실전 개/고양이 / 하단 닫기만) -->
      <div id="ch-stage-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="ch-stage-title" style="backdrop-filter:blur(6px);">
        <div class="modal-card">
          <h2 id="ch-stage-title" class="font-maru" style="font-size:19px; font-weight:600; color:var(--brown);">단계 · ${chTitle}</h2>
          <div class="stage-list" id="ch-stage-list"></div>
          <div class="modal-close-wrap">
            <button id="ch-stage-close" type="button" class="b-btn modal-close-btn">닫기</button>
          </div>
        </div>
      </div>

      <!-- 공통 설정 팝업 (+ 메인화면 버튼 추가) -->
      <div id="ch-settings-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="ch-settings-title" style="backdrop-filter:blur(6px);">
        <div class="modal-card">
          <h2 id="ch-settings-title" class="font-maru" style="font-size:20px; font-weight:600; color:var(--brown);">설정</h2>
          <div class="settings-grid">
            <div class="setting-cell">
              <label for="ch-font-range" class="setting-lbl">글씨 크기</label>
              <input id="ch-font-range" class="b-range" type="range" min="0" max="2" step="1" value="1" aria-label="글씨 크기 선택" />
              <div class="range-marks" id="ch-font-marks">
                <button type="button" data-fval="0">소</button>
                <button type="button" data-fval="1" class="active">중</button>
                <button type="button" data-fval="2">대</button>
              </div>
            </div>
            <div class="setting-cell">
              <span class="setting-lbl">소리</span>
              <button id="ch-sound-toggle" type="button" class="sound-toggle is-on" role="switch" aria-checked="true">
                <span class="sound-track"><span class="sound-thumb"></span></span>
                <span id="ch-sound-lbl">On</span>
              </button>
            </div>
            <div class="setting-cell">
              <button id="ch-btn-fs" type="button" class="b-btn b-btn-sm" style="width:100%;">전체화면</button>
            </div>
            <div class="setting-cell">
              <button id="ch-btn-share" type="button" class="b-btn b-btn-sm" style="width:100%;">공유하기</button>
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <button id="ch-btn-main-warn" type="button" class="b-btn b-btn-sm" style="width:100%;">메인화면</button>
          </div>
          <div id="ch-share-toast" class="share-toast" aria-live="polite"></div>
          <div class="modal-close-wrap">
            <button id="ch-settings-close" type="button" class="b-btn modal-close-btn">닫기</button>
          </div>
        </div>
      </div>

      <!-- 메인화면 이동 경고 팝업 (예 / 아니오) -->
      <div id="ch-confirm-main-modal" class="modal-backdrop hidden" role="dialog" aria-modal="true" style="backdrop-filter:blur(6px); z-index:110;">
        <div class="modal-card" style="text-align:center;">
          <p class="font-maru" style="font-size:15px; font-weight:600; color:var(--brown); line-height:1.55; margin:6px 0 18px;">
            현재 과정이 중단되며 다시 진행해야 합니다
          </p>
          <div style="display:flex; justify-content:center; gap:10px;">
            <button id="ch-confirm-yes" type="button" class="b-btn modal-close-btn" style="min-width:96px;">예</button>
            <button id="ch-confirm-no" type="button" class="b-btn modal-close-btn" style="min-width:96px;">아니오</button>
          </div>
        </div>
      </div>

      <!-- 튜토리얼 블러 스포트라이트 + 안내문 -->
      <div id="ch-tut-backdrop" class="tut-backdrop hidden"></div>
      <div id="ch-tut-callout" class="tut-callout hidden" role="dialog" aria-live="polite">
        <div class="b-label" style="margin:0;">
          <span id="ch-tut-step-lbl">튜토리얼</span>
          <span id="ch-tut-counter">1 / 2</span>
        </div>
        <p id="ch-tut-text" style="font-size:calc(13px * var(--text-scale, 1)); color:var(--brown); line-height:1.55;"></p>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button id="ch-tut-exit" type="button" class="b-btn b-btn-sm">종료</button>
          <button id="ch-tut-next" type="button" class="b-btn b-btn-sm">다음</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalHost);

    // Help Drag Carousel
    const helpModal = document.getElementById('ch-help-modal');
    const helpViewport = document.getElementById('ch-help-viewport');
    const helpTrack = document.getElementById('ch-help-track');
    const helpDots = document.querySelectorAll('#ch-help-dots .help-dot');
    let slideIdx = 0, dragStartX = 0, dragging = false, dragDelta = 0;

    function goSlide(i) {
      slideIdx = Math.max(0, Math.min(slides.length - 1, i));
      helpTrack.style.transition = 'transform 0.28s cubic-bezier(0.25, 0.8, 0.25, 1)';
      helpTrack.style.transform = `translateX(-${slideIdx * 100}%)`;
      helpDots.forEach((d, idx) => d.classList.toggle('active', idx === slideIdx));
    }

    helpDots.forEach((d) => d.addEventListener('click', () => goSlide(Number(d.dataset.idx))));
    helpViewport.addEventListener('pointerdown', (e) => {
      dragging = true;
      dragStartX = e.clientX;
      dragDelta = 0;
      helpTrack.style.transition = 'none';
      if (helpViewport.setPointerCapture) helpViewport.setPointerCapture(e.pointerId);
    });
    helpViewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dragDelta = e.clientX - dragStartX;
      const pct = (dragDelta / Math.max(1, helpViewport.clientWidth)) * 100;
      helpTrack.style.transform = `translateX(${-slideIdx * 100 + pct}%)`;
    });
    const finishDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (dragDelta < -36 && slideIdx < slides.length - 1) goSlide(slideIdx + 1);
      else if (dragDelta > 36 && slideIdx > 0) goSlide(slideIdx - 1);
      else goSlide(slideIdx);
    };
    helpViewport.addEventListener('pointerup', finishDrag);
    helpViewport.addEventListener('pointercancel', finishDrag);

    // Tutorial Spotlight Controller
    const tutBackdrop = document.getElementById('ch-tut-backdrop');
    const tutCallout = document.getElementById('ch-tut-callout');
    const tutCounter = document.getElementById('ch-tut-counter');
    const tutText = document.getElementById('ch-tut-text');
    const tutNextBtn = document.getElementById('ch-tut-next');
    let tutIdx = 0;
    let tutFocusedEl = null;

    function clearTutFocus() {
      if (tutFocusedEl) {
        tutFocusedEl.classList.remove('tut-focus');
        tutFocusedEl = null;
      }
    }
    function stopTutorial() {
      clearTutFocus();
      tutBackdrop.classList.add('hidden');
      tutCallout.classList.add('hidden');
    }
    function showTutStep(i) {
      clearTutFocus();
      tutIdx = i;
      const step = tutSteps[tutIdx];
      if (!step) { stopTutorial(); return; }
      const target = document.querySelector(step.sel);
      if (target) {
        tutFocusedEl = target;
        tutFocusedEl.classList.add('tut-focus');
      }
      tutCounter.textContent = `${tutIdx + 1} / ${tutSteps.length}`;
      tutText.textContent = step.text;
      tutNextBtn.textContent = tutIdx === tutSteps.length - 1 ? '완료' : '다음';
      tutBackdrop.classList.remove('hidden');
      tutCallout.classList.remove('hidden');
    }
    document.getElementById('ch-tut-exit').addEventListener('click', stopTutorial);
    tutNextBtn.addEventListener('click', () => {
      playTone(560, 0.05, 0.03);
      if (tutIdx >= tutSteps.length - 1) {
        saveStageResult(chNum, 'tutorial', { stamp: '완료', score: 100 });
        stopTutorial();
        renderStageList();
        triggerStageGlow();
      } else {
        showTutStep(tutIdx + 1);
      }
    });

    // Stage Modal (13 buttons: 튜토리얼 + 5종 개/고양이 + 실전 개/고양이)
    // Unlock rules: Cases unlock sequentially per species (무증상→경증→노령→중증→응급); 실전 unlocks after 튜토리얼.
    // Red stamps: 튜토리얼 '완료', 케이스 등급(S~F), 실전 최고 점수 숫자
    const stageModal = document.getElementById('ch-stage-modal');
    const stageListEl = document.getElementById('ch-stage-list');
    let activeStageId = cfg.initialStageId || stageRows[0][0].id;
    let pendingStageId = null;

    function applyStageSelection(stId) {
      activeStageId = stId;
      renderStageList();
      playTone(540, 0.05, 0.03);
      stageModal.classList.add('hidden');
      clearStageGlow();
      if (typeof cfg.onSelectStage === 'function') {
        cfg.onSelectStage(stId);
      }
      if (stId === 'tutorial' && !cfg.customTutorial) {
        showTutStep(0);
      }
    }

    function renderStageBtn(st) {
      const unlocked = isStageUnlocked(chNum, st.id);
      const res = getStageResult(chNum, st.id);
      const stampHtml = res && res.done && res.stamp ? `<span class="stamp-done">${res.stamp}</span>` : '';
      return `
        <button type="button" class="b-btn stage-btn ${st.id === activeStageId ? 'active' : ''} ${unlocked ? '' : 'is-locked'}" data-stage="${st.id}" ${unlocked ? '' : 'disabled aria-disabled="true"'}>
          <span>${st.name}</span>
          ${stampHtml}
        </button>
      `;
    }

    function renderStageList() {
      stageListEl.innerHTML = stageRows.map((row) => {
        if (row.length === 1) return renderStageBtn(row[0]);
        return `<div class="stage-row-2">${row.map(renderStageBtn).join('')}</div>`;
      }).join('');
      stageListEl.querySelectorAll('.stage-btn:not(.is-locked)').forEach((b) => {
        b.addEventListener('click', () => {
          const stId = b.dataset.stage;
          if (!isStageUnlocked(chNum, stId)) return;
          if (stId === activeStageId) {
            playTone(520, 0.04, 0.025);
            stageModal.classList.add('hidden');
            return;
          }
          pendingStageId = stId;
          playTone(460, 0.06, 0.03);
          confirmModal.classList.remove('hidden');
        });
      });
    }
    renderStageList();

    // Shared Settings Modal + Main Screen Confirm Warning Modal
    const settingsModal = document.getElementById('ch-settings-modal');
    const confirmModal = document.getElementById('ch-confirm-main-modal');
    const fRange = document.getElementById('ch-font-range');
    const fMarks = document.querySelectorAll('#ch-font-marks button');
    const sToggle = document.getElementById('ch-sound-toggle');
    const sLbl = document.getElementById('ch-sound-lbl');
    const btnFs = document.getElementById('ch-btn-fs');
    const btnShare = document.getElementById('ch-btn-share');
    const toastEl = document.getElementById('ch-share-toast');

    function syncChSettings() {
      const lv = getFontLevel();
      fRange.value = String(lv);
      fMarks.forEach((b) => b.classList.toggle('active', Number(b.dataset.fval) === lv));
      const snd = isSoundOn();
      sToggle.classList.toggle('is-on', snd);
      sToggle.setAttribute('aria-checked', String(snd));
      sLbl.textContent = snd ? 'On' : 'Off';
      const fs = isFullscreenOn();
      btnFs.classList.toggle('active', fs);
      btnFs.textContent = fs ? '전체화면 종료' : '전체화면';
    }
    syncChSettings();

    fRange.addEventListener('input', () => { applyFontLevel(fRange.value); syncChSettings(); });
    fMarks.forEach((b) => b.addEventListener('click', () => { applyFontLevel(b.dataset.fval); syncChSettings(); playTone(520, 0.05, 0.03); }));
    sToggle.addEventListener('click', () => { setSound(!isSoundOn()); syncChSettings(); });
    btnFs.addEventListener('click', async () => {
      const on = await toggleFullscreen();
      btnFs.classList.toggle('active', on);
      btnFs.textContent = on ? '전체화면 종료' : '전체화면';
      playTone(560, 0.05, 0.03);
    });
    btnShare.addEventListener('click', async () => {
      playTone(580, 0.05, 0.03);
      const res = await shareSimulator();
      if (res.method === 'clipboard' && res.ok) {
        toastEl.textContent = '시뮬레이터 메인 링크가 클립보드에 복사되었습니다.';
        setTimeout(() => { toastEl.textContent = ''; }, 2400);
      } else if (res.method === 'native' && res.ok) {
        toastEl.textContent = '공유 창이 열렸습니다.';
        setTimeout(() => { toastEl.textContent = ''; }, 2000);
      }
    });

    document.getElementById('ch-btn-main-warn').addEventListener('click', () => {
      pendingStageId = null;
      playTone(460, 0.06, 0.03);
      confirmModal.classList.remove('hidden');
    });
    document.getElementById('ch-confirm-no').addEventListener('click', () => {
      pendingStageId = null;
      confirmModal.classList.add('hidden');
    });
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        pendingStageId = null;
        confirmModal.classList.add('hidden');
      }
    });
    document.getElementById('ch-confirm-yes').addEventListener('click', () => {
      confirmModal.classList.add('hidden');
      if (pendingStageId) {
        const targetStage = pendingStageId;
        pendingStageId = null;
        applyStageSelection(targetStage);
        return;
      }
      settingsModal.classList.add('hidden');
      navigateTo('index2.html', { push: true });
    });

    // Open / Close Handlers
    document.getElementById('ch-btn-help').addEventListener('click', () => { goSlide(0); playTone(500, 0.05, 0.03); helpModal.classList.remove('hidden'); });
    document.getElementById('ch-help-close').addEventListener('click', () => helpModal.classList.add('hidden'));
    helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.add('hidden'); });

    document.getElementById('ch-btn-stage').addEventListener('click', () => {
      clearStageGlow();
      renderStageList();
      playTone(500, 0.05, 0.03);
      stageModal.classList.remove('hidden');
    });
    document.getElementById('ch-stage-close').addEventListener('click', () => stageModal.classList.add('hidden'));
    stageModal.addEventListener('click', (e) => { if (e.target === stageModal) stageModal.classList.add('hidden'); });

    document.getElementById('ch-btn-settings').addEventListener('click', () => { syncChSettings(); toastEl.textContent = ''; playTone(500, 0.05, 0.03); settingsModal.classList.remove('hidden'); });
    document.getElementById('ch-settings-close').addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

    return {
      refreshStages: renderStageList,
      setActiveStage: (id) => { activeStageId = id; renderStageList(); },
      startTutorial: () => showTutStep(0),
      openStageModal: () => { clearStageGlow(); renderStageList(); stageModal.classList.remove('hidden'); }
    };
  }

  applyFontLevel(getFontLevel());
  applySavedFullscreen();

  window.Beta11Settings = {
    getFontLevel,
    applyFontLevel,
    isSoundOn,
    setSound,
    isFullscreenOn,
    getStageResult,
    isStageComplete,
    isStageUnlocked,
    saveStageResult,
    markStageComplete,
    triggerStageGlow,
    clearStageGlow,
    playTone,
    toggleFullscreen,
    shareSimulator,
    navigateTo,
    initChapterCommon
  };
})();
