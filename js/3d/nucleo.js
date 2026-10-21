/* =========================================================
   Gomolândia (conceito) — núcleo 3D
   - carrega o Three.js sob demanda (endereços no import map do index.html)
   - cria o "palco": renderizador, cena, câmera e luzes
   - fabrica os 4 mascotes e as balas decorativas
   Tudo é gerado por código: nenhuma imagem, foto ou modelo externo.
   ========================================================= */
(function () {
  'use strict';

  const Gomo = (window.Gomo = window.Gomo || {});

  // Paleta (mesmos valores do :root em css/base.css)
  const COR = {
    cereja: '#D4113A', chiclete: '#FF5C8A', acucar: '#F7A1B5', limao: '#FFD21F',
    maca: '#7AC943', piscina: '#2FB8D6', noite: '#1F3C9E', creme: '#FFF6F1', tinta: '#2A1630'
  };
  Gomo.COR = COR;

  /* ---------- Suporte e carregamento ---------- */

  // O Three.js r170 exige WebGL 2
  Gomo.temWebGL2 = function () {
    try {
      const c = document.createElement('canvas');
      const gl = window.WebGL2RenderingContext && c.getContext('webgl2');
      if (!gl) return false;
      const perder = gl.getExtension('WEBGL_lose_context');
      if (perder) perder.loseContext();
      return true;
    } catch (e) {
      return false;
    }
  };

  let promessa = null;
  Gomo.carregar3D = function () {
    if (!promessa) {
      promessa = Promise.all([
        import('three'),
        import('three/addons/geometries/RoundedBoxGeometry.js'),
        import('three/addons/environments/RoomEnvironment.js'),
        import('three/addons/math/MeshSurfaceSampler.js'),
        import('three/addons/utils/BufferGeometryUtils.js')
      ]).then(function (m) {
        return {
          THREE: m[0],
          RoundedBoxGeometry: m[1].RoundedBoxGeometry,
          RoomEnvironment: m[2].RoomEnvironment,
          MeshSurfaceSampler: m[3].MeshSurfaceSampler,
          mergeVertices: m[4].mergeVertices
        };
      });
    }
    return promessa;
  };

  // Gerador pseudoaleatório com semente (mesma composição a cada visita)
  Gomo.aleatorio = function (semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- Palco ---------- */

  Gomo.criarPalco = function (lib, canvas, opcoes) {
    const THREE = lib.THREE;
    const op = Object.assign({ dprMax: 2, fov: 30, distancia: 14 }, opcoes);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, op.dprMax));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping "neutro": preserva as cores da marca melhor que o ACES
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;

    const cena = new THREE.Scene();

    // Reflexos de estúdio gerados por código (sem arquivo HDR)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const sala = new lib.RoomEnvironment();
    cena.environment = pmrem.fromScene(sala, 0.04).texture;
    cena.environmentIntensity = 0.8;
    if (sala.dispose) sala.dispose();
    pmrem.dispose();

    // Luz principal quente, contraluz fria e um céu suave
    const chave = new THREE.DirectionalLight('#fff3e6', 2.2);
    chave.position.set(-4, 6, 8);
    const recorte = new THREE.DirectionalLight('#c9f3ff', 1.6);
    recorte.position.set(5, 3, -6);
    const ceu = new THREE.HemisphereLight('#ffffff', '#ffc2d4', 0.6);
    cena.add(chave, recorte, ceu);

    const camera = new THREE.PerspectiveCamera(op.fov, 1, 0.1, 100);
    camera.position.set(0, 0, op.distancia);

    return { renderer: renderer, cena: cena, camera: camera };
  };

  // Converte um retângulo da tela (px, relativo ao canvas) para o mundo 3D num plano z
  Gomo.retanguloNoMundo = function (camera, larguraPx, alturaPx, ret, z) {
    const dist = camera.position.z - (z || 0);
    const altMundo = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    const k = altMundo / alturaPx;
    return {
      x: (ret.x + ret.w / 2 - larguraPx / 2) * k,
      y: -(ret.y + ret.h / 2 - alturaPx / 2) * k,
      w: ret.w * k,
      h: ret.h * k
    };
  };

  // Compila os shaders de TODOS os objetos (inclusive os que começam escondidos),
  // para não haver engasgo na primeira vez que aparecem
  Gomo.compilarTudo = async function (renderer, cena, camera) {
    const escondidos = [];
    cena.traverse(function (o) { if (!o.visible) { escondidos.push(o); o.visible = true; } });
    try {
      if (renderer.compileAsync) await renderer.compileAsync(cena, camera);
      else renderer.compile(cena, camera);
      // Aquecimento: um desenho de verdade, num pixel só e sem descartar o que está fora da câmera.
      // No Windows (ANGLE/D3D11) o shader só termina de compilar no primeiro desenho; assim esse
      // custo acontece aqui, e não quando a pessoa chega rolando na cena.
      const cortados = [];
      cena.traverse(function (o) { if (o.frustumCulled) { cortados.push(o); o.frustumCulled = false; } });
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, 1, 1);
      renderer.render(cena, camera);
      renderer.setScissorTest(false);
      renderer.clear();
      cortados.forEach(function (o) { o.frustumCulled = true; });
    } finally {
      escondidos.forEach(function (o) { o.visible = false; });
    }
  };

  /* ---------- Fábrica de mascotes e balas ---------- */

  Gomo.criarFabrica = function (lib, opcoes) {
    const THREE = lib.THREE;
    const q = (opcoes && opcoes.qualidade) || 1; // 1 = desktop, ~0.5 = celular
    const comContorno = !(opcoes && opcoes.contorno === false); // contorno azul de "desenho animado"
    const seg = function (n) { return Math.max(8, Math.round(n * Math.max(q, 0.55))); };
    const geos = {};
    const mats = {};
    const EIXO_Z = new THREE.Vector3(0, 0, 1);
    const limitar = THREE.MathUtils.clamp;

    /* Materiais */

    // Goma brilhante (gelatina) ou açucarada (fosca, com "veludo" de açúcar)
    function goma(cor, tipo) {
      const chave = cor + (tipo || 'brilho');
      if (mats[chave]) return mats[chave];
      const c = new THREE.Color(cor);
      const base = { color: c, metalness: 0, emissive: c.clone().multiplyScalar(0.07) };
      if (tipo === 'acucarada') {
        Object.assign(base, { roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.5 });
      } else {
        Object.assign(base, { roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05 });
      }
      return (mats[chave] = new THREE.MeshPhysicalMaterial(base));
    }

    // Contorno azul-noite (técnica do "casco invertido"), igual ao traço das ilustrações
    function contorno(esp) {
      const chave = 'contorno' + esp;
      if (mats[chave]) return mats[chave];
      return (mats[chave] = new THREE.ShaderMaterial({
        uniforms: { uCor: { value: new THREE.Color(COR.noite) }, uEsp: { value: esp } },
        vertexShader: [
          'uniform float uEsp;',
          'void main() {',
          '  vec3 p = position + normal * uEsp;',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 uCor;',
          'void main() {',
          '  gl_FragColor = vec4(uCor, 1.0);',
          '  #include <colorspace_fragment>',
          '}'
        ].join('\n'),
        side: THREE.BackSide
      }));
    }

    const M = {
      branco: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }),
      pupila: new THREE.MeshPhysicalMaterial({ color: COR.tinta, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }),
      brilho: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      borda: new THREE.MeshBasicMaterial({ color: COR.noite, toneMapped: false }),
      boca: new THREE.MeshPhysicalMaterial({ color: '#3b1233', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
      lingua: new THREE.MeshPhysicalMaterial({ color: '#ff6f96', roughness: 0.3, clearcoat: 0.8 }),
      bochecha: new THREE.MeshBasicMaterial({ color: '#ff6f96', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
      acucar: new THREE.MeshStandardMaterial({ color: '#fffaf6', roughness: 0.28, metalness: 0 }),
      faisca: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
    };
    const matCoracao = function () { return goma(COR.cereja); };

    /* Geometrias base */

    const esfera = new THREE.SphereGeometry(1, seg(32), seg(24));
    const esferaPequena = new THREE.SphereGeometry(1, 12, 8);

    // Normais contínuas (sem costuras) para o contorno não abrir nas quinas
    function suavizada(geo) {
      let g = geo.clone();
      Object.keys(g.attributes).forEach(function (n) { if (n !== 'position') g.deleteAttribute(n); });
      g = lib.mergeVertices(g, 1e-3);
      g.computeVertexNormals();
      return g;
    }

    // Encurva uma peça plana (boca) para acompanhar a superfície do corpo
    function curvar(geo, rx, ry) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        p.setZ(i, p.getZ(i) - (rx ? (x * x) / (2 * rx) : 0) - (ry ? (y * y) / (2 * ry) : 0));
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }

    // Encontra o ponto da superfície visto de frente (x, y) e a normal ali
    const raio = new THREE.Raycaster();
    const origem = new THREE.Vector3();
    const paraTras = new THREE.Vector3(0, 0, -1);
    function naFrente(sonda, x, y) {
      origem.set(x, y, 20);
      raio.set(origem, paraTras);
      const acerto = raio.intersectObject(sonda, false)[0];
      if (!acerto) return { p: new THREE.Vector3(x, y, 0), n: EIXO_Z.clone() };
      return { p: acerto.point.clone(), n: acerto.face.normal.clone().normalize() };
    }

    function fixar(obj, s, afundar) {
      obj.position.copy(s.p).addScaledVector(s.n, -(afundar || 0));
      obj.quaternion.setFromUnitVectors(EIXO_Z, s.n);
    }

    function perfilGota(escala) {
      const pts = [];
      const a1 = 0.62;
      for (let i = 0; i <= 30; i++) {
        const a = -Math.PI / 2 + (i / 30) * (Math.PI / 2 + a1);
        pts.push(new THREE.Vector2(Math.max(0, Math.cos(a)), 1 + Math.sin(a)));
      }
      pts[0].x = 0;
      const p0 = pts[pts.length - 1];
      const ctrl = new THREE.Vector2(p0.x - Math.sin(a1) * 0.62, p0.y + Math.cos(a1) * 0.62);
      const ponta = new THREE.QuadraticBezierCurve(p0.clone(), ctrl, new THREE.Vector2(0, 2.72));
      ponta.getPoints(20).slice(1).forEach(function (p) { pts.push(p); });
      return pts.map(function (p) { return p.multiplyScalar(escala || 1); });
    }

    // Estrela "fofa": uma esfera deformada em 5 pontas arredondadas
    function geoEstrelaFofa(re, ri, esp, segmentos) {
      const g = new THREE.SphereGeometry(1, segmentos, Math.round(segmentos / 2));
      g.rotateX(Math.PI / 2); // polos virados para frente e para trás
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const ang = Math.atan2(y, x);
        // Math.max evita NaN quando o arredondamento deixa a base levemente negativa
        const k = ri + (re - ri) * Math.pow(Math.max(0, 0.5 + 0.5 * Math.cos(5 * (ang - Math.PI / 2))), 1.7);
        const zz = Math.sign(z) * Math.pow(Math.abs(z), 0.62) * esp; // borda mais cheia
        p.setXYZ(i, x * k, y * k, zz);
      }
      g.deleteAttribute('normal');
      g.deleteAttribute('uv');
      const m = lib.mergeVertices(g, 1e-4);
      m.computeVertexNormals();
      return m;
    }

    function geoCoracao() {
      if (geos.coracao) return geos.coracao;
      const s = new THREE.Shape();
      s.moveTo(0, -0.9);
      s.bezierCurveTo(-0.2, -0.7, -1, -0.25, -1, 0.25);
      s.bezierCurveTo(-1, 0.78, -0.42, 1.02, 0, 0.58);
      s.bezierCurveTo(0.42, 1.02, 1, 0.78, 1, 0.25);
      s.bezierCurveTo(1, -0.25, 0.2, -0.7, 0, -0.9);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.16, bevelSegments: 5, curveSegments: 18 });
      g.translate(0, 0, -0.175);
      return (geos.coracao = g);
    }

    function geoFaisca() {
      if (geos.faisca) return geos.faisca;
      const s = new THREE.Shape();
      s.moveTo(0, 1);
      s.quadraticCurveTo(0.14, 0.14, 1, 0);
      s.quadraticCurveTo(0.14, -0.14, 0, -1);
      s.quadraticCurveTo(-0.14, -0.14, -1, 0);
      s.quadraticCurveTo(-0.14, 0.14, 0, 1);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 10 });
      g.translate(0, 0, -0.04);
      return (geos.faisca = g);
    }

    /* Peças do rosto */

    function olho(r, tipo) {
      const grupo = new THREE.Group();
      const pisca = new THREE.Group(); // escala Y = piscar
      const mira = new THREE.Group(); // move a pupila
      grupo.add(pisca);
      if (tipo === 'oval') {
        const pupila = new THREE.Mesh(esfera, M.pupila);
        pupila.scale.set(r, r * 1.45, r * 0.5);
        const b1 = new THREE.Mesh(esferaPequena, M.brilho);
        b1.scale.setScalar(r * 0.3);
        b1.position.set(r * 0.32, r * 0.55, r * 0.36);
        const b2 = new THREE.Mesh(esferaPequena, M.brilho);
        b2.scale.setScalar(r * 0.14);
        b2.position.set(-r * 0.25, -r * 0.45, r * 0.4);
        mira.add(pupila, b1, b2);
        pisca.add(mira);
      } else {
        const borda = new THREE.Mesh(esfera, M.borda);
        borda.scale.set(r * 1.17, r * 1.24, r * 0.5);
        borda.position.z = -r * 0.1;
        const branco = new THREE.Mesh(esfera, M.branco);
        branco.scale.set(r, r * 1.07, r * 0.55);
        const pupila = new THREE.Mesh(esfera, M.pupila);
        pupila.scale.set(r * 0.52, r * 0.56, r * 0.3);
        const b1 = new THREE.Mesh(esferaPequena, M.brilho);
        b1.scale.setScalar(r * 0.17);
        b1.position.set(r * 0.17, r * 0.2, r * 0.25);
        const b2 = new THREE.Mesh(esferaPequena, M.brilho);
        b2.scale.setScalar(r * 0.08);
        b2.position.set(-r * 0.14, -r * 0.17, r * 0.27);
        mira.add(pupila, b1, b2);
        pisca.add(borda, branco, mira);
      }
      const o = { grupo: grupo, pisca: pisca, mira: mira, r: r };
      // lx, ly entre -1 e 1: para onde a pupila aponta
      o.olhar = function (lx, ly) {
        if (tipo === 'oval') {
          mira.position.set(lx * r * 0.18, ly * r * 0.14, 0);
        } else {
          const dx = lx * r * 0.4, dy = ly * r * 0.36;
          const zz = r * 0.55 * Math.sqrt(Math.max(0, 1 - (dx * dx) / (r * r) - (dy * dy) / (1.1449 * r * r)));
          mira.position.set(dx, dy, zz - r * 0.17);
        }
      };
      o.olhar(0, 0);
      return o;
    }

    function bocaAberta(l, a, curv) {
      const s = new THREE.Shape();
      s.moveTo(-l / 2, 0);
      s.bezierCurveTo(-l * 0.2, a * 0.1, l * 0.2, a * 0.1, l / 2, 0);
      s.bezierCurveTo(l * 0.48, -a * 0.75, l * 0.22, -a, 0, -a);
      s.bezierCurveTo(-l * 0.22, -a, -l * 0.48, -a * 0.75, -l / 2, 0);
      const prof = Math.max(0.05, a * 0.3);
      const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: true, bevelThickness: prof * 0.45, bevelSize: Math.min(l, a) * 0.07, bevelSegments: 3, curveSegments: 14 });
      g.translate(0, a * 0.45, -prof * 0.5);
      const ls = new THREE.Shape();
      ls.absellipse(0, 0, l * 0.21, a * 0.17, 0, Math.PI * 2, false, 0);
      const lg = new THREE.ExtrudeGeometry(ls, { depth: prof * 0.3, bevelEnabled: true, bevelThickness: prof * 0.35, bevelSize: a * 0.04, bevelSegments: 3, curveSegments: 16 });
      lg.translate(0, -a * 0.27, prof * 0.55);
      if (curv) { curvar(g, curv[0], curv[1]); curvar(lg, curv[0], curv[1]); }
      const grupo = new THREE.Group();
      grupo.add(new THREE.Mesh(g, M.boca), new THREE.Mesh(lg, M.lingua));
      return grupo;
    }

    // Traço em tubo (boca ondulada, olho espremido, sobrancelha)
    function traco(pontos, esp, material) {
      const curva = new THREE.CatmullRomCurve3(pontos);
      const grupo = new THREE.Group();
      grupo.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, esp, 10, false), material || M.boca));
      [pontos[0], pontos[pontos.length - 1]].forEach(function (p) {
        const tampa = new THREE.Mesh(esferaPequena, material || M.boca);
        tampa.scale.setScalar(esp);
        tampa.position.copy(p);
        grupo.add(tampa);
      });
      return grupo;
    }

    // Cristais de açúcar espalhados na superfície (uma única malha instanciada)
    function acucar(sonda, qtd, tam, evitar, semente) {
      const n = Math.round(qtd * q);
      if (n < 1) return null;
      const rnd = Gomo.aleatorio(semente || 7);
      const amostra = new lib.MeshSurfaceSampler(sonda);
      if (amostra.setRandomGenerator) amostra.setRandomGenerator(rnd);
      amostra.build();
      const geo = geos.cristal || (geos.cristal = new THREE.BoxGeometry(1, 1, 1));
      const inst = new THREE.InstancedMesh(geo, M.acucar, n);
      const p = new THREE.Vector3(), nn = new THREE.Vector3(), mat = new THREE.Matrix4();
      const quat = new THREE.Quaternion(), esc = new THREE.Vector3(), eul = new THREE.Euler();
      let i = 0, tentativas = 0;
      while (i < n && tentativas < n * 12) {
        tentativas++;
        amostra.sample(p, nn);
        if (evitar && evitar(p, nn)) continue;
        const k = tam * (0.6 + rnd() * 0.9);
        p.addScaledVector(nn, k * 0.15);
        eul.set(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3);
        quat.setFromEuler(eul);
        esc.set(k, k * (0.7 + rnd() * 0.6), k);
        mat.compose(p, quat, esc);
        inst.setMatrixAt(i++, mat);
      }
      inst.count = i;
      inst.instanceMatrix.needsUpdate = true;
      return inst;
    }

    /* Esqueleto comum dos mascotes
       raiz (posição) > base (achata/estica a partir do chão) > meio (centro do corpo)
       > giro (piruetas) > olhar (cabeça segue o mouse) > conteudo (corpo + rosto) */
    function montar(corpoGeo, material, cfg) {
      corpoGeo.computeBoundingBox();
      const bb = corpoGeo.boundingBox;
      const cy = (bb.min.y + bb.max.y) / 2;
      const altura = bb.max.y - bb.min.y;
      const raiz = new THREE.Group();
      const base = new THREE.Group();
      const meio = new THREE.Group();
      const giro = new THREE.Group();
      const olhar = new THREE.Group();
      const conteudo = new THREE.Group();
      raiz.add(base);
      base.add(meio);
      meio.add(giro);
      giro.add(olhar);
      olhar.add(conteudo);
      meio.position.y = altura / 2;
      conteudo.position.y = -cy;

      const corpo = new THREE.Mesh(corpoGeo, material);
      conteudo.add(corpo);
      if (comContorno) conteudo.add(new THREE.Mesh(suavizada(corpoGeo), contorno(cfg.contorno || 0.045)));

      const m = {
        nome: cfg.nome,
        raiz: raiz, base: base, meio: meio, giro: giro, olhar: olhar, conteudo: conteudo,
        corpo: corpo, altura: altura, largura: bb.max.x - bb.min.x,
        olhos: [], coracoes: [], bochechas: [], particulas: null, tipoParticula: null,
        pos: new THREE.Vector3(),
        bochechaBase: cfg.bochecha || 0,
        anim: { entrada: 0, salto: 0, estica: 1, giroY: 0, giroZ: 0, escala: 1, piscar: 1, tremor: 0, coracao: 0, sono: 0, azedo: 0, bochecha: cfg.bochecha || 0, brilhos: 0, festa: 0 },
        idle: Object.assign({ fase: 0, vel: 1.6, amp: 0.06, gelatina: 0.025 }, cfg.idle),
        giroPulo: cfg.giroPulo || 'y',
        olharAtual: new THREE.Vector2(),
        proxPiscada: 1 + Math.random() * 3,
        proxTremor: 4 + Math.random() * 3,
        estadoNome: 'normal'
      };
      corpo.userData.mascote = m;
      comportamento(m);
      return m;
    }

    function addOlhos(m, sonda, pontos, r, tipo, afundar) {
      pontos.forEach(function (xy) {
        const s = naFrente(sonda, xy[0], xy[1]);
        const o = olho(r, tipo);
        fixar(o.grupo, s, (afundar != null ? afundar : 0.2) * r);
        m.conteudo.add(o.grupo);
        m.olhos.push(o);
        // Coração escondido no lugar do olho (expressão "apaixonada")
        const c = new THREE.Mesh(geoCoracao(), matCoracao());
        c.position.z = r * 0.3;
        c.userData.r = r * 1.2;
        c.visible = false;
        o.grupo.add(c);
        m.coracoes.push(c);
      });
    }

    function addBochechas(m, sonda, pontos, rx, ry) {
      pontos.forEach(function (xy) {
        const s = naFrente(sonda, xy[0], xy[1]);
        const b = new THREE.Mesh(esferaPequena, M.bochecha);
        fixar(b, s, -0.012);
        b.scale.set(rx, ry, rx * 0.22);
        b.userData.base = b.scale.clone();
        b.renderOrder = 2;
        m.conteudo.add(b);
        m.bochechas.push(b);
      });
    }

    function addNaSuperficie(m, sonda, xy, obj, afundar) {
      fixar(obj, naFrente(sonda, xy[0], xy[1]), afundar || 0);
      m.conteudo.add(obj);
      return obj;
    }

    function addParticulas(m, tipo, qtd, semente) {
      const g = new THREE.Group();
      const geo = tipo === 'coracao' ? geoCoracao() : geoFaisca();
      const mat = tipo === 'coracao' ? matCoracao() : M.faisca;
      const rnd = Gomo.aleatorio(semente || 11);
      for (let i = 0; i < qtd; i++) {
        const p = new THREE.Mesh(geo, mat);
        p.userData = {
          ang: (i / qtd) * Math.PI * 2 + rnd() * 0.6,
          raio: 1.05 + rnd() * 0.55,
          alt: (rnd() - 0.4) * 1.8,
          vel: 0.5 + rnd() * 0.7,
          fase: rnd() * 6.28,
          tam: (tipo === 'coracao' ? 0.13 : 0.11) + rnd() * 0.08,
          z: rnd() - 0.5
        };
        g.add(p);
      }
      g.position.y = m.altura / 2;
      g.visible = false;
      m.raiz.add(g);
      m.particulas = g;
      m.tipoParticula = tipo;
    }

    /* Comportamento: piscar, pular, reagir, expressões e atualização por quadro */
    function comportamento(m) {
      const a = m.anim;
      const centro = new THREE.Vector3();

      m.piscar = function (duplo) {
        if (m.piscando) return;
        m.piscando = true;
        const tl = gsap.timeline({ onComplete: function () { m.piscando = false; } });
        tl.to(a, { piscar: 0.06, duration: 0.07, ease: 'power2.in' })
          .to(a, { piscar: 1, duration: 0.13, ease: 'power2.out' });
        if (duplo) {
          tl.to(a, { piscar: 0.06, duration: 0.07, ease: 'power2.in' }, '+=0.08')
            .to(a, { piscar: 1, duration: 0.13, ease: 'power2.out' });
        }
      };

      // Pulo com antecipação, pirueta e aterrissagem gelatinosa (achata e estica)
      m.pular = function (forca) {
        if (m.pulando) return null;
        m.pulando = true;
        const f = forca || 1;
        const giro = {};
        if (m.giroPulo === 'z') giro.giroZ = '-=' + Math.PI * 2;
        else giro.giroY = '+=' + Math.PI * 2;
        const tl = gsap.timeline({
          onComplete: function () {
            m.pulando = false;
            a.giroY %= Math.PI * 2;
            a.giroZ %= Math.PI * 2;
          }
        });
        tl.to(a, { estica: 0.72, duration: 0.12, ease: 'power2.out' })
          .to(a, { estica: 1.16, salto: 1.5 * f, duration: 0.36, ease: 'power2.out' }, 0.12)
          .to(a, Object.assign({ duration: 0.72, ease: 'power2.inOut' }, giro), 0.12)
          .to(a, { estica: 1, duration: 0.2, ease: 'sine.out' }, 0.3)
          .to(a, { salto: 0, duration: 0.34, ease: 'power2.in' }, 0.48)
          .to(a, { estica: 0.68, duration: 0.08, ease: 'power1.out' }, 0.82)
          .to(a, { estica: 1, duration: 0.75, ease: 'elastic.out(1, 0.32)' }, 0.9);
        m.piscar();
        return tl;
      };

      m.destacar = function (sim) {
        gsap.to(a, { escala: sim ? 1.08 : 1, duration: sim ? 0.45 : 0.5, ease: sim ? 'back.out(3)' : 'power3.out', overwrite: 'auto' });
      };

      m.expressao = function (nome) {
        const alvo = { coracao: 0, sono: 0, azedo: 0, brilhos: 0, festa: 0, bochecha: m.bochechaBase };
        if (nome === 'coracao') { alvo.coracao = 1; alvo.bochecha = 1; alvo.brilhos = 1; }
        if (nome === 'sono') { alvo.sono = 1; alvo.bochecha = 1; }
        if (nome === 'brilho') { alvo.brilhos = 1; alvo.bochecha = 0.9; }
        if (nome === 'festa') { alvo.festa = 1; alvo.brilhos = 1; alvo.bochecha = 0.9; }
        if (nome === 'azedo') { alvo.azedo = 1; alvo.bochecha = 0.9; } // careta: um olho bem espremido, o outro meio fechado
        m.estadoNome = nome;
        gsap.to(a, Object.assign({ duration: 0.6, ease: 'back.out(2)' }, alvo));
      };

      m.tremer = function () {
        gsap.fromTo(a, { tremor: 1 }, { tremor: 0, duration: 0.6, ease: 'power2.out' });
      };

      // alvo: ponto do mundo para onde o mascote olha (ou null para olhar em frente)
      m.atualizar = function (t, dt, alvo, calmo) {
        const id = m.idle;
        const vivo = calmo ? 0 : 1;
        const ciclo = t * id.vel + id.fase;
        const gel = id.gelatina * (m.estadoNome === 'sono' ? 2.6 : 1);
        const flutua = Math.sin(ciclo) * id.amp * vivo;
        const respira = Math.sin(ciclo * 2) * gel * vivo;

        m.raiz.position.set(m.pos.x, m.pos.y + a.entrada + a.salto + flutua, m.pos.z);
        const sy = a.estica * (1 + respira);
        const sxz = 1 / Math.sqrt(Math.max(0.2, sy));
        const e = Math.max(0.0001, a.escala);
        m.base.scale.set(sxz * e, sy * e, sxz * e);

        const tremor = a.tremor ? Math.sin(t * 70) * 0.09 * a.tremor : 0;
        const danca = a.festa ? Math.sin(t * 9 + id.fase) * 0.12 * a.festa : 0;
        m.giro.rotation.set(0, a.giroY, a.giroZ + tremor + danca);

        // Cabeça e olhos acompanham o alvo
        let ry = 0, rx = 0;
        if (alvo) {
          m.meio.getWorldPosition(centro);
          const dx = alvo.x - centro.x, dy = alvo.y - centro.y, dz = Math.max(0.6, alvo.z - centro.z);
          ry = Math.atan2(dx, dz);
          rx = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
        }
        const k = 1 - Math.exp(-dt * 7);
        m.olhar.rotation.y += (limitar(ry * 0.75, -0.55, 0.55) - m.olhar.rotation.y) * k;
        m.olhar.rotation.x += (limitar(rx * 0.7, -0.38, 0.38) - m.olhar.rotation.x) * k;
        m.olharAtual.x += (limitar(ry / 0.7, -1, 1) - m.olharAtual.x) * k;
        m.olharAtual.y += (limitar(-rx / 0.5, -1, 1) - m.olharAtual.y) * k;

        const abertura = a.piscar * (1 - 0.55 * a.sono);
        const vis = Math.max(0.0001, 1 - a.coracao);
        for (let i = 0; i < m.olhos.length; i++) {
          const o = m.olhos[i];
          const careta = 1 - a.azedo * (i === 0 ? 0.7 : 0.38);
          o.pisca.scale.set(vis, Math.max(0.04, abertura * careta) * vis, vis);
          o.olhar(m.olharAtual.x, m.olharAtual.y);
          const c = m.coracoes[i];
          if (a.coracao > 0.01) {
            c.visible = true;
            c.scale.setScalar(c.userData.r * a.coracao * (1 + Math.sin(t * 8) * 0.09 * vivo));
          } else {
            c.visible = false;
          }
        }

        for (let i = 0; i < m.bochechas.length; i++) {
          const b = m.bochechas[i];
          const s = 0.2 + 0.8 * a.bochecha;
          b.visible = a.bochecha > 0.02;
          b.scale.set(b.userData.base.x * s, b.userData.base.y * s, b.userData.base.z);
        }

        if (m.particulas) {
          const nivel = a.brilhos;
          m.particulas.visible = nivel > 0.01;
          if (m.particulas.visible) {
            const filhos = m.particulas.children;
            for (let i = 0; i < filhos.length; i++) {
              const p = filhos[i], u = p.userData;
              if (m.tipoParticula === 'coracao') {
                const fase = (t * u.vel * 0.45 + u.fase) % 1;
                p.position.set(Math.cos(u.ang) * u.raio * 1.1, -0.5 + fase * 2.4, Math.sin(u.ang) * 0.5 + 0.4);
                p.scale.setScalar(Math.max(0.0001, u.tam * nivel * Math.sin(fase * Math.PI)));
                p.rotation.set(0, Math.sin(t * 2 + u.fase) * 0.5, Math.sin(t * 1.5 + u.fase) * 0.3);
              } else {
                const ang = u.ang + t * u.vel * 0.35;
                p.position.set(Math.cos(ang) * u.raio * 1.15, u.alt * 0.75 + Math.sin(t * u.vel + u.fase) * 0.15, Math.sin(ang) * 0.6 + u.z * 0.4 + 0.3);
                const piscada = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.6 * u.vel + u.fase));
                p.scale.setScalar(Math.max(0.0001, u.tam * nivel * piscada));
                p.rotation.set(0, 0, t * 0.8 + u.fase);
              }
            }
          }
        }

        if (!calmo) {
          if (t > m.proxPiscada) {
            m.proxPiscada = t + 1.8 + Math.random() * 3.2;
            m.piscar(Math.random() < 0.22);
          }
          // O Cubo Azedo dá um arrepio de vez em quando (mais vezes quando está "azedo").
          // tremorAuto = false: quem chama decide a hora do arrepio (Sensações)
          if ((m.nome === 'cubo' || m.estadoNome === 'azedo') && m.tremorAuto !== false && t > m.proxTremor) {
            m.proxTremor = t + (m.estadoNome === 'azedo' ? 1.3 : 4.5 + Math.random() * 3);
            m.tremer();
          }
        }
      };
    }

    /* ---------- Os 4 mascotes ---------- */

    // Gotinha: gota de gelatina ciano, curiosa e de olhos grandes
    function gotinha() {
      const geo = new THREE.LatheGeometry(perfilGota(1), seg(72));
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma(COR.piscina), {
        nome: 'gotinha', contorno: 0.045, bochecha: 0.35,
        idle: { fase: 0, vel: 1.7, amp: 0.07, gelatina: 0.04 }
      });
      addOlhos(m, sonda, [[-0.34, 1.1], [0.34, 1.1]], 0.25, 'branco');
      addNaSuperficie(m, sonda, [0, 0.62], bocaAberta(0.38, 0.26, [1, 1]), 0.02);
      addBochechas(m, sonda, [[-0.62, 0.78], [0.62, 0.78]], 0.14, 0.085);
      return m;
    }

    // Anelzinho: anel de goma rosa coberto de açúcar, risonho
    function anelzinho() {
      const geo = new THREE.TorusGeometry(0.84, 0.44, seg(40), seg(120));
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma(COR.chiclete, 'acucarada'), {
        nome: 'anelzinho', contorno: 0.04, bochecha: 0.5, giroPulo: 'z',
        idle: { fase: 1.3, vel: 1.4, amp: 0.06, gelatina: 0.02 }
      });
      const olhos = [[-0.36, 0.8], [0.36, 0.8]];
      const boca = [0, -0.86];
      addOlhos(m, sonda, olhos, 0.17, 'branco');
      addNaSuperficie(m, sonda, boca, bocaAberta(0.42, 0.27, [1.28, 0.44]), 0.02);
      addBochechas(m, sonda, [[-0.86, 0.12], [0.86, 0.12]], 0.11, 0.07);
      const zonas = [[olhos[0][0], olhos[0][1], 0.3], [olhos[1][0], olhos[1][1], 0.3], [boca[0], boca[1] - 0.02, 0.36], [-0.86, 0.12, 0.17], [0.86, 0.12, 0.17]];
      const cristais = acucar(sonda, 1000, 0.032, function (p, n) {
        if (n.z < 0.3) return false;
        for (let i = 0; i < zonas.length; i++) {
          const dx = p.x - zonas[i][0], dy = p.y - zonas[i][1];
          if (dx * dx + dy * dy < zonas[i][2] * zonas[i][2]) return true;
        }
        return false;
      }, 21);
      if (cristais) m.conteudo.add(cristais);
      addParticulas(m, 'coracao', 6, 31);
      return m;
    }

    // Cubo Azedo: cubo verde açucarado, com careta de azedinho
    function cuboAzedo() {
      const L = 1.86;
      const geo = new lib.RoundedBoxGeometry(L, L, L, q < 0.8 ? 4 : 6, 0.44);
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma(COR.maca, 'acucarada'), {
        nome: 'cubo', contorno: 0.045, bochecha: 0,
        idle: { fase: 2.1, vel: 1.5, amp: 0.05, gelatina: 0.03 }
      });
      const z = L / 2;
      addOlhos(m, sonda, [[-0.42, 0.2]], 0.24, 'branco');
      const V = function (x, y) { return new THREE.Vector3(x, y, z + 0.01); };
      m.conteudo.add(traco([V(0.62, 0.42), V(0.3, 0.2), V(0.62, -0.02)], 0.055)); // olho espremido
      m.conteudo.add(traco([V(-0.66, 0.6), V(-0.44, 0.7), V(-0.2, 0.64)], 0.045)); // sobrancelha
      m.conteudo.add(traco([V(-0.42, -0.36), V(-0.28, -0.46), V(-0.14, -0.36), V(0, -0.46), V(0.14, -0.36), V(0.28, -0.46), V(0.42, -0.36)], 0.05)); // boca ondulada
      const cristais = acucar(sonda, 900, 0.034, function (p, n) {
        return n.z > 0.5 && Math.abs(p.x) < 0.8 && p.y > -0.64 && p.y < 0.84;
      }, 33);
      if (cristais) m.conteudo.add(cristais);
      return m;
    }

    // Estrelete: estrela de goma amarela, animada e brilhante
    function estrelete() {
      const geo = geoEstrelaFofa(1.32, 0.66, 0.5, seg(150));
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma(COR.limao), {
        nome: 'estrelete', contorno: 0.045, bochecha: 0.55,
        idle: { fase: 3.4, vel: 2, amp: 0.09, gelatina: 0.03 }
      });
      addOlhos(m, sonda, [[-0.25, 0.16], [0.25, 0.16]], 0.13, 'oval', 0.15);
      addNaSuperficie(m, sonda, [0, -0.2], bocaAberta(0.5, 0.32, [1.6, 1.6]), 0.03);
      addBochechas(m, sonda, [[-0.5, -0.06], [0.5, -0.06]], 0.12, 0.075);
      addParticulas(m, 'faisca', 8, 41);
      return m;
    }

    /* ---------- Personagens da linha de produtos (impressos nas embalagens) ---------- */

    // traço curvo: olho fechado de piscadela e sobrancelhas
    function arco(largura, altura, esp) {
      return traco([new THREE.Vector3(-largura / 2, 0, 0), new THREE.Vector3(0, altura, 0), new THREE.Vector3(largura / 2, 0, 0)], esp);
    }
    // folha simples (base na origem, apontando para +Y)
    function folha(compr, larg, cor) {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(larg, compr * 0.45, 0, compr);
      s.quadraticCurveTo(-larg, compr * 0.45, 0, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 14 });
      g.translate(0, 0, -0.015);
      return new THREE.Mesh(g, goma(cor));
    }
    function lathe(perfil, segmentos) {
      const pts = new THREE.SplineCurve(perfil.map(function (p) { return new THREE.Vector2(p[0], p[1]); })).getPoints(80);
      pts[0].x = 0;
      pts[pts.length - 1].x = 0;
      pts.forEach(function (p) { p.x = Math.max(0, p.x); });
      return new THREE.LatheGeometry(pts, segmentos || seg(64));
    }
    function rostoBasico(m, sonda, o) {
      // o: { olhos: [[x,y],[x,y]], r, piscar: true (olho direito fechado), boca: [x,y], larguraBoca, alturaBoca, curv, bochechas: [[x,y],[x,y]] }
      addOlhos(m, sonda, o.piscar ? [o.olhos[0]] : o.olhos, o.r, 'branco');
      if (o.piscar) addNaSuperficie(m, sonda, o.olhos[1], arco(o.r * 2.1, o.r * 0.75, o.r * 0.16), -o.r * 0.1);
      if (o.sobrancelhas !== false) {
        o.olhos.forEach(function (xy, i) {
          const s = arco(o.r * 1.6, o.r * 0.35, o.r * 0.13);
          s.rotation.z = (i ? -1 : 1) * 0.12;
          addNaSuperficie(m, sonda, [xy[0], xy[1] + o.r * 1.75], s, -0.01);
        });
      }
      addNaSuperficie(m, sonda, o.boca, bocaAberta(o.larguraBoca, o.alturaBoca, o.curv), 0.02);
      if (o.bochechas) addBochechas(m, sonda, o.bochechas, o.r * 0.6, o.r * 0.36);
    }

    // Garrafinha de cola de óculos escuros fazendo "joinha"
    function garrafa() {
      const geo = lathe([[0, 0], [0.42, 0], [0.5, 0.05], [0.53, 0.25], [0.49, 0.55], [0.44, 0.85], [0.48, 1.15], [0.54, 1.45], [0.52, 1.72], [0.42, 1.97], [0.27, 2.2], [0.2, 2.38], [0.21, 2.5], [0.16, 2.56], [0, 2.57]]);
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma('#5a2810'), { nome: 'garrafa', bochecha: 0.25, idle: { fase: 0.6, vel: 1.6, amp: 0.06, gelatina: 0.02 } });
      rostoBasico(m, sonda, { olhos: [[-0.21, 1.3], [0.21, 1.3]], r: 0.17, boca: [0, 0.94], larguraBoca: 0.52, alturaBoca: 0.34, curv: [0.5, 2] });
      // óculos escuros no "alto da cabeça"
      const preto = new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });
      const oculos = new THREE.Group();
      [-1, 1].forEach(function (lado) {
        const lente = new THREE.Mesh(esfera, preto);
        lente.scale.set(0.19, 0.12, 0.06);
        lente.position.set(lado * 0.19, 0, 0);
        oculos.add(lente);
      });
      const ponte = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), preto);
      ponte.rotation.z = Math.PI / 2;
      ponte.position.y = 0.05;
      oculos.add(ponte);
      addNaSuperficie(m, sonda, [0, 1.8], oculos, -0.035);
      // braço com luva amarela fazendo "joinha"
      const luva = goma('#FFD21F');
      const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 6, 12), goma('#8a4a1c'));
      // do "ombro" (lateral da garrafa) até a mão, apontando para cima e para fora
      braco.position.set(-0.645, 1.175, 0.18);
      braco.rotation.z = 0.95;
      // punho de luva (anel) onde o braço entra na mão
      const dirBraco = new THREE.Vector3(-Math.sin(0.95), Math.cos(0.95), 0);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.032, 8, 20), luva);
      anel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirBraco);
      anel.position.set(-0.645, 1.175, 0.18).addScaledVector(dirBraco, 0.12);
      // mão fechada: palma, quatro dedos dobrados empilhados na frente e o polegar para cima
      const mao = new THREE.Group();
      mao.position.set(-0.87, 1.33, 0.22);
      mao.rotation.z = 0.12;
      mao.add(new THREE.Mesh(new lib.RoundedBoxGeometry(0.2, 0.25, 0.2, 3, 0.075), luva));
      for (let i = 0; i < 4; i++) {
        const dedo = new THREE.Mesh(new THREE.CapsuleGeometry(0.037, 0.13 - i * 0.014, 4, 10), luva);
        dedo.rotation.z = Math.PI / 2;
        dedo.position.set(-0.012 + i * 0.004, 0.088 - i * 0.062, 0.09);
        mao.add(dedo);
      }
      const dedao = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 6, 10), luva);
      dedao.position.set(0.03, 0.2, 0.01);
      dedao.rotation.z = -0.12;
      mao.add(dedao);
      m.conteudo.add(braco, anel, mao);
      addParticulas(m, 'faisca', 8, 51);
      return m;
    }

    // Framboesa piscando, com folhinhas no topo
    function framboesa(op) {
      const geo = new THREE.SphereGeometry(1, seg(48), seg(32));
      geo.scale(0.82, 1, 0.78);
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma('#D4176F'), { nome: 'framboesa', bochecha: 0.6, idle: { fase: 1.9, vel: 1.5, amp: 0.06, gelatina: 0.03 } });
      // "bolinhas" da framboesa, deixando a área do rosto lisa
      const n = Math.round(150 * Math.max(q, 0.6));
      const inst = new THREE.InstancedMesh(esfera, goma('#E02A84'), n);
      const mat4 = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), esc = new THREE.Vector3();
      let k = 0;
      for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n;
        const r = Math.sqrt(1 - y * y);
        const fi = i * 2.399963;
        const x = Math.cos(fi) * r, z = Math.sin(fi) * r;
        if (z > 0.5 && Math.abs(x) < 0.62 && y > -0.68 && y < 0.5) continue; // rosto
        if (y > 0.9) continue; // folhas
        pos.set(x * 0.8, y * 0.97, z * 0.76);
        const t = 0.17 + ((i * 37) % 10) * 0.004;
        esc.set(t, t, t);
        mat4.compose(pos, quat, esc);
        inst.setMatrixAt(k++, mat4);
      }
      inst.count = k;
      m.conteudo.add(inst);
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        g.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
        g.position.y = 0.9;
        const f = folha(0.5, 0.2, i % 2 ? '#3FAE49' : '#4FBF57');
        f.rotation.x = 1.1;
        g.add(f);
        m.conteudo.add(g);
      }
      // sem sobrancelhas: ficariam escondidas atrás das bolinhas, só com as pontas aparecendo
      rostoBasico(m, sonda, { olhos: [[-0.27, 0.12], [0.27, 0.12]], r: 0.21, sobrancelhas: false, piscar: !(op && op.piscar === false), boca: [0, -0.32], larguraBoca: 0.52, alturaBoca: 0.36, curv: [0.82, 1], bochechas: [[-0.5, -0.12], [0.5, -0.12]] });
      addParticulas(m, 'coracao', 6, 61);
      return m;
    }

    // Manga sorridente (mascote do pote "Doces")
    function manga(op) {
      const geo = lathe([[0, 0], [0.55, 0.06], [0.82, 0.4], [0.88, 0.85], [0.78, 1.3], [0.56, 1.66], [0.32, 1.88], [0.12, 1.98], [0, 2]]);
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma('#FFC21A'), { nome: 'manga', bochecha: 0.7, idle: { fase: 2.6, vel: 1.7, amp: 0.07, gelatina: 0.035 } });
      rostoBasico(m, sonda, { olhos: [[-0.25, 1.02], [0.25, 1.02]], r: 0.19, piscar: !(op && op.piscar === false), boca: [0, 0.62], larguraBoca: 0.5, alturaBoca: 0.34, curv: [0.88, 2], bochechas: [[-0.52, 0.78], [0.52, 0.78]] });
      const f = folha(0.55, 0.22, '#3FAE49');
      f.position.set(0.04, 1.96, 0);
      f.rotation.z = -0.9;
      const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 8), goma('#6b4a1f'));
      cabo.position.set(0, 2.02, 0);
      m.conteudo.add(f, cabo);
      return m;
    }

    // Cacho de uva com folha
    function uva() {
      const geo = new THREE.SphereGeometry(1, seg(40), seg(28));
      geo.scale(0.78, 0.96, 0.62);
      const sonda = new THREE.Mesh(geo);
      const m = montar(geo, goma('#7336C0'), { nome: 'uva', bochecha: 0.6, idle: { fase: 4.1, vel: 1.4, amp: 0.06, gelatina: 0.025 } });
      const cores = ['#6A2CB6', '#8048CF', '#5E25A6'];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        const bago = new THREE.Mesh(esfera, goma(cores[i % 3]));
        const r = 0.33 + (i % 3) * 0.02;
        bago.scale.setScalar(r);
        bago.position.set(Math.cos(a) * 0.8, Math.sin(a) * 0.98 - (Math.sin(a) < -0.5 ? 0.1 : 0), -0.12 + (i % 2) * 0.08);
        m.conteudo.add(bago);
      }
      const ponta = new THREE.Mesh(esfera, goma(cores[0]));
      ponta.scale.setScalar(0.3);
      ponta.position.set(0, -1.18, 0);
      m.conteudo.add(ponta);
      const f = folha(0.85, 0.42, '#45A84A');
      f.position.set(0.15, 1.05, -0.05);
      f.rotation.set(0.2, 0.3, -0.85);
      const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.32, 8), goma('#6b4a1f'));
      cabo.position.set(0, 1.12, 0);
      cabo.rotation.z = 0.25;
      m.conteudo.add(f, cabo);
      rostoBasico(m, sonda, { olhos: [[-0.25, 0.2], [0.25, 0.2]], r: 0.2, boca: [0, -0.3], larguraBoca: 0.48, alturaBoca: 0.34, curv: [0.78, 0.96], bochechas: [[-0.48, -0.05], [0.48, -0.05]] });
      return m;
    }

    // Abacaxi com coroa de folhas (textura de gomos desenhada por código)
    function texturaAbacaxi() {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#F7B513';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#D98A05';
      ctx.lineWidth = 7;
      for (let i = -8; i < 16; i++) {
        ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 512, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * 64, 512); ctx.lineTo(i * 64 + 512, 0); ctx.stroke();
      }
      ctx.fillStyle = '#C97806';
      for (let y = 0; y < 512; y += 64) {
        for (let x = 0; x < 512; x += 64) {
          ctx.beginPath(); ctx.arc(x + 32, y + 32, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2, 1.4);
      return t;
    }
    function abacaxi() {
      const geo = new THREE.SphereGeometry(1, seg(48), seg(32));
      geo.scale(0.78, 1, 0.74);
      const sonda = new THREE.Mesh(geo);
      const mat = new THREE.MeshPhysicalMaterial({ map: texturaAbacaxi(), roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2 });
      const m = montar(geo, mat, { nome: 'abacaxi', bochecha: 0.6, idle: { fase: 5.2, vel: 1.6, amp: 0.06, gelatina: 0.03 } });
      for (let i = 0; i < 9; i++) {
        const g = new THREE.Group();
        g.rotation.y = (i / 9) * Math.PI * 2;
        g.position.y = 0.88;
        const f = folha(0.95 - (i % 3) * 0.12, 0.17, i % 2 ? '#3E9B3A' : '#5BBF4A');
        f.rotation.x = 0.35 + (i % 3) * 0.12;
        g.add(f);
        m.conteudo.add(g);
      }
      const centro = folha(1.1, 0.18, '#4CAF50');
      centro.position.y = 0.9;
      m.conteudo.add(centro);
      rostoBasico(m, sonda, { olhos: [[-0.25, 0.18], [0.25, 0.18]], r: 0.2, boca: [0, -0.3], larguraBoca: 0.5, alturaBoca: 0.34, curv: [0.78, 1], bochechas: [[-0.5, -0.08], [0.5, -0.08]] });
      return m;
    }

    /* ---------- Balas decorativas (sem rosto) ---------- */

    // Geometria de cada tipo de bala (compartilhada; centralizada na origem)
    function geometriaBala(tipo) {
      if (tipo === 'bala') return geos.balaGoma || (geos.balaGoma = lathe([[0, 0], [0.46, 0], [0.52, 0.07], [0.5, 0.3], [0.4, 0.55], [0.22, 0.7], [0, 0.74]], seg(40)).translate(0, -0.37, 0));
      if (tipo === 'anel') return geos.anel || (geos.anel = new THREE.TorusGeometry(0.5, 0.25, seg(22), seg(60)));
      if (tipo === 'cubo') return geos.cubo || (geos.cubo = new lib.RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.24));
      if (tipo === 'estrela') return geos.estrela || (geos.estrela = geoEstrelaFofa(0.62, 0.31, 0.26, seg(90)));
      if (tipo === 'gota') return geos.gota || (geos.gota = new THREE.LatheGeometry(perfilGota(0.42), seg(40)).translate(0, -0.57, 0));
      return geos.bastao || (geos.bastao = new THREE.CapsuleGeometry(0.2, 1.05, 8, seg(22)));
    }

    function bala(tipo, cor, semente) {
      const grupo = new THREE.Group();
      const geo = geometriaBala(tipo);
      let mat = goma(cor), qtdAcucar = 0;
      if (tipo === 'anel') {
        mat = goma(cor, 'acucarada');
        qtdAcucar = 170;
      } else if (tipo === 'bastao') {
        mat = goma(cor, 'acucarada');
        qtdAcucar = 150;
      } else if (tipo === 'bala') {
        mat = goma(cor, 'acucarada');
        qtdAcucar = 190;
      }
      const corpo = new THREE.Mesh(geo, mat);
      grupo.add(corpo);
      let linha = null;
      if (comContorno) {
        linha = new THREE.Mesh(geos['s_' + tipo] || (geos['s_' + tipo] = suavizada(geo)), contorno(0.03));
        grupo.add(linha);
      }
      if (qtdAcucar) {
        const c = acucar(corpo, qtdAcucar, 0.026, null, semente || 5);
        if (c) corpo.add(c);
      }
      return grupo;
    }

    return {
      gotinha: gotinha, anelzinho: anelzinho, cuboAzedo: cuboAzedo, estrelete: estrelete,
      garrafa: garrafa, framboesa: framboesa, manga: manga, uva: uva, abacaxi: abacaxi,
      bala: bala, geometriaBala: geometriaBala, goma: goma
    };
  };
})();
