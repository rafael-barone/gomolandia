/* =========================================================
   Gomolândia — orquestra o movimento da página
   GSAP 3 + ScrollTrigger + Lenis, com JavaScript puro.
   Regra de ouro: animar só transform e opacity.
   ========================================================= */
(function () {
  'use strict';

  const Gomo = (window.Gomo = window.Gomo || {});
  const raiz = document.documentElement;
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const parametros = new URLSearchParams(location.search);
  const modoDemo = parametros.has('demo');
  Gomo.modoCaptura = parametros.has('momento'); // prints: as animações das Sensações acontecem uma vez só
  const inicio = performance.now();
  const hero = document.querySelector('.hero');

  /* ---------- Utilidades de texto ---------- */

  // Letras: cada palavra continua inteira (não quebra no meio) e cada letra vira um <span>
  function dividirLetras(el) {
    const palavras = el.querySelectorAll('.palavra');
    const alvos = palavras.length ? Array.from(palavras) : [el];
    alvos.forEach(function (p) {
      const texto = p.textContent.trim();
      p.textContent = '';
      Array.from(texto).forEach(function (ch, i) {
        const s = document.createElement('span');
        s.className = 'letra';
        s.style.setProperty('--i', i);
        s.textContent = ch;
        p.appendChild(s);
      });
    });
    return el.querySelectorAll('.letra');
  }

  // Títulos fora do topo: o leitor de tela lê o texto inteiro, as letras ficam só no visual
  function dividirComRotulo(el) {
    const texto = el.textContent.trim();
    el.textContent = '';
    const leitura = document.createElement('span');
    leitura.className = 'sr-only';
    leitura.textContent = texto;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    visual.className = 'palavra';
    visual.textContent = texto;
    el.append(leitura, visual);
    return dividirLetras(el);
  }

  // Palavras com "máscara": cada palavra sobe de dentro de uma janelinha
  function dividirPalavras(el) {
    (function andar(no) {
      Array.from(no.childNodes).forEach(function (filho) {
        if (filho.nodeType === 3) {
          const frag = document.createDocumentFragment();
          filho.textContent.split(/(\s+)/).forEach(function (parte) {
            if (!parte) return;
            if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(parte)); return; }
            const caixa = document.createElement('span');
            caixa.className = 'pm';
            const dentro = document.createElement('span');
            dentro.className = 'pm__in';
            dentro.textContent = parte;
            caixa.appendChild(dentro);
            frag.appendChild(caixa);
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === 1) {
          andar(filho);
        }
      });
    })(el);
    return el.querySelectorAll('.pm__in');
  }

  // Manifesto: cada palavra ganha uma camada base (creme) e uma camada colorida por cima
  function dividirManifesto(el) {
    const cores = { limao: '#FFD21F', piscina: '#2FB8D6', chiclete: '#FF5C8A', maca: '#7AC943' };
    const onda = ['#FF5C8A', '#FFD21F', '#2FB8D6', '#7AC943', '#F7A1B5'];
    const palavras = [];
    (function andar(no, corDestaque) {
      Array.from(no.childNodes).forEach(function (filho) {
        if (filho.nodeType === 3) {
          const frag = document.createDocumentFragment();
          filho.textContent.split(/(\s+)/).forEach(function (parte) {
            if (!parte) return;
            if (/^\s+$/.test(parte)) { frag.appendChild(document.createTextNode(parte)); return; }
            const w = document.createElement('span');
            w.className = 'mw';
            const base = document.createElement('span');
            base.className = 'mw__base';
            base.textContent = parte;
            const cor = document.createElement('span');
            cor.className = 'mw__cor';
            cor.setAttribute('aria-hidden', 'true');
            cor.textContent = parte;
            cor.style.color = corDestaque || onda[palavras.length % onda.length];
            w.append(base, cor);
            if (corDestaque) w.dataset.destaque = '1';
            frag.appendChild(w);
            palavras.push(w);
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === 1) {
          andar(filho, (filho.dataset && cores[filho.dataset.cor]) || corDestaque);
        }
      });
    })(el, null);
    return palavras;
  }

  // Roda fn num momento ocioso, "depoisDe" ms após a carga (quando o topo já entrou e está parado).
  // Usado para montar as cenas 3D de baixo antes de a pessoa chegar nelas.
  function quandoOcioso(fn, depoisDe) {
    setTimeout(function () {
      if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
      else fn();
    }, depoisDe);
  }

  /* ---------- Sem GSAP (CDN bloqueada)? A página continua completa e estática ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    raiz.classList.remove('carregando');
    if (hero) hero.classList.add('sem-3d');
    formulario(false);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Sempre começa no topo para a abertura aparecer (exceto com #âncora na URL)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------- Rolagem suave (Lenis), sincronizada com o ScrollTrigger ---------- */
  let lenis = null;
  if (!calmo && window.Lenis) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  Gomo.lenis = lenis;

  const alturaTopo = function () {
    const t = document.querySelector('.topo');
    return t ? t.offsetHeight : 0;
  };

  function irPara(alvo) {
    const focar = function () {
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
    };
    if (lenis) {
      lenis.scrollTo(alvo, { offset: alvo.id === 'conteudo' ? 0 : -alturaTopo(), duration: 1.4, onComplete: focar });
    } else {
      alvo.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
      focar();
    }
  }

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href');
    const alvo = id.length > 1 ? document.querySelector(id) : null;
    if (!alvo) return;
    e.preventDefault();
    irPara(alvo);
  });

  /* ---------- 1. Topo: entrada coreografada ---------- */
  const tituloHero = document.querySelector('.hero__titulo');
  dividirLetras(document.querySelector('.hero__titulo-visual'));

  function introHero() {
    const palavras = tituloHero.querySelectorAll('.palavra');
    return gsap.timeline({
      defaults: { ease: 'power4.out' },
      onComplete: function () { tituloHero.classList.add('intro-feita'); }
    })
      .from('.hero__selo', { y: 14, autoAlpha: 0, duration: 0.8 }, 0)
      .from(palavras, { yPercent: 115, duration: 1.2, stagger: 0.07 }, 0.1)
      .from('.hero__base > *', { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.12 }, 0.75);
  }

  // Embalagens em 3D no topo (a mesma vitrine da linha de produtos, com 3 pacotes)
  const ARRANJO_TOPO = {
    largo: {
      w: 6.9, h: 3.5, cy: 1.35,
      itens: { cola: [-2.15, 0, -0.9, 0.42, 0.92], framboesa: [0, 0, 0.35, 0, 1.03], uva: [2.15, 0, -0.9, -0.42, 0.9] },
      soltas: [[-1.1, 0, 1.15], [1.05, 0, 1.2], [-2.8, 0, 0.6], [2.85, 0, 0.5]]
    },
    estreito: {
      w: 5.4, h: 3.7, cy: 1.4,
      itens: { cola: [-1.6, 0, -0.9, 0.45, 0.86], framboesa: [0, 0, 0.35, 0, 0.98], uva: [1.6, 0, -0.9, -0.45, 0.84] },
      soltas: [[-0.85, 0, 1.15], [0.85, 0, 1.2], [-2.2, 0, 0.6], [2.25, 0, 0.5]]
    }
  };
  function iniciarHero3D() {
    if (!hero) return;
    const area = hero.querySelector('.hero__produtos');
    const ids = ['cola', 'framboesa', 'uva'];
    const usar2D = function () {
      if (hero.classList.contains('tem-3d') || hero.classList.contains('sem-3d')) return;
      hero.classList.add('sem-3d');
      if (!Gomo.desenharPacote) return;
      Gomo.fontesDaArte().then(function () {
        const plano = area.querySelector('.hero__plano-b');
        ids.forEach(function (id) { plano.appendChild(Gomo.desenharPacote(Gomo.sabor(id), null, 'frente', 440)); });
        if (!calmo) gsap.from(plano.children, { y: 80, autoAlpha: 0, duration: 1, ease: 'back.out(1.4)', stagger: 0.1 });
      });
    };
    if (!Gomo.iniciarVitrine3D || !Gomo.desenharPacote || !Gomo.temWebGL2()) { usar2D(); return; }

    let desistiu = false;
    // Se o 3D não ficar pronto em 12 s (rede lenta), mostra as artes planas. No modo captura, espera.
    const espera = parametros.has('momento') ? 600000 : 12000;
    const limite = setTimeout(function () { desistiu = true; usar2D(); }, espera);
    Gomo.iniciarVitrine3D({
      palco: area,
      canvas: area.querySelector('.hero__canvas'),
      ids: ids,
      ordem: ['framboesa', 'cola', 'uva'],
      arranjos: ARRANJO_TOPO,
      estiloEntrada: 'surgir',
      soltas: [['bala', '#E8212E'], ['bala', '#FFC400'], ['bala', '#58B82E'], ['bala', '#7A2BB5']],
      calmo: calmo
    }).then(function (api) {
      clearTimeout(limite);
      if (desistiu) return;
      Gomo.heroPacotes = api;
      hero.classList.add('tem-3d');
      const passou = (performance.now() - inicio) / 1000;
      gsap.delayedCall(Math.max(0, 0.35 - passou), function () { api.entrar(); });
    }).catch(function (erro) {
      clearTimeout(limite);
      console.warn('[Gomolândia] 3D indisponível; usando as artes planas.', erro);
      usar2D();
    });
  }

  // Captação de contatos no topo (visual: nada é enviado)
  function lead() {
    const form = document.getElementById('lead');
    if (!form) return;
    const campo = form.querySelector('input');
    const msg = document.getElementById('lead-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const ok = /^\S+@\S+\.\S+$/.test(campo.value.trim());
      msg.classList.remove('erro', 'ok');
      if (!ok) {
        campo.setAttribute('aria-invalid', 'true');
        msg.textContent = 'Digite um e-mail válido para receber o catálogo.';
        msg.classList.add('erro');
        campo.focus();
        if (!calmo) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
        return;
      }
      campo.removeAttribute('aria-invalid');
      msg.textContent = 'Prontinho! Isso é um conceito: nenhum dado foi enviado.';
      msg.classList.add('ok');
      form.reset();
      if (Gomo.heroPacotes && !calmo) Gomo.heroPacotes.comemorar();
    });
  }

  /* ---------- 2. Manifesto: as palavras acendem coloridas enquanto a página rola ---------- */
  function manifesto() {
    const secao = document.querySelector('.manifesto');
    if (!secao) return;
    const palavras = dividirManifesto(secao.querySelector('.manifesto__texto'));
    if (calmo) {
      palavras.forEach(function (w) {
        if (!w.dataset.destaque) return;
        w.querySelector('.mw__cor').style.opacity = 1;
        w.querySelector('.mw__base').style.opacity = 0;
      });
      return;
    }
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'manifesto',
        trigger: secao,
        start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * 1.7); },
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true
      }
    });
    palavras.forEach(function (w, i) {
      const base = w.querySelector('.mw__base');
      const cor = w.querySelector('.mw__cor');
      const t = i * 0.3;
      tl.fromTo(w, { yPercent: 22 }, { yPercent: 0, duration: 0.7, ease: 'power2.out' }, t)
        .fromTo(cor, { opacity: 0 }, { opacity: 1, duration: 0.45 }, t);
      if (w.dataset.destaque) {
        // as palavras-chave acendem e continuam coloridas
        tl.fromTo(base, { opacity: 0.16 }, { opacity: 0, duration: 0.45 }, t);
      } else {
        // as outras passam por uma cor e "esfriam" para o creme
        tl.fromTo(base, { opacity: 0.16 }, { opacity: 1, duration: 0.6 }, t + 0.3)
          .to(cor, { opacity: 0, duration: 1.1 }, t + 0.5);
      }
    });
    tl.to({}, { duration: 1.2 }); // respiro antes de soltar a seção
  }

  /* ---------- 4. Sensações: seção fixa com rolagem horizontal ----------
     Cada painel tem uma "ação" (data-acao). Quando o painel entra em cena, o personagem 3D
     e as letras do título fazem a mesma coisa juntos, e repetem de tempos em tempos. */
  const ELENCO = ['uva', 'garrafa', 'abacaxi', 'framboesa', 'manga'];

  function sensacoes() {
    const secao = document.querySelector('.sensacoes');
    if (!secao) return;
    const trilho = secao.querySelector('.sensacoes__trilho');
    const paineis = gsap.utils.toArray('.painel', secao);
    const letrasDe = paineis.map(function (p) { return Array.from(dividirComRotulo(p.querySelector('.painel__titulo'))); });
    // Brilhante: cada letra ganha uma cópia clara por cima, e o brilho passa por elas
    paineis.forEach(function (p, i) {
      if (p.dataset.acao !== 'brilho') return;
      letrasDe[i].forEach(function (l) {
        const luz = document.createElement('span');
        luz.className = 'letra__luz';
        luz.textContent = l.textContent;
        l.appendChild(luz);
      });
    });

    // Versão calma: painéis empilhados; os personagens entram como fotos (as mesmas das embalagens)
    if (calmo) {
      const colocarFotos = function () {
        const fotos = Gomo.fotosMascotes;
        if (!fotos) return false;
        paineis.forEach(function (p) {
          const palco = p.querySelector('.painel__palco');
          if (!palco || palco.childElementCount) return;
          (p.dataset.personagem === 'elenco' ? ELENCO : [p.dataset.personagem]).forEach(function (nome) {
            const foto = fotos[nome];
            if (!foto) return;
            const c = document.createElement('canvas');
            c.width = foto.width;
            c.height = foto.height;
            c.getContext('2d').drawImage(foto, 0, 0);
            palco.appendChild(c);
          });
        });
        return true;
      };
      if (!colocarFotos()) document.addEventListener('gomo:fotos', colocarFotos, { once: true });
    }

    // As letras fazem o mesmo que o personagem (só transform e opacity)
    function letrasAgem(i) {
      const letras = letrasDe[i];
      if (!letras || !letras.length) return;
      const tam = parseFloat(getComputedStyle(letras[0]).fontSize) || 100;
      const acao = paineis[i].dataset.acao;
      if (acao === 'tremer') {
        gsap.to(letras, {
          x: 'random(-4, 4)', rotation: 'random(-5, 5)', duration: 0.05, repeat: 9, repeatRefresh: true, ease: 'none',
          onComplete: function () { gsap.to(letras, { x: 0, rotation: 0, duration: 0.25, ease: 'power2.out' }); }
        });
      } else if (acao === 'onda') {
        gsap.to(letras, { y: -tam * 0.08, duration: 0.5, ease: 'sine.inOut', stagger: { each: 0.08, yoyo: true, repeat: 1 } });
      } else if (acao === 'brilho') {
        const luzes = paineis[i].querySelectorAll('.letra__luz');
        gsap.timeline()
          .to(luzes, { opacity: 0.9, duration: 0.14, ease: 'power1.out', stagger: 0.05 })
          .to(luzes, { opacity: 0, duration: 0.45, ease: 'power1.in', stagger: 0.05 }, 0.14);
      } else if (acao === 'amassar') {
        gsap.timeline()
          .to(letras, { scaleY: 0.76, scaleX: 1.1, duration: 0.2, ease: 'power2.out', stagger: 0.02 })
          .to(letras, { scaleY: 1, scaleX: 1, duration: 1.2, ease: 'elastic.out(1, 0.24)', stagger: 0.02 }, 0.2);
      } else if (acao === 'pular') {
        gsap.timeline()
          .to(letras, { y: -tam * 0.16, duration: 0.24, ease: 'power2.out', stagger: 0.055 })
          .to(letras, { y: 0, duration: 0.55, ease: 'bounce.out', stagger: 0.055 }, 0.24);
      }
    }

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      secao.classList.add('fixada');
      const barra = secao.querySelector('.sensacoes__progresso span');
      const ultimo = paineis.length - 1;
      let atual = -1;
      let api3d = null;
      let batida = null;

      const agir = function (i) {
        if (!ScrollTrigger.isInViewport(secao, 0.25)) return;
        letrasAgem(i);
        if (api3d) api3d.agir(i);
      };
      const mudar = function (i) {
        if (i === atual) return;
        atual = i;
        secao.setAttribute('data-sensacao', i);
        if (api3d) api3d.ativar(i);
        gsap.to(barra, { color: i === ultimo ? '#FFF6F1' : '#2A1630', duration: 0.3 });
        // age logo depois de chegar e repete de tempos em tempos (nas capturas, só uma vez)
        if (batida) batida.kill();
        batida = gsap.delayedCall(0.5, function bater() {
          agir(i);
          if (!Gomo.modoCaptura) batida = gsap.delayedCall(4.6, bater);
        });
      };
      const distancia = function () { return Math.max(0, trilho.scrollWidth - window.innerWidth); };

      const rolagem = gsap.to(trilho, {
        x: function () { return -distancia(); },
        ease: 'none', // obrigatório para a rolagem horizontal casar com a vertical
        scrollTrigger: {
          id: 'sensacoes',
          trigger: secao,
          pin: true,
          scrub: 0.6,
          start: 'top top',
          end: function () { return '+=' + distancia(); },
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            gsap.set(barra, { scaleX: self.progress });
            mudar(Math.round(self.progress * (paineis.length - 1)));
          }
        }
      });

      ScrollTrigger.create({ trigger: secao, start: 'top 60%', onEnter: function () { if (atual < 0) mudar(0); } });

      // Entrada de cada painel: letras sobem (yPercent) e o resto aparece.
      // As ações usam outras propriedades (x, y, escala, rotação), então nada briga.
      paineis.forEach(function (p, i) {
        const outros = p.querySelectorAll('.painel__texto, .painel__sabor, .painel__botao');
        const gatilho = i === 0
          ? { trigger: secao, start: 'top 55%', toggleActions: 'play none none reverse' }
          : { trigger: p, containerAnimation: rolagem, start: 'left 65%', toggleActions: 'play none none reverse' };
        gsap.timeline({ scrollTrigger: gatilho })
          .from(letrasDe[i], { yPercent: 60, autoAlpha: 0, duration: 0.8, ease: 'power4.out', stagger: 0.035 })
          .from(outros, { y: 24, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, 0.15);
      });

      // Personagens 3D: montados num momento ocioso (ou antes, se a seção se aproximar)
      if (Gomo.iniciarSensacoes3D && Gomo.temWebGL2()) {
        let iniciado = false;
        const iniciar3D = function () {
          if (iniciado) return;
          iniciado = true;
          obs.disconnect();
          Gomo.iniciarSensacoes3D({
            secao: secao,
            palco: secao.querySelector('.sensacoes__palco'),
            canvas: secao.querySelector('.sensacoes__canvas'),
            trilho: trilho,
            paineis: paineis
          }).then(function (api) {
            api3d = api;
            secao.classList.add('tem-3d');
            if (atual >= 0) api.ativar(atual);
          }).catch(function (erro) {
            console.warn('[Gomolândia] 3D das sensações indisponível.', erro);
          });
        };
        const obs = new IntersectionObserver(function (e) { if (e[0].isIntersecting) iniciar3D(); }, { rootMargin: '150% 0px' });
        obs.observe(secao);
        quandoOcioso(iniciar3D, 5000);
      }

      return function () {
        secao.classList.remove('fixada');
        if (batida) batida.kill();
      };
    });
  }

  /* ---------- 3. Linha de produtos: vitrine 3D + lista de sabores ---------- */
  function produtos() {
    const secao = document.querySelector('.produtos');
    if (!secao) return;
    const vitrine = secao.querySelector('.vitrine');
    const botoes = Array.from(secao.querySelectorAll('.sabor'));
    let api = null;

    const marcar = function (id) {
      botoes.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.sabor === id ? 'true' : 'false'); });
    };
    botoes.forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      const id = b.dataset.sabor;
      const ligar = function () { if (api) api.focar(id); marcar(id); };
      const desligar = function () { if (api) api.focar(null); marcar(null); };
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') ligar(); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') desligar(); });
      b.addEventListener('focus', ligar);
      b.addEventListener('blur', desligar);
      b.addEventListener('click', ligar);
    });

    if (!calmo) {
      gsap.set(botoes, { y: 30, autoAlpha: 0 });
      ScrollTrigger.batch(botoes, {
        start: 'top 92%', once: true,
        onEnter: function (els) { gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.07, overwrite: true }); }
      });
    }

    const usar2D = function () {
      vitrine.classList.add('sem-3d');
      if (!Gomo.desenharPacote) return;
      Gomo.fontesDaArte().then(function () {
        const plano = vitrine.querySelector('.vitrine__plano-b');
        Gomo.SABORES.forEach(function (s) { plano.appendChild(Gomo.desenharPacote(s, null, 'frente', 440)); });
        ScrollTrigger.refresh();
      });
    };
    if (!Gomo.iniciarVitrine3D || !Gomo.desenharPacote || !Gomo.temWebGL2()) { usar2D(); return; }

    // montada num momento ocioso (ou antes, se a vitrine se aproximar)
    let iniciada = false;
    const iniciar3D = function () {
      if (iniciada) return;
      iniciada = true;
      obs.disconnect();
      Gomo.iniciarVitrine3D({
        secao: secao,
        palco: vitrine,
        canvas: vitrine.querySelector('.vitrine__canvas'),
        etiqueta: vitrine.querySelector('.vitrine__etiqueta'),
        calmo: calmo
      }).then(function (a) {
        api = a;
        Gomo.vitrine3d = a;
        vitrine.classList.add('tem-3d');
        ScrollTrigger.create({ trigger: vitrine, start: 'top 72%', once: true, onEnter: function () { a.entrar(); } });
      }).catch(function (erro) {
        console.warn('[Gomolândia] vitrine 3D indisponível; usando as artes planas.', erro);
        usar2D();
      });
    };
    const obs = new IntersectionObserver(function (e) { if (e[0].isIntersecting) iniciar3D(); }, { rootMargin: '150% 0px' });
    obs.observe(vitrine);
    quandoOcioso(iniciar3D, 3000);
  }

  /* ---------- Entradas ao rolar (títulos e blocos) ---------- */
  function revelar() {
    document.querySelectorAll('[data-palavras]').forEach(function (el) {
      const palavras = dividirPalavras(el);
      if (calmo) return;
      gsap.from(palavras, {
        yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.07,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
    if (calmo) return;
    const blocos = gsap.utils.toArray('[data-revelar]');
    gsap.set(blocos, { y: 36, autoAlpha: 0 });
    ScrollTrigger.batch(blocos, {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out', overwrite: true }); }
    });
  }

  /* ---------- Faixa corrida: anda sozinha e acelera/inclina com a rolagem ---------- */
  function letreiro() {
    const trilho = document.querySelector('.letreiro__trilho');
    if (!trilho || calmo) return;
    const loop = gsap.to(trilho, { xPercent: -50, ease: 'none', duration: 26, repeat: -1 });
    const inclinar = gsap.quickTo(trilho, 'skewX', { duration: 0.5, ease: 'power3' });
    ScrollTrigger.create({
      trigger: '.letreiro', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        const n = gsap.utils.clamp(-1, 1, self.getVelocity() / 2500);
        inclinar(n * -8);
        gsap.to(loop, { timeScale: 1 + Math.abs(n) * 5, duration: 0.25, overwrite: true });
      }
    });
    ScrollTrigger.addEventListener('scrollEnd', function () {
      inclinar(0);
      gsap.to(loop, { timeScale: 1, duration: 0.9, overwrite: true });
    });
  }

  /* ---------- Cabeçalho: some ao descer, volta ao subir ---------- */
  function cabecalho() {
    const topo = document.querySelector('.topo');
    if (!topo) return;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        const y = self.scroll();
        if (calmo) return;
        if (y > 600 && self.direction === 1 && !topo.contains(document.activeElement)) topo.classList.add('topo--escondido');
        else if (self.direction === -1) topo.classList.remove('topo--escondido');
      }
    });
    topo.addEventListener('focusin', function () { topo.classList.remove('topo--escondido'); });
  }

  /* ---------- 5. Contato: embalagens desenhadas + formulário visual ---------- */
  function contatoPacotes() {
    const alvo = document.querySelector('.contato__pacotes');
    if (!alvo || !Gomo.desenharPacote || window.matchMedia('(max-width: 899px)').matches) return;
    const obs = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return;
      obs.disconnect();
      Gomo.fontesDaArte().then(function () {
        const fotos = Gomo.fotosMascotes || {};
        ['uva', 'framboesa', 'cola'].forEach(function (id) {
          const s = Gomo.sabor(id);
          alvo.appendChild(Gomo.desenharPacote(s, s.mascote ? fotos[s.mascote] : null, 'frente', 300));
        });
        if (!calmo) gsap.from(alvo.children, { y: 90, autoAlpha: 0, duration: 1.1, ease: 'back.out(1.5)', stagger: 0.1 });
      });
    }, { rootMargin: '40% 0px' });
    obs.observe(alvo);
  }

  function formulario(animar) {
    const form = document.getElementById('formulario');
    const msg = document.getElementById('formulario-msg');
    if (!form) return;
    [form.nome, form.email].forEach(function (c) { c.setAttribute('aria-describedby', 'formulario-msg'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const nome = form.nome.value.trim();
      const email = form.email.value.trim();
      [form.nome, form.email].forEach(function (c) { c.removeAttribute('aria-invalid'); });
      const invalido = !nome ? form.nome : (!/^\S+@\S+\.\S+$/.test(email) ? form.email : null);
      if (invalido) {
        invalido.setAttribute('aria-invalid', 'true');
        msg.textContent = !nome ? 'Conta pra gente o seu nome.' : 'Esse e-mail parece incompleto. Confere?';
        msg.classList.add('erro');
        invalido.focus();
        if (animar && !calmo) gsap.fromTo(invalido, { x: -10 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
        return;
      }
      msg.classList.remove('erro');
      msg.textContent = 'Valeu, ' + nome.split(' ')[0] + '! Isso é um conceito: nada foi enviado.';
      if (animar && !calmo) confete(form.querySelector('button'));
      form.reset();
    });
  }

  function confete(origem) {
    const r = origem.getBoundingClientRect();
    const formas = ['forma-anel', 'forma-estrela', 'forma-cubo', 'forma-gota'];
    const cores = ['#FFD21F', '#2FB8D6', '#7AC943', '#FF5C8A', '#6B2FB3', '#D4113A'];
    const NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 18; i++) {
      const el = document.createElementNS(NS, 'svg');
      el.setAttribute('class', 'confete');
      el.setAttribute('aria-hidden', 'true');
      el.style.color = cores[i % cores.length];
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', '#' + formas[i % formas.length]);
      el.appendChild(use);
      document.body.appendChild(el);
      const ang = gsap.utils.random(-Math.PI * 0.92, -Math.PI * 0.08);
      const forca = gsap.utils.random(140, 340);
      gsap.set(el, { x: r.left + r.width / 2 - 15, y: r.top + r.height / 2 - 15, rotate: gsap.utils.random(-90, 90), scale: gsap.utils.random(0.6, 1.15) });
      gsap.timeline({ onComplete: function () { el.remove(); } })
        .to(el, { x: '+=' + Math.cos(ang) * forca, duration: 1.4, ease: 'power1.out' }, 0)
        .to(el, { y: '+=' + Math.sin(ang) * forca, duration: 0.55, ease: 'power2.out' }, 0)
        .to(el, { y: '+=280', duration: 0.85, ease: 'power2.in' }, 0.55)
        .to(el, { rotate: '+=' + gsap.utils.random(-360, 360), duration: 1.4, ease: 'none' }, 0)
        .to(el, { autoAlpha: 0, duration: 0.35 }, 1.05);
    }
  }

  /* ---------- 6. Rodapé: letras do logo fazem "ola" ---------- */
  function rodape() {
    const logo = document.querySelector('.rodape__logo');
    if (!logo) return;
    const leitura = document.createElement('span');
    leitura.className = 'sr-only';
    leitura.textContent = logo.textContent.trim();
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    let i = 0;
    Array.from(logo.childNodes).forEach(function (no) {
      const destaque = no.nodeType === 1;
      Array.from(no.textContent).forEach(function (ch) {
        const s = document.createElement('span');
        s.className = 'letra' + (destaque ? ' logo__i' : '');
        s.style.setProperty('--i', i++);
        s.textContent = ch;
        visual.appendChild(s);
      });
    });
    logo.textContent = '';
    logo.append(leitura, visual);
  }

  /* ---------- Modo demonstração (?demo): passeio automático para gravar vídeo ---------- */
  function esperar(s) { return new Promise(function (r) { setTimeout(r, s * 1000); }); }
  function rolarAte(alvo, duracao, extra) {
    return new Promise(function (r) {
      lenis.scrollTo(alvo, Object.assign({ duration: duracao, offset: -alturaTopo(), force: true, onComplete: r }, extra));
    });
  }
  async function digitar(campo, texto) {
    campo.focus({ preventScroll: true });
    for (const ch of texto) {
      campo.value += ch;
      await esperar(0.06);
    }
  }
  async function passeio() {
    if (!lenis) return;
    raiz.classList.add('modo-demo');
    await esperar(4.2);
    if (Gomo.heroPacotes) Gomo.heroPacotes.comemorar();
    await esperar(2.4);
    const man = ScrollTrigger.getById('manifesto');
    if (man) {
      await rolarAte(man.start, 1.6, { offset: 0 });
      await rolarAte(man.end, 7, { offset: 0, easing: function (t) { return t; } });
      await esperar(1);
    }
    await rolarAte('.vitrine', 1.8, { offset: -40 });
    await esperar(2.2);
    for (const id of ['framboesa', 'cola', 'doces', 'uva', 'minifrutas']) {
      if (Gomo.vitrine3d) Gomo.vitrine3d.focar(id);
      await esperar(0.9);
    }
    if (Gomo.vitrine3d) Gomo.vitrine3d.focar(null);
    await esperar(0.6);
    const st = ScrollTrigger.getById('sensacoes');
    if (st) {
      await rolarAte(st.start, 1.6, { offset: 0 });
      await esperar(1.4);
      await rolarAte(st.end, 15, { offset: 0, easing: function (t) { return t; } });
      await esperar(3);
    }
    await rolarAte('#contato', 1.8);
    await esperar(0.6);
    await digitar(document.getElementById('nome'), 'Ana Souza');
    await digitar(document.getElementById('email'), 'ana@exemplo.com');
    await esperar(0.5);
    document.getElementById('formulario').requestSubmit();
    await esperar(2.6);
    await rolarAte(document.documentElement.scrollHeight, 1.8, { offset: 0 });
  }

  /* ---------- Modo captura (?momento=...): vai direto a um momento da página para prints ----------
     valores: topo, ideia, sabores, azedinho, doce, brilhante, macio, explosivo, contato */
  async function momento(nome) {
    raiz.classList.add('modo-demo');
    const pular = function (y) {
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    };
    const topoDe = function (sel) {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    };
    const ordem = ['azedinho', 'doce', 'brilhante', 'macio', 'explosivo'];
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await esperar(0.8);
    ScrollTrigger.refresh();
    if (nome === 'topo') return;
    if (nome === 'ideia') {
      const man = ScrollTrigger.getById('manifesto');
      if (man) { pular(man.start + (man.end - man.start) * 0.72); return; }
      pular(topoDe('#sobre'));
      return;
    }
    if (ordem.indexOf(nome) > -1) {
      const st = ScrollTrigger.getById('sensacoes');
      if (!st) { pular(topoDe('#sensacoes')); return; }
      pular(st.start - 400);
      await esperar(0.6);
      pular(st.start + (st.end - st.start) * (ordem.indexOf(nome) / 4) + 2);
      return;
    }
    if (nome === 'sabores') {
      pular(topoDe('.vitrine') - 40);
      return;
    }
    pular(topoDe('#' + nome));
  }

  /* ---------- Início ---------- */
  if (!calmo) introHero();
  else tituloHero.classList.add('intro-feita');
  raiz.classList.remove('carregando');
  iniciarHero3D();
  manifesto(); // seções fixas primeiro, de cima para baixo
  sensacoes();
  revelar();
  letreiro();
  produtos();
  cabecalho();
  formulario(true);
  lead();
  contatoPacotes();
  rodape();
  if (Gomo.iniciarCursor) Gomo.iniciarCursor();
  if (modoDemo) passeio();
  if (parametros.get('momento')) momento(parametros.get('momento'));

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
      if (Gomo.heroPacotes) Gomo.heroPacotes.relayout();
    });
  }
})();
