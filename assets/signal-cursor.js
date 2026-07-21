/* ============================================================
   Signal Trail / Adaptive Current Cursor
   Hypothesis (red) → Processing (ivory/ink) → Signal (blue)

   - Un solo canvas fixed + un solo requestAnimationFrame.
   - Solo se activa con (hover: hover) and (pointer: fine) y sin
     prefers-reduced-motion. En touch no se crea nada.
   - El cursor nativo solo se oculta cuando el sistema inicializó;
   - cualquier error → fallback silencioso al cursor nativo.
   - Sin librerías. Reutiliza los tokens del brand system vía
     --signal-red / --signal-ivory / --signal-blue (alias de
     --red / --ivory / --blue ya definidos por la página).
   ============================================================ */
(function () {
  'use strict';

  var MAX_POINTS = 22;      // tope de fragmentos en la estela
  var BASE_LIFE = 620;      // ms de vida de un fragmento
  var MAX_LIFE = 880;       // vida extendida con movimiento rápido
  var MIN_DIST = 3;         // px mínimos entre fragmentos
  var CORE_EASE = 0.35;     // inercia mínima del núcleo
  var CORE_R = 3.75;        // núcleo ~7.5px de diámetro
  var MAGNET_MAX = 7;       // atracción máxima hacia el centro del CTA
  var PULSE_MS = 500;       // input → processed → return

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    try {
      if (!window.matchMedia) return;
      if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      window.SignalCursor = initSignalCursor();
    } catch (err) {
      document.documentElement.classList.remove('signal-cursor-on');
    }
  });

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.replace(/./g, function (c) { return c + c; });
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function initSignalCursor() {
    // Tokens semánticos — alias de la paleta oficial, nunca una paleta nueva.
    var style = document.createElement('style');
    style.textContent =
      ':root{--signal-red:var(--red,#ff4b2e);--signal-ivory:var(--ivory,#f4f1eb);--signal-blue:var(--blue,#09b7ff)}' +
      'html.signal-cursor-on body,html.signal-cursor-on a,html.signal-cursor-on button,html.signal-cursor-on label{cursor:none}' +
      'html.signal-cursor-on input,html.signal-cursor-on textarea,html.signal-cursor-on select,html.signal-cursor-on [contenteditable="true"]{cursor:auto}';
    document.head.appendChild(style);

    var RED = hexToRgb(cssVar('--signal-red', '#ff4b2e'));
    var IVORY = hexToRgb(cssVar('--signal-ivory', '#f4f1eb'));
    var BLUE = hexToRgb(cssVar('--signal-blue', '#09b7ff'));
    var INK = [10, 14, 19];
    var SIGNAL_MID = [134, 215, 248]; // transición ivory→azul usada por el hero

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    var mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    var core = { x: mouse.x, y: mouse.y };
    var points = [];   // {x,y,born,life}
    var pulses = [];   // {x,y,born}
    var visible = false;
    var lastMove = 0;
    var speed = 0;
    var life = BASE_LIFE;
    var magnet = null;     // {cx,cy}
    var label = null;      // texto de data-cursor-label
    var semantic = null;   // color del tab del hero bajo el cursor
    var inSurface = false; // dentro del Creative Testing Surface
    var nativeZone = false;// sobre input/textarea/select/editable
    var ringA = 0;
    var raf = null;

    function lightTheme() { return document.documentElement.dataset.theme === 'light'; }

    // ---- eventos (solo estado; cero lecturas de layout por frame) ----
    function onMove(e) {
      var now = performance.now();
      var inst = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
      speed = speed * 0.8 + inst * 0.2;
      life = Math.min(MAX_LIFE, BASE_LIFE + speed * 14);
      mouse.x = e.clientX; mouse.y = e.clientY;
      visible = true;
      lastMove = now;
      var last = points[points.length - 1];
      if (!last || Math.hypot(mouse.x - last.x, mouse.y - last.y) > MIN_DIST) {
        points.push({ x: mouse.x, y: mouse.y, born: now, life: inSurface ? life * 0.6 : life });
        if (points.length > MAX_POINTS) points.shift();
      }
    }

    function onDown(e) {
      pulses.push({ x: e.clientX, y: e.clientY, born: performance.now() });
      if (pulses.length > 6) pulses.shift();
    }

    var SEMANTIC = {
      creative: function () { return RED; },
      campaign: function () { return lightTheme() ? INK : IVORY; },
      signal: function () { return SIGNAL_MID; },
      scale: function () { return BLUE; }
    };

    // La lectura de rects sucede solo al entrar al elemento, nunca en el loop.
    function onOver(e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      nativeZone = !!t.closest('input,textarea,select,[contenteditable="true"]');
      var lab = t.closest('[data-cursor-label]');
      label = lab ? lab.getAttribute('data-cursor-label') : null;
      var tab = t.closest('.surface-tab');
      semantic = (tab && SEMANTIC[tab.dataset.state]) ? SEMANTIC[tab.dataset.state] : null;
      inSurface = !!t.closest('.surface-panel');
      var mg = t.closest('a.btn,button.submit');
      if (mg) {
        var r = mg.getBoundingClientRect();
        magnet = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      } else {
        magnet = null;
      }
    }

    function onLeaveWindow(e) {
      if (!e.relatedTarget && !e.toElement) { visible = false; magnet = null; label = null; }
    }

    function onVisibility() {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      } else if (!raf) {
        points = []; pulses = [];
        raf = requestAnimationFrame(frame);
      }
    }

    // ---- color de la corriente: rojo → ivory/ink → azul → se disipa ----
    function trailColor(t) {
      var proc = lightTheme() ? INK : IVORY; // "processing" según el tema
      var c;
      if (t < 0.38) c = mix(RED, proc, t / 0.38);
      else if (t < 0.55) c = proc;
      else if (t < 0.8) c = mix(proc, BLUE, (t - 0.55) / 0.25);
      else c = BLUE;
      var a = t < 0.62 ? 0.9 : 0.9 * (1 - (t - 0.62) / 0.38);
      return rgba(c, Math.max(0, a));
    }

    function drawTrail(now) {
      if (points.length < 2) return;
      var pts = points.concat([{ x: core.x, y: core.y, born: now, life: life }]);
      for (var i = pts.length - 2; i > 0; i--) {
        var p = pts[i];
        var t = Math.min(1, Math.max(0, (now - p.born) / p.life));
        var x0 = (pts[i - 1].x + p.x) / 2, y0 = (pts[i - 1].y + p.y) / 2;
        var x1 = (p.x + pts[i + 1].x) / 2, y1 = (p.y + pts[i + 1].y) / 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(p.x, p.y, x1, y1);
        ctx.strokeStyle = trailColor(t);
        ctx.lineWidth = Math.max(0.5, 2.2 * (1 - t));
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    // ---- click: pulso rojo → aro azul (input → processed → return) ----
    function drawPulses(now) {
      for (var i = pulses.length - 1; i >= 0; i--) {
        var t = (now - pulses[i].born) / PULSE_MS;
        if (t >= 1) { pulses.splice(i, 1); continue; }
        if (t < 0) continue;
        var p = pulses[i];
        if (t < 0.42) {
          var t1 = t / 0.42;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5 + t1 * 6, 0, 6.2832);
          ctx.fillStyle = rgba(RED, 0.75 * (1 - t1 * 0.55));
          ctx.fill();
        }
        if (t > 0.3) {
          var t2 = (t - 0.3) / 0.7;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8 + t2 * 13, 0, 6.2832);
          ctx.strokeStyle = rgba(BLUE, 0.8 * (1 - t2));
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }
      }
    }

    function drawCore() {
      var coreColor = semantic ? semantic() : (lightTheme() ? INK : IVORY);
      if (magnet) { // círculo de anotación fino, con giro lento
        ctx.beginPath();
        ctx.arc(core.x, core.y, 15, ringA, ringA + 5.2);
        ctx.strokeStyle = rgba(coreColor, 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();
        ringA += 0.025;
      }
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = rgba(coreColor, 0.8);
      ctx.beginPath();
      ctx.arc(core.x, core.y, CORE_R, 0, 6.2832);
      ctx.fillStyle = rgba(coreColor, 0.95);
      ctx.fill();
      ctx.restore();
      if (label) {
        ctx.font = '600 9px "IBM Plex Mono", monospace';
        ctx.fillStyle = rgba(lightTheme() ? INK : IVORY, 0.9);
        ctx.fillText(label.toUpperCase(), core.x + 16, core.y + 3.5);
      }
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      // Un solo reloj para eventos y render: performance.now().
      // (El timestamp del rAF puede divergir y volvería t negativa.)
      var now = performance.now();
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      // núcleo: inercia mínima + atracción magnética contenida (≤7px)
      var tx = mouse.x, ty = mouse.y;
      if (magnet) {
        var dx = magnet.cx - mouse.x, dy = magnet.cy - mouse.y;
        var d = Math.hypot(dx, dy) || 1;
        var pull = Math.min(MAGNET_MAX, d * 0.25);
        tx += dx / d * pull; ty += dy / d * pull;
      }
      core.x += (tx - core.x) * CORE_EASE;
      core.y += (ty - core.y) * CORE_EASE;

      // mouse quieto → la corriente se repliega hacia el núcleo
      if (now - lastMove > 140) {
        for (var i = 0; i < points.length; i++) {
          points[i].x += (core.x - points[i].x) * 0.1;
          points[i].y += (core.y - points[i].y) * 0.1;
        }
      }
      while (points.length && now - points[0].born > points[0].life) points.shift();

      if (!nativeZone) drawTrail(now);
      drawPulses(now);
      if (visible && !nativeZone) drawCore();
    }

    // ---- montaje ----
    addEventListener('resize', resize);
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('mouseout', onLeaveWindow, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    raf = requestAnimationFrame(frame);
    // El cursor nativo solo se oculta cuando todo lo anterior existe.
    document.documentElement.classList.add('signal-cursor-on');

    return {
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        removeEventListener('resize', resize);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerdown', onDown);
        document.removeEventListener('pointerover', onOver);
        document.removeEventListener('mouseout', onLeaveWindow);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.remove();
        style.remove();
        document.documentElement.classList.remove('signal-cursor-on');
      }
    };
  }
})();
