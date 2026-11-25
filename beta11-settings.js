/* 마취 시뮬레이터 베타 1.1 — 공통 설정 상태 유지 (글씨 크기 · 소리 · 전체화면 · 공유) */
(function () {
  const KEY_FONT = 'vet_b11_font_size';   // '0' (소) | '1' (중) | '2' (대)
  const KEY_SOUND = 'vet_b11_sound';      // 'on' | 'off'

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
    try {
      if (fsEl) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        document.body.classList.remove('b11-immersive');
        return false;
      } else {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
          document.body.classList.add('b11-immersive');
          return true;
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
          document.body.classList.add('b11-immersive');
          return true;
        }
      }
    } catch {}
    const now = document.body.classList.toggle('b11-immersive');
    return now;
  }

  async function shareSimulator() {
    const url = window.location.href.split('#')[0];
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

  // Apply saved font size immediately on every Beta 1.1 page
  applyFontLevel(getFontLevel());

  window.Beta11Settings = {
    getFontLevel,
    applyFontLevel,
    isSoundOn,
    setSound,
    playTone,
    toggleFullscreen,
    shareSimulator
  };
})();
