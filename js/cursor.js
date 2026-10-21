/* =========================================================
   Gomolândia — cursor de bolinha de goma
   Segue o mouse com atraso, estica na direção do movimento
   e troca de cor conforme a área (atributo data-cursor).
   Só em telas com mouse e sem "reduzir movimento".
   ========================================================= */
(function () {
  'use strict';

  const Gomo = (window.Gomo = window.Gomo || {});

  Gomo.iniciarCursor = function () {
    const podeUsar = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!podeUsar || !window.gsap) return null;

    const goma = document.createElement('div');
    goma.className = 'cursor-goma';
    goma.setAttribute('aria-hidden', 'true');
    const ponto = document.createElement('div');
    ponto.className = 'cursor-ponto';
    ponto.setAttribute('aria-hidden', 'true');
    document.body.append(goma, ponto);
    document.documentElement.classList.add('cursor-ativo');

    let mx = -100, my = -100, x = -100, y = -100, px = x, py = y;
    let corAtual = '';
    const campos = 'input, select, textarea';

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX;
      my = e.clientY;
      // Sobre campos de formulário, volta o cursor do sistema
      const emCampo = !!e.target.closest(campos);
      goma.classList.toggle('cursor--oculto', emCampo);
      ponto.classList.toggle('cursor--oculto', emCampo);
      const zona = e.target.closest('[data-cursor]');
      const cor = zona ? zona.getAttribute('data-cursor') : '#FF5C8A';
      if (cor !== corAtual) {
        corAtual = cor;
        goma.style.backgroundColor = cor;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { goma.classList.add('cursor--oculto'); ponto.classList.add('cursor--oculto'); });
    document.addEventListener('mouseenter', function () { goma.classList.remove('cursor--oculto'); ponto.classList.remove('cursor--oculto'); });

    // Um único laço de animação (o mesmo do GSAP), mexendo só em transform
    gsap.ticker.add(function () {
      x += (mx - x) * 0.18;
      y += (my - y) * 0.18;
      const vx = x - px, vy = y - py;
      px = x;
      py = y;
      const vel = Math.min(Math.hypot(vx, vy) / 30, 0.45);
      const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
      goma.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + ang + 'deg) scale(' + (1 + vel) + ',' + (1 - vel * 0.6) + ')';
      ponto.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    });

    return { goma: goma, ponto: ponto };
  };
})();
