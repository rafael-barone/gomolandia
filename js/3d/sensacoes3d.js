/* =========================================================
   Gomolândia — cena 3D da seção Sensações
   Cada painel tem o seu personagem de pé no "chão", com sombra de contato,
   e ele anda junto com o painel na rolagem horizontal (a área de cada um
   é a caixa .painel__palco, definida no CSS):
   Azedinho → Abacaxi (careta e arrepio)     Doce → Framboesa (balança, corada)
   Brilhante → Garrafinha (gira e pega a luz)  Macio → Uva (amassa e volta)
   Explosivo → a turma toda na "foto de elenco" (no celular, em duas fileiras), pulando em onda
   O main.js decide quando cada painel age e anima as letras no mesmo tempo.
   ========================================================= */
(function () {
  'use strict';

  const Gomo = (window.Gomo = window.Gomo || {});

  Gomo.iniciarSensacoes3D = async function (op) {
    // op: { secao, palco, canvas, trilho, paineis }
    const lib = await Gomo.carregar3D();
    const THREE = lib.THREE;
    const movel = window.matchMedia('(max-width: 767px)').matches;
    const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // a montagem é feita em pedaços, com pausas, para a página não travar
    const pausa = function () { return new Promise(function (r) { setTimeout(r, 16); }); };

    const palco = Gomo.criarPalco(lib, op.canvas, { dprMax: movel ? 1.5 : 2, fov: 26, distancia: 18 });
    const renderer = palco.renderer, cena = palco.cena, camera = palco.camera;
    cena.environmentIntensity = 0.7;
    const fab = Gomo.criarFabrica(lib, { qualidade: movel ? 0.5 : 0.9, contorno: false });
    await pausa();

    /* ---------- Sombra de contato (uma textura, um plano deitado por personagem) ---------- */
    const texSombra = (function () {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(42, 22, 48, 0.6)');
      g.addColorStop(0.42, 'rgba(42, 22, 48, 0.3)');
      g.addColorStop(1, 'rgba(42, 22, 48, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const geoSombra = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

    /* ---------- Personagens ---------- */
    const CRIAR = {
      abacaxi: function () { return fab.abacaxi(); },
      framboesa: function () { return fab.framboesa({ piscar: false }); },
      garrafa: function () { return fab.garrafa(); },
      uva: function () { return fab.uva(); },
      manga: function () { return fab.manga({ piscar: false }); }
    };
    // "Foto de elenco". No desktop: uma fila em V aberto, o mais alto no meio.
    // No celular: 3 na frente e 2 atrás, um degrau acima, aparecendo entre as cabeças da frente.
    const ELENCO = ['uva', 'garrafa', 'abacaxi', 'framboesa', 'manga'];
    const PROFUNDIDADE = [-0.55, -0.2, 0.25, -0.2, -0.55];
    const FRENTE = ['uva', 'framboesa', 'manga'], ATRAS = ['garrafa', 'abacaxi'];
    const DEGRAU = 1.25;

    // Mede só o que aparece (ignora corações e faíscas escondidos)
    const caixa = new THREE.Box3(), pedaco = new THREE.Box3(), medida = new THREE.Vector3();
    function medirVisivel(obj) {
      caixa.makeEmpty();
      obj.updateWorldMatrix(true, true);
      obj.traverseVisible(function (o) {
        if (o.isInstancedMesh) {
          if (!o.boundingBox) o.computeBoundingBox();
          pedaco.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
        } else if (o.isMesh) {
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          pedaco.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        } else {
          return;
        }
        caixa.union(pedaco);
      });
      return caixa;
    }

    function criarAtor(nome) {
      const m = CRIAR[nome]();
      m.tremorAuto = false; // o arrepio do azedinho é comandado pelo main.js
      const suporte = new THREE.Group();
      suporte.add(m.raiz);
      m.atualizar(0, 10, null, true); // pose de descanso
      const cx = medirVisivel(suporte);
      cx.getSize(medida);
      const baixo = cx.min.y, esq = cx.min.x, dir = cx.max.x;
      // o centro é o do corpo (o braço da garrafinha não puxa o personagem para o lado)
      // (medirVisivel já calculou a caixa de cada geometria, inclusive a do corpo)
      const corpo = pedaco.copy(m.corpo.geometry.boundingBox).applyMatrix4(m.corpo.matrixWorld);
      const centro = (corpo.min.x + corpo.max.x) / 2;
      const larguraCorpo = corpo.max.x - corpo.min.x;
      // apoia o ponto mais baixo no chão (y = 0)
      m.pos.set(-centro, -baixo, 0);
      const sombra = new THREE.Mesh(geoSombra, new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, toneMapped: false }));
      const larguraSombra = Math.max(larguraCorpo, medida.x * 0.7);
      sombra.scale.set(larguraSombra, 1, medida.z + 0.35);
      sombra.position.y = 0.004;
      sombra.renderOrder = -1;
      suporte.add(sombra);
      cena.add(suporte);
      return {
        nome: nome, m: m, suporte: suporte, sombra: sombra, larguraSombra: larguraSombra,
        altura: medida.y, largura: medida.x, esquerda: centro - esq, direita: dir - centro
      };
    }

    // Posições (unidades do modelo) de uma fila de atores com os corpos encostando de leve
    function enfileirar(lista, sobrepor) {
      let x = 0;
      const xs = lista.map(function (a, i) {
        if (i > 0) x += (lista[i - 1].direita + a.esquerda) * sobrepor;
        return x;
      });
      const ini = -lista[0].esquerda, fim = x + lista[lista.length - 1].direita;
      return { xs: xs.map(function (v) { return v - (ini + fim) / 2; }), largura: fim - ini };
    }
    function montarElenco(c) {
      const por = {};
      c.atores.forEach(function (a) { por[a.nome] = a; });
      const pos = {};
      if (!movel) {
        const fila = enfileirar(c.atores, 0.95);
        c.atores.forEach(function (a, i) { pos[a.nome] = { x: fila.xs[i], y: 0, z: PROFUNDIDADE[i] }; });
        c.larguraFila = fila.largura;
        c.alturaFila = Math.max.apply(null, c.atores.map(function (a) { return a.altura; }));
      } else {
        const frente = FRENTE.map(function (n) { return por[n]; });
        const fila = enfileirar(frente, 0.92);
        frente.forEach(function (a, i) { pos[a.nome] = { x: fila.xs[i], y: 0, z: 0.35 }; });
        // os de trás ficam nos vãos entre as cabeças da frente (os pés somem atrás dos corpos)
        ATRAS.forEach(function (n, i) { pos[n] = { x: (fila.xs[i] + fila.xs[i + 1]) / 2, y: DEGRAU, z: -0.9 }; });
        c.larguraFila = fila.largura;
        c.alturaFila = Math.max.apply(null, c.atores.map(function (a) { return pos[a.nome].y + a.altura; }));
      }
      c.fila = c.atores.map(function (a) { return pos[a.nome]; });
      c.atores.forEach(function (a, i) { a.sombra.visible = c.fila[i].y === 0; });
      // a onda de pulos vai da esquerda para a direita, como as letras
      c.ordem = c.atores.map(function (_, i) { return i; }).sort(function (i, j) { return c.fila[i].x - c.fila[j].x; });
    }

    const cenas = [];
    for (let i = 0; i < op.paineis.length; i++) {
      const painel = op.paineis[i];
      const elenco = painel.dataset.personagem === 'elenco';
      const atores = (elenco ? ELENCO : [painel.dataset.personagem]).map(criarAtor);
      const c = { painel: painel, acao: painel.dataset.acao, anc: painel.querySelector('.painel__palco'), atores: atores, elenco: elenco, caixa: { x: 0, y: 0, w: 1, h: 1 } };
      if (elenco) montarElenco(c);
      cenas.push(c);
      await pausa(); // um painel por vez
    }
    // todos na mesma escala (como uma família): o mais alto ocupa a altura da caixa
    const alturaRef = Math.max.apply(null, cenas.map(function (c) {
      return Math.max.apply(null, c.atores.map(function (a) { return a.altura; }));
    }));

    /* ---------- Layout: cada caixa .painel__palco vira um lugar no chão do mundo 3D ---------- */
    let W = 1, H = 1, k = 0.01; // k = unidades do mundo por pixel (no plano z = 0)
    function medirCaixas() {
      const rs = op.palco.getBoundingClientRect();
      const tx = Number(gsap.getProperty(op.trilho, 'x')) || 0;
      cenas.forEach(function (c) {
        const r = c.anc.getBoundingClientRect();
        c.caixa.x = r.left - rs.left - tx; // posição dentro do trilho, sem a rolagem
        c.caixa.y = r.top - rs.top;
        c.caixa.w = r.width;
        c.caixa.h = r.height;
      });
    }
    function layout() {
      const r = op.palco.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      k = (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / H;
      medirCaixas();
    }

    function posicionar() {
      const tx = Number(gsap.getProperty(op.trilho, 'x')) || 0;
      for (let j = 0; j < cenas.length; j++) {
        const c = cenas[j];
        const x = c.caixa.x + tx;
        const ve = x + c.caixa.w > -W * 0.3 && x < W * 1.3;
        for (let i = 0; i < c.atores.length; i++) c.atores[i].suporte.visible = ve;
        if (!ve) continue;
        const cx = (x + c.caixa.w / 2 - W / 2) * k;
        const chao = -(c.caixa.y + c.caixa.h - H / 2) * k;
        const larg = c.caixa.w * k, alt = c.caixa.h * k;
        if (c.elenco) {
          const s = Math.min(larg / c.larguraFila, alt / c.alturaFila);
          for (let i = 0; i < c.atores.length; i++) {
            const a = c.atores[i], f = c.fila[i];
            a.suporte.position.set(cx + f.x * s, chao + f.y * s, f.z * s);
            a.suporte.rotation.y = -f.x * 0.06; // as pontas viram de leve para o centro
            a.suporte.scale.setScalar(s);
          }
        } else {
          const a = c.atores[0];
          a.suporte.position.set(cx, chao, 0);
          a.suporte.scale.setScalar(Math.min(larg / a.largura, alt / alturaRef));
        }
      }
    }

    /* ---------- Ações (sempre em sincronia com as letras do título) ---------- */
    // quique curto com achatamento, sem pirueta
    function quicar(m, forca, atraso) {
      const a = m.anim, f = forca || 1;
      return gsap.timeline({ delay: atraso || 0, defaults: { overwrite: 'auto' } })
        .to(a, { estica: 0.8, duration: 0.1, ease: 'power2.out' })
        .to(a, { estica: 1.12, salto: 0.55 * f, duration: 0.26, ease: 'power2.out' }, 0.1)
        .to(a, { estica: 1, duration: 0.18, ease: 'sine.out' }, 0.26)
        .to(a, { salto: 0, duration: 0.24, ease: 'power2.in' }, 0.36)
        .to(a, { estica: 0.8, duration: 0.07, ease: 'power1.out' }, 0.6)
        .to(a, { estica: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' }, 0.67);
    }
    function balancar(m) {
      gsap.timeline({ defaults: { ease: 'sine.inOut', overwrite: 'auto' } })
        .to(m.anim, { giroZ: 0.13, duration: 0.45 })
        .to(m.anim, { giroZ: -0.13, duration: 0.9 })
        .to(m.anim, { giroZ: 0, duration: 0.65 });
    }
    function girar(m) {
      quicar(m, 0.45);
      gsap.to(m.anim, {
        giroY: '+=' + Math.PI * 2, duration: 1.05, delay: 0.06, ease: 'power3.inOut',
        onComplete: function () { m.anim.giroY %= Math.PI * 2; }
      });
    }
    function amassar(m) {
      gsap.timeline({ defaults: { overwrite: 'auto' } })
        .to(m.anim, { estica: 0.62, duration: 0.22, ease: 'power2.out' })
        .to(m.anim, { estica: 1, duration: 1.3, ease: 'elastic.out(1, 0.22)' });
    }

    function agir(i) {
      const c = cenas[i];
      if (!c) return;
      const m = c.atores[0].m;
      if (c.acao === 'tremer') { m.tremer(); m.piscar(); }
      else if (c.acao === 'onda') balancar(m);
      else if (c.acao === 'brilho') girar(m);
      else if (c.acao === 'amassar') amassar(m);
      else if (c.acao === 'pular') c.ordem.forEach(function (idx, n) { quicar(c.atores[idx].m, 1, 0.05 + n * 0.11); });
    }

    // expressão de cada sensação (os outros painéis voltam ao normal)
    const EXPRESSAO = { tremer: 'azedo', onda: 'normal', brilho: 'normal', amassar: 'sono', pular: 'normal' };
    const BOCHECHA = { onda: 1, brilho: 0.85, pular: 0.85 };
    function ativar(i) {
      cenas.forEach(function (c, j) {
        c.atores.forEach(function (a) {
          const m = a.m;
          if (j === i) {
            m.expressao(EXPRESSAO[c.acao] || 'normal');
            if (BOCHECHA[c.acao]) gsap.to(m.anim, { bochecha: BOCHECHA[c.acao], duration: 0.6, delay: 0.02, ease: 'back.out(2)' });
          } else if (m.estadoNome !== 'normal') {
            m.expressao('normal');
          }
        });
      });
    }

    /* ---------- Olhar: todos acompanham o ponteiro ---------- */
    const ponteiro = new THREE.Vector2();
    let ponteiroAtivo = false;
    const alvo = new THREE.Vector3(0, 0, 5);
    const dir = new THREE.Vector3();
    if (temMouse) {
      window.addEventListener('pointermove', function (e) {
        const r = op.canvas.getBoundingClientRect();
        ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ponteiroAtivo = true;
      }, { passive: true });
    }

    /* ---------- Quadro a quadro ---------- */
    let tempo = 0, visivel = false;
    function desenhar(dt) {
      tempo += dt;
      let alvoAtual;
      if (ponteiroAtivo) {
        dir.set(ponteiro.x, ponteiro.y, 0.5).unproject(camera).sub(camera.position).normalize();
        alvoAtual = alvo.copy(camera.position).addScaledVector(dir, (5 - camera.position.z) / dir.z);
      } else {
        alvoAtual = alvo.set(Math.sin(tempo * 0.5) * 3, Math.cos(tempo * 0.4) * 1.2 + 0.5, 5);
      }
      posicionar();
      for (let j = 0; j < cenas.length; j++) {
        const atores = cenas[j].atores;
        for (let i = 0; i < atores.length; i++) {
          const a = atores[i];
          if (!a.suporte.visible) continue;
          a.m.atualizar(tempo, dt, alvoAtual, false);
          // no pulo, a sombra encolhe e clareia
          const alto = Math.max(0, a.m.anim.salto);
          const s = 1 / (1 + alto * 0.9);
          a.sombra.material.opacity = 0.95 * s;
          a.sombra.scale.x = a.larguraSombra * (0.65 + 0.35 * s);
        }
      }
      renderer.render(cena, camera);
    }

    let pronto = false; // só desenha depois de compilar (evita engasgo na primeira aparição)
    function quadro(_, deltaMs) {
      if (!visivel || !pronto) return;
      desenhar(Math.min(0.05, (deltaMs || 16) / 1000));
    }

    new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(op.secao);
    new ResizeObserver(layout).observe(op.palco);
    ScrollTrigger.addEventListener('refresh', medirCaixas);
    layout();
    gsap.ticker.add(quadro);
    await Gomo.compilarTudo(renderer, cena, camera); // compila e "aquece" todos os personagens
    posicionar();
    pronto = true;

    return { ativar: ativar, agir: agir, relayout: layout };
  };
})();
