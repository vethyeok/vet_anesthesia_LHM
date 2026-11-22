/* ============================================================================
   Vet Anesthesia Simulators — Unified Readability & Visibility Runtime
   ============================================================================ */
(function () {
  'use strict';

  const SEMINAR_KEY = 'vet_seminar_large_v1';

  // 1. Seminar Large-Text Toggle next to #btn-fullscreen
  function initSeminarToggle() {
    const fsBtn = document.getElementById('btn-fullscreen');
    if (!fsBtn || document.getElementById('btn-seminar-font')) return;

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

    fsBtn.parentNode.insertBefore(btn, fsBtn);
  }

  // 2. Vital Alert Pulse & Normal-Range Reference Chips
  const VITAL_SPECS = [
    {
      ids: ['v-hr', 'val-hr'],
      ref: '정상 60–150',
      evalState: (v) => (v < 48 || v > 195 ? 'danger' : (v < 60 || v > 165 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-spo2', 'val-spo2'],
      ref: '정상 ≥95%',
      evalState: (v) => (v < 90 ? 'danger' : (v < 95 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-co2', 'val-co2', 'val-etco2'],
      ref: '정상 35–45',
      evalState: (v) => (v < 28 || v > 56 ? 'danger' : (v < 35 || v > 46 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-map', 'val-map'],
      ref: '정상 65–115',
      evalState: (v) => (v < 58 || v > 148 ? 'danger' : (v < 65 || v > 125 ? 'warn' : 'ok'))
    },
    {
      ids: ['v-bt', 'val-bt'],
      ref: '정상 36.8–39.2°C',
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

        if (!card.querySelector('.vital-ref-chip[data-for="' + id + '"]')) {
          const chip = document.createElement('span');
          chip.className = 'vital-ref-chip';
          chip.setAttribute('data-for', id);
          chip.textContent = spec.ref;
          if (el.parentElement && el.parentElement !== card && el.parentElement.classList.contains('flex')) {
            card.appendChild(chip);
          } else {
            el.insertAdjacentElement('afterend', chip);
          }
        }

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

  // 3. Drug Color-Coding & Agonist<->Antagonist Pair Badges
  const DRUG_DECORATIONS = [
    { match: /atipamezole/i, cat: 'drug-cat-rev', badge: '↔ Dex(α₂)', cls: '' },
    { match: /naloxone/i, cat: 'drug-cat-rev', badge: '↔ Opioid', cls: '' },
    { match: /flumazenil/i, cat: 'drug-cat-rev', badge: '↔ Midaz(BZD)', cls: '' },
    { match: /esmolol/i, cat: 'drug-cat-rev', badge: '↔ 빈맥/HCM', cls: '' },
    { match: /diphenhydramine/i, cat: 'drug-cat-anti', badge: '↔ H₁히스타민', cls: '' },
    { match: /intralipid/i, cat: 'drug-cat-anti', badge: '↔ Lido독성', cls: 'pair-lipid' },
    { match: /insulin/i, cat: 'drug-cat-metab', badge: '↔ K⁺↑(Dex병용)', cls: 'pair-metab' },
    { match: /ca-gluconate|calgluc/i, cat: 'drug-cat-metab', badge: '↔ K⁺심근보호', cls: 'pair-metab' },
    { match: /dextrose/i, cat: 'drug-cat-metab', badge: '↔ 저혈당/Insulin', cls: 'pair-metab' },
    { match: /epinephrine|ephedrine/i, cat: 'drug-cat-emerg', badge: '', cls: 'pair-emerg' },
    { match: /lidocaine/i, cat: 'drug-cat-arr', badge: '', cls: '' },
    { match: /atropine/i, cat: 'drug-cat-arr', badge: '', cls: '' },
    { match: /furosemide/i, cat: 'drug-cat-diur', badge: '', cls: '' },
    { match: /prbc|bicarb|nahco/i, cat: 'drug-cat-metab', badge: '', cls: '' }
  ];

  function decorateDrugButtons() {
    const btns = document.querySelectorAll(
      '.pre-adj-btn, .act-btn, [data-drug], [data-s1drug], #drug-pane-core button, #drug-pane-metab button, #drug-pane-rev button, #btn-s3-atip, #btn-s3-nalox, #btn-s3-flum, #btn-s3-esmo'
    );
    btns.forEach((btn) => {
      if (btn.dataset.uiDrugDecorated === '1') return;
      const txt = `${btn.id || ''} ${btn.dataset.aid || ''} ${btn.dataset.drug || ''} ${btn.dataset.s1drug || ''} ${btn.textContent || ''}`;
      const rule = DRUG_DECORATIONS.find((r) => r.match.test(txt));
      if (!rule) return;

      btn.dataset.uiDrugDecorated = '1';
      btn.classList.add(rule.cat);

      if (rule.badge && !btn.querySelector('.drug-pair-badge')) {
        const badge = document.createElement('span');
        badge.className = 'drug-pair-badge' + (rule.cls ? ' ' + rule.cls : '');
        badge.textContent = rule.badge;
        const titleEl = btn.querySelector('.ot, .at, .text-xs, strong');
        if (titleEl) titleEl.appendChild(badge);
        else btn.appendChild(badge);
      }
    });
  }

  // 4. Event Log 3-Way Filter Bar & Semantic Icons
  function classifyLogNode(node) {
    const cls = String(node.className || '');
    const txt = String(node.textContent || '');
    const isAlert =
      /\b(danger|bad|warn)\b|text-rose|text-amber|border-rose|border-amber/i.test(cls) ||
      /(경고|위험|실패|중단|금기|과투여|독성|저혈압|저혈당|부작용|심정지|폐수종|급락|주의!)/i.test(txt);
    const isDrug =
      /(투여|IV|IM|mL|약물|길항|역전|전처치|볼루스|수혈|유도|Atropine|Ephedrine|Lidocaine|Epinephrine|Ca-Gluconate|Dextrose|Insulin|pRBC|NaHCO|Furosemide|Naloxone|Atipamezole|Flumazenil|Esmolol|Diphenhydramine|Intralipid|Propofol|Alfaxalone|Methadone|Dexmedetomidine|Midazolam|Maropitant|Cefazolin|Dexamethasone)/i.test(txt);
    const isGood = /\b(good)\b|text-emerald|점수 획득|\+\d+점/i.test(cls + ' ' + txt);
    return { isAlert, isDrug, isGood };
  }

  function enhanceLogBox(box) {
    if (!box || box.dataset.uiLogEnhanced === '1') return;
    box.dataset.uiLogEnhanced = '1';

    let activeFilter = 'all';
    const bar = document.createElement('div');
    bar.className = 'ui-log-filter-bar';
    bar.innerHTML = `
      <button type="button" class="ui-log-filter-btn active" data-lf="all">전체</button>
      <button type="button" class="ui-log-filter-btn" data-lf="alert">🚨 경고만</button>
      <button type="button" class="ui-log-filter-btn" data-lf="drug">💉 투약만</button>
    `;
    box.parentNode.insertBefore(bar, box);

    const applyFilterAndIcons = () => {
      Array.from(box.children).forEach((child) => {
        if (child.nodeType !== 1) return;
        const { isAlert, isDrug, isGood } = classifyLogNode(child);

        if (!child.dataset.uiIconDone) {
          child.dataset.uiIconDone = '1';
          const rawTxt = child.textContent || '';
          if (!/^[🚨⚠️💉✅]/u.test(rawTxt.trim())) {
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
    initSeminarToggle();
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
