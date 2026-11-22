/* ============================================================================
   Vet Anesthesia Simulators — Unified Slim, Fixed-Vital & Readability Runtime
   ============================================================================ */
(function () {
  'use strict';

  const SEMINAR_KEY = 'vet_seminar_large_v1';

  // 1. Seminar Large-Text Toggle
  function createSeminarToggle() {
    if (document.getElementById('btn-seminar-font')) return document.getElementById('btn-seminar-font');

    const btn = document.createElement('button');
    btn.id = 'btn-seminar-font';
    btn.type = 'button';
    btn.className = 'btn-seminar-toggle';
    btn.title = '강의·세미나용 큰 글씨 모드 전환';
    btn.textContent = '가+ 큰글씨';

    const applyState = (on) => {
      document.body.classList.toggle('seminar-large', on);
      btn.classList.toggle('active', on);
      btn.textContent = on ? '가- 기본글씨' : '가+ 큰글씨';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    };

    let saved = false;
    try { saved = localStorage.getItem(SEMINAR_KEY) === '1'; } catch (e) {}
    applyState(saved);

    btn.addEventListener('click', () => {
      const next = !document.body.classList.contains('seminar-large');
      applyState(next);
      try { localStorage.setItem(SEMINAR_KEY, next ? '1' : '0'); } catch (e) {}
    });

    return btn;
  }

  // 2. Compact 1-Row Header + Unified '⚙ 설정' Popover
  function initCompactSettingsDrawer() {
    const isSplitSim = !!document.querySelector('.main-grid');
    if (isSplitSim) {
      document.body.classList.add('ui-split-sim');
    }

    const fsBtn = document.getElementById('btn-fullscreen');
    const seminarBtn = createSeminarToggle();

    // Maintenance simulator: keep its existing header, just insert seminar toggle cleanly
    if (!isSplitSim) {
      if (fsBtn && fsBtn.parentNode && !seminarBtn.parentNode) {
        fsBtn.parentNode.insertBefore(seminarBtn, fsBtn);
      }
      return;
    }

    // Induction / Recovery / Critical simulators:
    // Keep ONLY colored mark, difficulty/mode (#btn-mode-easy), 케이스, 설정, and ⛶ in the header!
    const ctrlRow = document.querySelector('.controls-row, .hdr-controls');
    if (!ctrlRow || document.getElementById('btn-ui-settings')) return;

    if (fsBtn) {
      fsBtn.title = '전체화면 전환';
      fsBtn.textContent = '⛶';
    }

    // 2A. '케이스' Popover (Species toggle + Case select + AI Random Patient)
    const caseWrap = document.createElement('div');
    caseWrap.className = 'ui-settings-wrap';
    const caseBtn = document.createElement('button');
    caseBtn.id = 'btn-ui-case';
    caseBtn.type = 'button';
    caseBtn.className = 'ui-settings-btn';
    caseBtn.textContent = '케이스 ▾';
    caseBtn.setAttribute('aria-expanded', 'false');

    const casePop = document.createElement('div');
    casePop.id = 'ui-case-popover';
    casePop.className = 'ui-settings-popover';
    casePop.innerHTML = `
      <div class="ui-settings-pop-hdr">
        <span>📋 환자 · 케이스 선택</span>
        <button id="ui-case-close" type="button" style="border:none;background:transparent;color:#94a3b8;font-size:12px;font-weight:800;cursor:pointer;">✕</button>
      </div>
      <div class="ui-settings-pop-grid" id="ui-case-pop-grid"></div>
    `;
    caseWrap.appendChild(caseBtn);
    document.body.appendChild(casePop);
    const caseGrid = casePop.querySelector('#ui-case-pop-grid');

    const segEl = ctrlRow.querySelector('.seg');
    if (segEl) caseGrid.appendChild(segEl);
    const caseSel = ctrlRow.querySelector('select');
    if (caseSel) caseGrid.appendChild(caseSel);
    ['btn-ai-case', 'btn-ai-new-case'].forEach((id) => {
      const n = document.getElementById(id);
      if (n && ctrlRow.contains(n)) {
        n.style.gridColumn = 'span 2';
        caseGrid.appendChild(n);
      }
    });

    // 2B. '설정' Popover (all other header buttons except difficulty/mode & fullscreen)
    const wrap = document.createElement('div');
    wrap.className = 'ui-settings-wrap';
    const setBtn = document.createElement('button');
    setBtn.id = 'btn-ui-settings';
    setBtn.type = 'button';
    setBtn.className = 'ui-settings-btn';
    setBtn.textContent = '설정 ▾';
    setBtn.setAttribute('aria-expanded', 'false');

    const pop = document.createElement('div');
    pop.id = 'ui-settings-popover';
    pop.className = 'ui-settings-popover';
    pop.innerHTML = `
      <div class="ui-settings-pop-hdr">
        <span>⚙ 시뮬레이터 설정 · 도구</span>
        <button id="ui-settings-close" type="button" style="border:none;background:transparent;color:#94a3b8;font-size:12px;font-weight:800;cursor:pointer;">✕</button>
      </div>
      <div class="ui-settings-pop-grid" id="ui-settings-pop-grid"></div>
    `;
    wrap.appendChild(setBtn);
    document.body.appendChild(pop);
    const grid = pop.querySelector('#ui-settings-pop-grid');

    const settingsIds = [
      'btn-preop-lab',
      'btn-poc-lab',
      'btn-phys',
      'btn-calc-mode',
      'btn-calc-toggle',
      'btn-reset',
      'btn-open-start',
      'btn-back-start',
      'btn-credits'
    ];
    settingsIds.forEach((id) => {
      const node = document.getElementById(id);
      if (node && ctrlRow.contains(node)) grid.appendChild(node);
    });
    grid.appendChild(seminarBtn);

    // Insert '케이스' and '설정' right before fullscreen button
    if (fsBtn && fsBtn.parentNode === ctrlRow) {
      ctrlRow.insertBefore(caseWrap, fsBtn);
      ctrlRow.insertBefore(wrap, fsBtn);
    } else {
      ctrlRow.appendChild(caseWrap);
      ctrlRow.appendChild(wrap);
    }

    const closeAll = () => {
      pop.classList.remove('open');
      setBtn.classList.remove('open');
      setBtn.setAttribute('aria-expanded', 'false');
      casePop.classList.remove('open');
      caseBtn.classList.remove('open');
      caseBtn.setAttribute('aria-expanded', 'false');
    };

    const togglePopover = (btn, targetPop) => {
      const willOpen = !targetPop.classList.contains('open');
      closeAll();
      if (willOpen) {
        const rect = btn.getBoundingClientRect();
        targetPop.style.top = Math.min(window.innerHeight - 240, rect.bottom + 6) + 'px';
        targetPop.classList.add('open');
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    };

    caseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(caseBtn, casePop); });
    setBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(setBtn, pop); });
    casePop.querySelector('#ui-case-close').addEventListener('click', closeAll);
    pop.querySelector('#ui-settings-close').addEventListener('click', closeAll);

    document.addEventListener('click', (e) => {
      if (!pop.classList.contains('open') && !casePop.classList.contains('open')) return;
      if (pop.contains(e.target) || setBtn.contains(e.target) || casePop.contains(e.target) || caseBtn.contains(e.target)) return;
      closeAll();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  // 3. Vital Alert Border Pulse (no space-wasting reference chips under graphs!)
  const VITAL_SPECS = [
    {
      ids: ['v-hr', 'val-hr'],
      evalState: (v) => (v < 48 || v > 195 ? 'danger' : (v < 60 || v > 165 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-spo2', 'val-spo2'],
      evalState: (v) => (v < 90 ? 'danger' : (v < 95 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-co2', 'val-co2', 'val-etco2'],
      evalState: (v) => (v < 28 || v > 56 ? 'danger' : (v < 35 || v > 46 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-map', 'val-map'],
      evalState: (v) => (v < 58 || v > 148 ? 'danger' : (v < 65 || v > 125 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-bt', 'val-bt'],
      evalState: (v) => (v < 35.8 || v > 39.8 ? 'danger' : (v < 36.8 || v > 39.2 ? 'warn' : 'ok'))
    }
  ];

  function findVitalCard(el) {
    return (
      el.closest('.num-col, .v-card, .vital-card, .vital-box') ||
      el.closest('[class*="rounded-lg"][class*="border"], [class*="rounded-xl"][class*="border"]') ||
      el.parentElement
    );
  }

  function updateVitalsVisuals() {
    VITAL_SPECS.forEach((spec) => {
      spec.ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const card = findVitalCard(el);
        if (!card) return;

        const raw = (el.textContent || '').replace(/[^\d.]/g, '');
        const num = parseFloat(raw);
        card.classList.remove('vital-alert-danger', 'vital-alert-warn');
        if (!Number.isFinite(num) || num <= 0) return;

        const st = spec.evalState(num);
        if (st === 'danger') card.classList.add('vital-alert-danger');
        else if (st === 'warn') card.classList.add('vital-alert-warn');
      });
    });
  }

  // 4. Drug Color-Coding (clean left accent bar only — no cluttered inline badges)
  const DRUG_DECORATIONS = [
    { match: /atipamezole|naloxone|flumazenil|esmolol/i, cat: 'drug-cat-rev' },
    { match: /diphenhydramine|intralipid/i, cat: 'drug-cat-anti' },
    { match: /insulin|ca-gluconate|calgluc|dextrose|prbc|bicarb|nahco/i, cat: 'drug-cat-metab' },
    { match: /epinephrine|ephedrine/i, cat: 'drug-cat-emerg' },
    { match: /lidocaine|atropine/i, cat: 'drug-cat-arr' },
    { match: /furosemide/i, cat: 'drug-cat-diur' },
    { match: /fentanyl|dexmed|midazolam/i, cat: 'drug-cat-anti' }
  ];

  function decorateDrugButtons() {
    const btns = document.querySelectorAll(
      '.pre-adj-btn, .act-btn, [data-drug], [data-s1drug], #drug-pane-basic button, #drug-pane-core button, #drug-pane-metab button, #drug-pane-sed button, #drug-pane-rev button, #btn-s3-atip, #btn-s3-nalox, #btn-s3-flum, #btn-s3-esmo'
    );
    btns.forEach((btn) => {
      if (btn.dataset.uiDrugDecorated === '1') return;
      const txt = `${btn.id || ''} ${btn.dataset.aid || ''} ${btn.dataset.drug || ''} ${btn.dataset.s1drug || ''} ${btn.textContent || ''}`;
      const rule = DRUG_DECORATIONS.find((r) => r.match.test(txt));
      if (!rule) return;
      btn.dataset.uiDrugDecorated = '1';
      btn.classList.add(rule.cat);
    });

    // Inject '?' help button into clinical action panel headers that have hidden descriptions
    document.querySelectorAll('.main-grid > :last-child .card-title, .main-grid > :last-child .panel-title').forEach((hdr) => {
      if (hdr.querySelector('.btn-context-help, .btn-drug-help')) return;
      const scope = hdr.closest('.rec-pane, .card, .panel, #stage-panel') || hdr.parentElement;
      if (!scope || !scope.querySelector('.opt-btn .od, .act-btn .ad, .choice-btn small')) return;
      const hBtn = document.createElement('button');
      hBtn.type = 'button';
      hBtn.className = 'btn-context-help';
      hBtn.title = '현재 화면 처치·약물 상세 설명 보기';
      hBtn.textContent = '?';
      const firstSpan = hdr.querySelector('span');
      if (firstSpan) firstSpan.appendChild(hBtn);
      else hdr.appendChild(hBtn);
    });
  }

  // 5. Interactive '?' Drug Reference & Current-Screen Procedure Guide Modal
  function collectCurrentScreenDescs(triggerBtn) {
    const scope = (triggerBtn && triggerBtn.closest && triggerBtn.closest('.rec-pane, .s1-pane, .s2-pane, .s3-pane, .card, .panel, #stage-panel')) || document.querySelector('.main-grid > :last-child') || document;
    const rows = [];
    const seen = new Set();
    scope.querySelectorAll('.opt-btn, .act-btn, .choice-btn').forEach((b) => {
      const tEl = b.querySelector('.ot, .at, strong');
      const dEl = b.querySelector('.od, .ad, small');
      if (!tEl || !dEl) return;
      const title = tEl.textContent.trim();
      const desc = dEl.textContent.trim();
      if (!title || !desc || seen.has(title)) return;
      seen.add(title);
      rows.push(`<div>• <strong>${title}</strong>: ${desc}</div>`);
    });
    return rows;
  }

  function ensureDrugGuideModal() {
    let modal = document.getElementById('vet-drug-guide-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'vet-drug-guide-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.cssText = 'position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,0.82);backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="width:100%;max-width:680px;max-height:86vh;overflow-y:auto;border-radius:14px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,0.65);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #1e293b;padding-bottom:10px;margin-bottom:12px;">
          <div>
            <div style="font-size:15px;font-weight:800;color:#7dd3fc;">📘 처치 · 약물 상세 설명 및 작용↔길항 가이드</div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:2px;">현재 단계의 처치 항목 설명과 응급·길항 약물 도감</div>
          </div>
          <button id="vet-drug-guide-close" type="button" style="border:1px solid #475569;background:#1e293b;color:#f8fafc;border-radius:8px;padding:5px 11px;font-size:12px;font-weight:800;cursor:pointer;">닫기 ✕</button>
        </div>
        <div id="vet-context-desc-box" style="display:none;margin-bottom:10px;border-radius:10px;border:1px solid rgba(251,191,36,0.4);background:rgba(120,53,15,0.18);padding:10px 12px;font-size:12px;line-height:1.55;">
          <div style="font-weight:800;color:#fde68a;margin-bottom:4px;">📌 현재 화면 처치 · 선택 항목 설명</div>
          <div id="vet-context-desc-list"></div>
        </div>
        <div style="display:grid;gap:10px;font-size:12px;line-height:1.5;">
          <div style="border-radius:10px;border:1px solid rgba(251,113,133,0.35);background:rgba(136,19,55,0.12);padding:10px 12px;">
            <div style="font-weight:800;color:#fda4af;margin-bottom:4px;">1) 기본 응급 약물</div>
            <div>• <strong>Ephedrine IV</strong> (0.05–0.15 mg/kg): 저혈압(MAP↓) 일시 승압 · 반복 과투여 시 빈맥·내성</div>
            <div>• <strong>Atropine IV</strong> (0.02–0.04 mg/kg): 미주신경성 서맥 교정 · 심장병/고칼륨/α₂ 서맥 시 주의</div>
            <div>• <strong>Lidocaine 2% IV</strong> (개 1–2 / 고양이 0.25–0.5 mg/kg): VPC·VT 항부정맥 · 과량 심근독성 → <strong>20% Intralipid</strong> 해독</div>
            <div>• <strong>Epinephrine IV</strong> (0.01–0.02 mg/kg): 아나필락시스·심정지 1차 응급 · 반복 시 빈맥/VT → <strong>Esmolol</strong> 제어</div>
          </div>
          <div style="border-radius:10px;border:1px solid rgba(56,189,248,0.35);background:rgba(14,165,233,0.10);padding:10px 12px;">
            <div style="font-weight:800;color:#7dd3fc;margin-bottom:4px;">2) 혈액 · 대사 · 전해질</div>
            <div>• <strong>10% Ca-Gluconate</strong> (0.5–1 mL/kg slow IV): 고칼륨혈증(K⁺↑) 심근 막안정화 · 급속/과량 시 AV 차단</div>
            <div>• <strong>Regular Insulin</strong> (0.2–0.5 U/kg IV) ↔ <strong>50% Dextrose</strong> (0.5–1 mL/kg 희석 IV): Insulin은 K⁺를 세포 내로 이동시키며 저혈당 유발 시 Dextrose로 즉각 교정</div>
            <div>• <strong>pRBC / Colloid</strong> (3–6 mL/kg): 중증 빈혈·저알부민 관류 보충 · 심부전 과부하(TACO) 주의</div>
            <div>• <strong>8.4% NaHCO₃</strong> (0.5–1.5 mEq/kg slow IV): 중증 대사성 산증 보조 · 환기 불량 시 ETCO₂ 급등 주의</div>
          </div>
          <div style="border-radius:10px;border:1px solid rgba(52,211,153,0.35);background:rgba(16,185,129,0.10);padding:10px 12px;">
            <div style="font-weight:800;color:#6ee7b7;margin-bottom:4px;">3) 진정 · 진통 (작용제 ↔ 대응 길항제)</div>
            <div>• <strong>Fentanyl IV</strong> (2–5 µg/kg) ↔ <strong>Naloxone</strong> (0.01–0.04 mg/kg): 강력 μ-오피오이드 진통·MAC 절감 / 호흡억제·서맥 시 Naloxone 역전</div>
            <div>• <strong>Dexmedetomidine IV</strong> (1–3 µg/kg) ↔ <strong>Atipamezole</strong> (IM 권장): α₂ 진정·혈관수축·MAC 절감 / 서맥·지연회복 시 Atipamezole 역전</div>
            <div>• <strong>Midazolam IV</strong> (0.2 mg/kg) ↔ <strong>Flumazenil</strong> (0.01–0.02 mg/kg): 벤조디아제핀 진정·항경련 / 과진정·역설적 흥분 시 Flumazenil 역전</div>
          </div>
          <div style="border-radius:10px;border:1px solid rgba(167,139,250,0.35);background:rgba(139,92,246,0.10);padding:10px 12px;">
            <div style="font-weight:800;color:#c4b5fd;margin-bottom:4px;">4) 이뇨 · 길항 · 해독제</div>
            <div>• <strong>Furosemide IV</strong> (1–2.5 mg/kg): 급성 폐수종(MMVD·HCM 수액 과부하) 이뇨 · 저혈량 쇼크 시 금기</div>
            <div>• <strong>Esmolol IV</strong> (0.25–0.5 mg/kg): 단시간 β₁ 차단제 · 교감폭풍/Epi/Atropine 빈맥·HCM 심박수 제어 (서맥·저혈압 금기)</div>
            <div>• <strong>Diphenhydramine</strong> (1–2 mg/kg IM/sIV): H₁ 항히스타민 · 아나필락시스·비만세포종(MCT) 히스타민 차단</div>
            <div>• <strong>20% Intralipid</strong> (1.5 mL/kg IV): Lidocaine 국소마취제 심근독성·저혈압 지질 격리(Lipid Sink) 해독</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.id === 'vet-drug-guide-close') modal.style.display = 'none';
    });
    return modal;
  }

  window.openVetDrugGuide = function (triggerBtn) {
    const m = ensureDrugGuideModal();
    const box = m.querySelector('#vet-context-desc-box');
    const list = m.querySelector('#vet-context-desc-list');
    const rows = collectCurrentScreenDescs(triggerBtn);
    if (box && list) {
      if (rows.length) {
        list.innerHTML = rows.join('');
        box.style.display = 'block';
      } else {
        box.style.display = 'none';
      }
    }
    m.style.display = 'flex';
  };

  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest && e.target.closest('#btn-drug-guide, .btn-drug-help, .btn-context-help');
    if (btn) {
      e.preventDefault();
      window.openVetDrugGuide(btn);
    }
  });

  // 6. Event Log 3-Way Filter Bar + Mobile Auto-Collapse Toggle
  function classifyLogNode(node) {
    const cls = String(node.className || '');
    const txt = String(node.textContent || '');
    const isAlert =
      /\b(danger|bad|warn)\b|text-rose|text-amber|border-rose|border-amber/i.test(cls) ||
      /(경고|위험|실패|중단|금기|과투여|독성|저혈압|저혈당|부작용|심정지|폐수종|급락|주의!)/i.test(txt);
    const isDrug =
      /(투여|IV|IM|mL|약물|길항|역전|전처치|볼루스|수혈|유도|Atropine|Ephedrine|Lidocaine|Epinephrine|Ca-Gluconate|Dextrose|Insulin|pRBC|NaHCO|Furosemide|Naloxone|Atipamezole|Flumazenil|Esmolol|Diphenhydramine|Intralipid|Propofol|Alfaxalone|Methadone|Dexmedetomidine|Midazolam|Maropitant|Cefazolin|Dexamethasone|Fentanyl)/i.test(txt);
    const isGood = /\b(good)\b|text-emerald|점수 획득|\+\d+점/i.test(cls + ' ' + txt);
    return { isAlert, isDrug, isGood };
  }

  function enhanceLogBox(box) {
    if (!box || box.dataset.uiLogEnhanced === '1') return;
    box.dataset.uiLogEnhanced = '1';

    let activeFilter = 'all';
    const isMobileInit = window.innerWidth < 1024 && document.body.classList.contains('ui-split-sim');
    let collapsed = isMobileInit;

    const bar = document.createElement('div');
    bar.className = 'ui-log-filter-bar';
    bar.innerHTML = `
      <button type="button" class="ui-log-filter-btn active" data-lf="all">전체</button>
      <button type="button" class="ui-log-filter-btn" data-lf="alert">🚨 경고</button>
      <button type="button" class="ui-log-filter-btn" data-lf="drug">💉 투약</button>
      <button type="button" class="ui-log-toggle-btn" data-ltoggle="1">${collapsed ? '로그 펼치기 ▾' : '로그 접기 ▴'}</button>
    `;
    box.parentNode.insertBefore(bar, box);

    if (collapsed) box.classList.add('ui-log-collapsed');

    const toggleBtn = bar.querySelector('[data-ltoggle]');
    toggleBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      box.classList.toggle('ui-log-collapsed', collapsed);
      toggleBtn.textContent = collapsed ? '로그 펼치기 ▾' : '로그 접기 ▴';
    });

    const applyFilterAndIcons = () => {
      Array.from(box.children).forEach((child) => {
        if (child.nodeType !== 1) return;
        const { isAlert, isDrug, isGood } = classifyLogNode(child);

        if (!child.dataset.uiIconDone) {
          child.dataset.uiIconDone = '1';
          const rawTxt = child.textContent || '';
          if (!/^[🚨⚠️💉✅💀]/u.test(rawTxt.trim())) {
            const ic = document.createElement('span');
            ic.className = 'ui-log-icon';
            ic.textContent = isAlert ? '🚨' : (isDrug ? '💉' : (isGood ? '✅' : '•'));
            child.insertBefore(ic, child.firstChild);
          }
        }

        const show =
          activeFilter === 'all' ||
          (activeFilter === 'alert' && isAlert) ||
          (activeFilter === 'drug' && isDrug);
        child.classList.toggle('ui-log-hidden', !show);
      });
    };

    bar.querySelectorAll('.ui-log-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.getAttribute('data-lf') || 'all';
        bar.querySelectorAll('.ui-log-filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
        if (collapsed) {
          collapsed = false;
          box.classList.remove('ui-log-collapsed');
          toggleBtn.textContent = '로그 접기 ▴';
        }
        applyFilterAndIcons();
      });
    });

    const obs = new MutationObserver(() => applyFilterAndIcons());
    obs.observe(box, { childList: true });
    applyFilterAndIcons();
  }

  function initLogs() {
    ['log-box', 'log-list', 'panel-log', 'event-log'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) enhanceLogBox(el);
    });
  }

  function boot() {
    initCompactSettingsDrawer();
    initLogs();
    decorateDrugButtons();
    updateVitalsVisuals();

    let decoTimer = null;
    const bodyObs = new MutationObserver(() => {
      if (decoTimer) return;
      decoTimer = setTimeout(() => {
        decoTimer = null;
        decorateDrugButtons();
      }, 80);
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });

    setInterval(updateVitalsVisuals, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
