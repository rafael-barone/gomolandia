/* =========================================================
   Gomolândia — vitrine 3D (usada no topo e na linha de produtos)
   "Foto de família" das embalagens originais, em 4 formatos:
   pacote com furinho, travesseiro, caixinha e pote transparente
   (com balas 3D de verdade lá dentro). Os mascotes 3D são
   "fotografados" e impressos nas embalagens.
   ========================================================= */
(function () {
  'use strict';

  const Gomo = (window.Gomo = window.Gomo || {});

  Gomo.iniciarVitrine3D = async function (op) {
    // op: { palco, canvas, etiqueta, calmo, ids (produtos), arranjos, soltas, ordem, dprMax }
    const lib = await Gomo.carregar3D();
    const THREE = lib.THREE;
    const calmo = !!op.calmo;
    const movel = window.matchMedia('(max-width: 767px)').matches;
    const temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const palco = Gomo.criarPalco(lib, op.canvas, { dprMax: op.dprMax || (movel ? 1.5 : 1.75), fov: 24, distancia: 19 });
    const renderer = palco.renderer, cena = palco.cena, camera = palco.camera;
    cena.environmentIntensity = 0.62;
    const OLHO = new THREE.Vector3(0, 2.4, 19);
    const MIRA = new THREE.Vector3(0, -0.2, 0);
    camera.position.copy(OLHO);
    camera.lookAt(MIRA);
    await Gomo.fontesDaArte();
    const fab = Gomo.criarFabrica(lib, { qualidade: movel ? 0.6 : 1, contorno: false });

    /* ---------- 1. Fotos dos mascotes para as embalagens ---------- */
    function fotografarMascotes(tam) {
      const cenaFoto = new THREE.Scene();
      cenaFoto.environment = cena.environment;
      cenaFoto.environmentIntensity = 0.85;
      const l1 = new THREE.DirectionalLight('#fff3e6', 2.4);
      l1.position.set(-4, 6, 8);
      const l2 = new THREE.DirectionalLight('#c9f3ff', 1.8);
      l2.position.set(5, 3, -6);
      cenaFoto.add(l1, l2, new THREE.HemisphereLight('#ffffff', '#ffc2d4', 0.6));
      const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
      cam.position.set(0, 0, 12);
      const visivel = 2 * 12 * Math.tan((24 * Math.PI) / 360);
      const dprAntes = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(tam, tam, false);
      const fotos = {};
      const lista = { garrafa: fab.garrafa(), framboesa: fab.framboesa(), manga: fab.manga(), uva: fab.uva(), abacaxi: fab.abacaxi() };
      const alvo = new THREE.Vector3(1.4, 0.6, 12);
      const caixa = new THREE.Box3(), medida = new THREE.Vector3(), centro = new THREE.Vector3();
      const pose = function (m) {
        for (let i = 0; i < 3; i++) {
          cenaFoto.updateMatrixWorld(true);
          m.atualizar(0, 10, alvo, true);
        }
        cenaFoto.updateMatrixWorld(true);
      };
      Object.keys(lista).forEach(function (nome) {
        const m = lista[nome];
        m.anim.bochecha = Math.max(0.6, m.anim.bochecha);
        cenaFoto.add(m.raiz);
        // mede o personagem inteiro e enquadra com folga
        m.raiz.scale.setScalar(1);
        m.pos.set(0, 0, 0);
        pose(m);
        caixa.setFromObject(m.raiz);
        caixa.getSize(medida);
        caixa.getCenter(centro);
        const s = (visivel * 0.84) / Math.max(medida.x, medida.y);
        m.raiz.scale.setScalar(s);
        m.pos.set(-centro.x * s, -centro.y * s, 0);
        pose(m);
        renderer.render(cenaFoto, cam);
        const c = document.createElement('canvas');
        c.width = tam;
        c.height = tam;
        c.getContext('2d').drawImage(renderer.domElement, 0, 0, tam, tam);
        fotos[nome] = c;
        cenaFoto.remove(m.raiz);
      });
      renderer.setPixelRatio(dprAntes);
      return fotos;
    }
    // as fotos são canvas 2D: a primeira cena que fotografa compartilha com as outras
    const fotos = Gomo.fotosMascotes || fotografarMascotes(movel ? 384 : 512);
    if (!Gomo.fotosMascotes) {
      Gomo.fotosMascotes = fotos;
      document.dispatchEvent(new CustomEvent('gomo:fotos')); // a versão calma das Sensações usa as fotos
    }

    /* ---------- 2. Materiais e texturas ---------- */
    const anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    function textura(canvas) {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = anisotropia;
      return t;
    }
    function filme(canvas) {
      return new THREE.MeshPhysicalMaterial({ map: textura(canvas), roughness: 0.42, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.24, alphaTest: 0.5 });
    }
    function papelao(canvasOuCor) {
      const p = { roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25 };
      if (typeof canvasOuCor === 'string') p.color = new THREE.Color(canvasOuCor);
      else p.map = textura(canvasOuCor);
      return new THREE.MeshPhysicalMaterial(p);
    }
    function texturaSombra() {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(42, 22, 48, .6)');
      g.addColorStop(0.55, 'rgba(42, 22, 48, .2)');
      g.addColorStop(1, 'rgba(42, 22, 48, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      return textura(c);
    }
    const texSombra = texturaSombra();
    function sombra(larg, prof) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(larg, prof), new THREE.MeshBasicMaterial({ map: texSombra, transparent: true, depthWrite: false, opacity: 0.7 }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.005;
      m.renderOrder = -1;
      return m;
    }

    /* ---------- 3. Geometrias das embalagens ---------- */
    function geoFilme(L, A, doy) {
      const g = new THREE.PlaneGeometry(L, A, 48, 72);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i);
        const y = p.getY(i);
        const nx = x / (L / 2), ny = y / (A / 2);
        const bx = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(nx), 3.2)), 0.55);
        let by = 0;
        if (doy) {
          // pacote em pé: mais cheio embaixo, solda reta em cima
          if (ny < 0.83) by = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(Math.max(0, (ny + 1) / 1.83), 0.75))), 0.5);
        } else if (Math.abs(ny) < 0.85) {
          by = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ny) / 0.85, 3.2)), 0.6);
        }
        let z = (doy ? 0.34 : 0.26) * bx * by;
        z += 0.011 * Math.sin(x * 21) * Math.pow(1 - by, 3) * bx;
        z += 0.006 * Math.sin(x * 7 + y * 4) * bx * by;
        x -= Math.sign(x) * 0.075 * by * nx * nx;
        p.setXYZ(i, x, y, z);
      }
      g.computeVertexNormals();
      return g;
    }
    const geoDoy = geoFilme(2, 2.9, true);
    const geoTrav = geoFilme(2, 3, false);

    /* ---------- 4. Construção de cada produto ---------- */
    const largArte = movel ? 512 : 768;

    function produtoFilme(s) {
      const doy = s.formato === 'doypack';
      const A = doy ? 2.9 : 3;
      const geo = doy ? geoDoy : geoTrav;
      const corpo = new THREE.Group();
      const frente = new THREE.Mesh(geo, filme(Gomo.desenharPacote(s, s.mascote ? fotos[s.mascote] : null, 'frente', largArte)));
      const verso = new THREE.Mesh(geo, filme(Gomo.desenharPacote(s, null, 'verso', 384)));
      verso.rotation.y = Math.PI;
      corpo.add(frente, verso);
      corpo.position.y = A / 2;
      return { corpo: corpo, altura: A, sombra: sombra(2.8, 1.1) };
    }

    function produtoCaixa(s) {
      const L = 2, A = 2.6, P = 0.85;
      const geo = new lib.RoundedBoxGeometry(L, A, P, 3, 0.05);
      const lateral = papelao(Gomo.desenharPacote(s, null, 'lateral', largArte));
      const liso = papelao(s.cor);
      const mats = [lateral, lateral, liso, liso, papelao(Gomo.desenharPacote(s, s.mascote ? fotos[s.mascote] : null, 'frente', largArte)), liso];
      const corpo = new THREE.Mesh(geo, mats);
      corpo.position.y = A / 2;
      const g = new THREE.Group();
      g.add(corpo);
      return { corpo: g, altura: A, sombra: sombra(2.9, 1.7) };
    }

    function produtoPote(s) {
      const g = new THREE.Group();
      const H = 1.7, rTopo = 1, rBase = 0.86;
      const raioEm = function (y) { return rBase + (rTopo - rBase) * ((y + H / 2) / H); };
      const plastico = new THREE.MeshPhysicalMaterial({
        color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0,
        clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide, depthWrite: false
      });
      const copo = new THREE.Mesh(new THREE.CylinderGeometry(rTopo, rBase, H, 64, 1, true), plastico);
      const fundoPote = new THREE.Mesh(new THREE.CircleGeometry(rBase, 48), plastico);
      fundoPote.rotation.x = -Math.PI / 2;
      fundoPote.position.y = -H / 2;
      // balas dentro do pote (malhas instanciadas, uma por formato)
      const tipos = ['bala', 'bala', 'bala'];
      const cores = s.bala.cores;
      const porTipo = movel ? 40 : 75;
      const rnd = Gomo.aleatorio(55);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), esc = new THREE.Vector3();
      const cor = new THREE.Color();
      // goma açucarada: fosca com "veludo" de açúcar
      const matBala = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.45 });
      tipos.forEach(function (tipo, t) {
        const inst = new THREE.InstancedMesh(fab.geometriaBala(tipo), matBala, porTipo);
        for (let i = 0; i < porTipo; i++) {
          const y = -H / 2 + 0.2 + rnd() * (H - 0.45);
          const r = (raioEm(y) - 0.24) * Math.sqrt(rnd());
          const a = rnd() * Math.PI * 2;
          pos.set(Math.cos(a) * r, y, Math.sin(a) * r);
          e.set(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3);
          q.setFromEuler(e);
          const k = 0.2 + rnd() * 0.05;
          esc.set(k, k, k);
          m4.compose(pos, q, esc);
          inst.setMatrixAt(i, m4);
          inst.setColorAt(i, cor.set(cores[(i + t * 2) % cores.length]));
        }
        g.add(inst);
      });
      // rótulo em volta do pote (a frente fica no meio da arte)
      const yRot = -0.05, hRot = 1.05;
      const rotulo = new THREE.Mesh(
        new THREE.CylinderGeometry(raioEm(yRot + hRot / 2) + 0.012, raioEm(yRot - hRot / 2) + 0.012, hRot, 72, 1, true, Math.PI, Math.PI * 2),
        papelao(Gomo.rotuloPote(s, s.mascote ? fotos[s.mascote] : null, movel ? 1536 : 2048))
      );
      rotulo.position.y = yRot;
      // tampa
      const corTampa = new THREE.MeshPhysicalMaterial({ color: s.cor, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
      const tampa = new THREE.Mesh(new THREE.CylinderGeometry(rTopo + 0.07, rTopo + 0.07, 0.28, 64), corTampa);
      tampa.position.y = H / 2 + 0.12;
      const aba = new THREE.Mesh(new THREE.TorusGeometry(rTopo + 0.07, 0.045, 12, 64), corTampa);
      aba.rotation.x = Math.PI / 2;
      aba.position.y = H / 2 - 0.01;
      g.add(rotulo, tampa, aba, copo, fundoPote);
      g.position.y = H / 2;
      const raiz = new THREE.Group();
      raiz.add(g);
      return { corpo: raiz, altura: H + 0.28, sombra: sombra(3, 2.4) };
    }

    const ids = op.ids || Gomo.SABORES.map(function (s) { return s.id; });
    const produtos = ids.map(function (id, i) {
      const s = Gomo.sabor(id);
      const p = s.formato === 'caixa' ? produtoCaixa(s) : s.formato === 'pote' ? produtoPote(s) : produtoFilme(s);
      const raiz = new THREE.Group();
      const giro = new THREE.Group();
      giro.add(p.corpo);
      raiz.add(giro, p.sombra);
      raiz.userData.id = s.id;
      giro.traverse(function (o) { o.userData.produto = i; });
      cena.add(raiz);
      return {
        s: s, raiz: raiz, giro: giro, sombra: p.sombra, altura: p.altura,
        base: new THREE.Vector3(), rotBase: 0, escalaBase: 1,
        foco: 0, focoS: 0, balanco: 0, rodopio: 0, entrada: calmo ? 0 : (op.estiloEntrada === 'surgir' ? 0 : 7), escalaEntrada: calmo || op.estiloEntrada !== 'surgir' ? 1 : 0, fase: i * 1.7
      };
    });

    // balinhas soltas na frente da vitrine
    const soltas = [];
    (op.soltas || [['bala', '#E8212E'], ['bala', '#FF8A1F'], ['bala', '#FFC400'], ['bala', '#58B82E'], ['bala', '#7A2BB5']]).forEach(function (b, i) {
      const obj = fab.bala(b[0], b[1], 900 + i);
      obj.scale.setScalar(0.34);
      cena.add(obj);
      // balinhas de goma ficam "de pé" (só um pouco tortas); as outras formas podem girar à vontade
      const giro = b[0] === 'bala' ? new THREE.Euler(((i % 3) - 1) * 0.25, i * 1.3, ((i % 2) - 0.5) * 0.3) : new THREE.Euler((i * 1.7) % 3, (i * 2.3) % 3, (i * 0.9) % 3);
      soltas.push({ obj: obj, base: new THREE.Vector3(), giro: giro, entrada: calmo ? 0 : 5 });
    });

    /* ---------- 5. Composição (larga no desktop, em colunas no celular) ---------- */
    const ARRANJOS = op.arranjos || {
      largo: {
        w: 7.8, h: 5.9, cy: 1.55,
        itens: { cola: [-1.3, 1.4, -1.7, 0.2, 1], framboesa: [1.3, 1.4, -1.7, -0.2, 1], doces: [-2.45, -0.75, 0.4, 0.3, 1], uva: [0.02, -0.85, 0.8, -0.04, 0.88], minifrutas: [2.45, -0.75, 0.3, -0.5, 1] },
        soltas: [[-1.1, -0.75, 1.5], [-0.45, -0.75, 1.9], [1.0, -0.75, 1.75], [1.55, -0.75, 1.35], [0.35, -0.75, 2.1]]
      },
      estreito: {
        w: 5, h: 9.6, cy: 1.3,
        itens: { cola: [-1.2, 2.9, -1, 0.15, 1], framboesa: [1.2, 2.9, -1.2, -0.15, 1], doces: [-1.2, -0.2, -0.3, 0.25, 1], uva: [1.2, -0.3, -0.2, -0.1, 0.88], minifrutas: [0, -3.2, 0.5, -0.35, 1] },
        soltas: [[-1.5, -3.2, 1.9], [-1.0, -3.2, 2.3], [1.2, -3.2, 2.1], [1.7, -3.2, 1.7], [0.9, -3.2, 2.6]]
      }
    };
    let W = 1, H = 1, arranjo = ARRANJOS.largo;
    const grupoEscala = { s: 1, y: 0 };
    function layout() {
      const r = op.palco.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      arranjo = W / H < 0.9 ? ARRANJOS.estreito : ARRANJOS.largo;
      const visH = 2 * OLHO.distanceTo(MIRA) * Math.tan((camera.fov * Math.PI) / 360);
      const visW = visH * camera.aspect;
      const s = Math.min((visW * 0.94) / arranjo.w, (visH * 0.9) / arranjo.h);
      grupoEscala.s = s;
      grupoEscala.y = MIRA.y - arranjo.cy * s;
      produtos.forEach(function (p) {
        const a = arranjo.itens[p.s.id];
        p.base.set(a[0] * s, a[1] * s + grupoEscala.y, a[2] * s);
        p.rotBase = a[3];
        p.escalaBase = a[4] * s;
      });
      soltas.forEach(function (b, i) {
        const a = arranjo.soltas[i];
        b.base.set(a[0] * s, a[1] * s + grupoEscala.y + 0.12 * s, a[2] * s);
        b.obj.scale.setScalar(0.34 * s);
      });
      if (calmo) desenhar(0);
    }

    /* ---------- 6. Interação ---------- */
    const ponteiro = new THREE.Vector2(9, 9);
    const raio = new THREE.Raycaster();
    let mudou = false, emFoco = -1, focoExterno = -1;
    function lerPonteiro(e) {
      const r = op.canvas.getBoundingClientRect();
      ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      mudou = true;
    }
    function produtoSob() {
      if (Math.abs(ponteiro.x) > 1 || Math.abs(ponteiro.y) > 1) return -1;
      raio.setFromCamera(ponteiro, camera);
      const hit = raio.intersectObjects(produtos.map(function (p) { return p.giro; }), true)[0];
      return hit ? hit.object.userData.produto : -1;
    }
    function sacudir(p) {
      gsap.to(p, {
        keyframes: [
          { balanco: 0.12, duration: 0.09 },
          { balanco: -0.09, duration: 0.1 },
          { balanco: 0.05, duration: 0.1 },
          { balanco: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }
        ]
      });
    }
    function rodar(p) {
      gsap.fromTo(p, { rodopio: 0 }, { rodopio: Math.PI * 2, duration: 1.1, ease: 'power3.inOut' });
    }
    if (!calmo) {
      if (temMouse) op.palco.addEventListener('pointermove', lerPonteiro, { passive: true });
      op.palco.addEventListener('pointerleave', function () { ponteiro.set(9, 9); mudou = true; });
      op.palco.addEventListener('pointerdown', function (e) {
        lerPonteiro(e);
        const i = produtoSob();
        if (i > -1) { sacudir(produtos[i]); rodar(produtos[i]); }
      });
    }

    // etiqueta com nome e sabor acima do produto em foco
    const topoMundo = new THREE.Vector3();
    function posicionarEtiqueta(i) {
      if (!op.etiqueta) return;
      if (i < 0) { op.etiqueta.classList.remove('visivel'); return; }
      const p = produtos[i];
      op.etiqueta.querySelector('strong').textContent = 'Gomas ' + (p.s.rotulo || p.s.nome);
      op.etiqueta.querySelector('span').textContent = [].concat(p.s.sabor).join(' ') + ' · ' + p.s.peso;
      op.etiqueta.classList.add('visivel');
      topoMundo.set(0, p.altura + 0.35, 0);
      p.raiz.localToWorld(topoMundo);
      topoMundo.project(camera);
      const x = (topoMundo.x * 0.5 + 0.5) * W;
      const y = (-topoMundo.y * 0.5 + 0.5) * H;
      op.etiqueta.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0) translate(-50%, -100%)';
    }

    /* ---------- 7. Entrada ---------- */
    function entrar() {
      if (calmo) return;
      if (op.estiloEntrada === 'surgir') {
        const ordemS = (op.ordem || ids).filter(function (id) { return ids.indexOf(id) > -1; });
        ordemS.forEach(function (id, k) {
          const p = produtos.find(function (x) { return x.s.id === id; });
          gsap.fromTo(p, { entrada: -0.35, escalaEntrada: 0.5 }, { entrada: 0, escalaEntrada: 1, duration: 1.1, ease: 'back.out(1.7)', delay: k * 0.12 });
        });
        soltas.forEach(function (b, k) {
          gsap.fromTo(b, { entrada: 1.2 }, { entrada: 0, duration: 0.9, ease: 'bounce.out', delay: 0.5 + k * 0.08 });
        });
        return;
      }
      const ordem = (op.ordem || ['framboesa', 'cola', 'uva', 'doces', 'minifrutas']).filter(function (id) { return ids.indexOf(id) > -1; });
      ordem.forEach(function (id, k) {
        const p = produtos.find(function (x) { return x.s.id === id; });
        gsap.fromTo(p, { entrada: 7 }, { entrada: 0, duration: 1.1, ease: 'bounce.out', delay: k * 0.12 });
      });
      soltas.forEach(function (b, k) {
        gsap.fromTo(b, { entrada: 5 }, { entrada: 0, duration: 1, ease: 'bounce.out', delay: 0.8 + k * 0.08 });
      });
    }

    /* ---------- 8. Quadro a quadro ---------- */
    let tempo = 0, visivel = false, camX = 0;
    function desenhar(dt) {
      tempo += dt;
      const k = 1 - Math.exp(-dt * 6);
      if (!calmo && mudou && temMouse) {
        mudou = false;
        emFoco = produtoSob();
      }
      const alvo = focoExterno > -1 ? focoExterno : emFoco;
      op.palco.classList.toggle('com-foco', alvo > -1);
      // câmera acompanha o mouse de leve (paralaxe)
      if (!calmo) {
        const px = temMouse && Math.abs(ponteiro.x) <= 1 ? ponteiro.x : 0;
        camX += (px * 0.8 - camX) * k * 0.5;
        camera.position.set(OLHO.x + camX, OLHO.y, OLHO.z);
        camera.lookAt(MIRA);
      }
      produtos.forEach(function (p, i) {
        p.foco = alvo === i ? 1 : 0;
        p.focoS += (p.foco - p.focoS) * (calmo ? 1 : k * 1.4);
        const respira = calmo ? 0 : Math.sin(tempo * 0.9 + p.fase) * 0.03;
        p.raiz.position.set(p.base.x, p.base.y + (p.entrada + p.focoS * 0.28) * grupoEscala.s, p.base.z);
        p.raiz.scale.setScalar(Math.max(0.0001, p.escalaBase * (1 + p.focoS * 0.05) * p.escalaEntrada));
        p.giro.rotation.set(0, p.rotBase + respira + p.rodopio + (alvo === i && temMouse ? ponteiro.x * 0.25 : 0), p.balanco);
        p.sombra.material.opacity = Math.max(0, 0.7 - p.focoS * 0.25 - p.entrada * 0.1);
        p.sombra.position.y = 0.005 - (p.entrada + p.focoS * 0.28);
        p.sombra.scale.setScalar(1 - p.focoS * 0.1);
      });
      soltas.forEach(function (b) {
        b.obj.position.set(b.base.x, b.base.y + b.entrada * grupoEscala.s, b.base.z);
        b.obj.rotation.set(b.giro.x + b.entrada, b.giro.y, b.giro.z);
      });
      renderer.render(cena, camera);
      posicionarEtiqueta(alvo);
    }
    let pronto = false; // só desenha depois de compilar (evita mostrar objetos escondidos)
    function quadro(_, deltaMs) {
      if (!visivel || !pronto) return;
      desenhar(Math.min(0.05, (deltaMs || 16) / 1000));
    }

    new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; }, { rootMargin: '120px' }).observe(op.palco);
    new ResizeObserver(layout).observe(op.palco);
    layout();
    if (!calmo) gsap.ticker.add(quadro);
    await Gomo.compilarTudo(renderer, cena, camera);
    pronto = true;
    if (calmo) desenhar(0);

    return {
      entrar: entrar,
      relayout: layout,
      fotos: fotos,
      // pulinho de comemoração (ex.: depois de enviar o formulário do topo)
      comemorar: function () {
        if (calmo) return;
        produtos.forEach(function (p, i) {
          gsap.delayedCall(i * 0.1, function () {
            sacudir(p);
            gsap.to(p, { keyframes: [{ entrada: 0.7, duration: 0.28, ease: 'power2.out' }, { entrada: 0, duration: 0.6, ease: 'bounce.out' }] });
          });
        });
      },
      // destaca um produto a partir da lista de sabores (id ou null)
      focar: function (id) {
        focoExterno = id ? produtos.findIndex(function (p) { return p.s.id === id; }) : -1;
        if (focoExterno > -1 && !calmo) sacudir(produtos[focoExterno]);
        if (calmo) desenhar(0);
      }
    };
  };
})();
