
(function () {
  'use strict';

  const Gomo = (window.Gomo = window.Gomo || {});

  const AZUL = '#1B2A78';       // contorno do logo e textos
  const AZUL_ESCURO = '#0E1550';
  const AMARELO = '#FFC400';

  // Linha de produtos 
  const SABORES = [
    {
      id: 'cola', rotulo: 'Cola', nome: 'COLA', sabor: ['Sabor intenso', 'de cola'], formato: 'doypack',
      cor: '#141414', texto: '#FFFFFF', mascote: 'garrafa', peso: '100 g', icone: 'garrafa',
      titulo: { fill: '#FFD100', contorno: '#000000', sombra: '#000000' },
      bala: { forma: 'garrafa', cores: ['#6b3413', '#7d3d17', '#5a2a0e'], acucar: true }
    },
    {
      id: 'framboesa', rotulo: 'Framboesa', nome: 'FRAMBOESA', sabor: ['Sabor de frutas', 'vermelhas'], formato: 'doypack',
      cor: '#E3157F', texto: '#FFFFFF', mascote: 'framboesa', peso: '100 g', icone: 'fruta',
      titulo: { fill: '#FF72B6', contorno: '#FFFFFF', sombra: '#8E0B4F' },
      bala: { forma: 'fruta', cores: ['#D4113A', '#EC2E60', '#B30D37'], acucar: true }
    },
    {
      id: 'doces', rotulo: 'Doces', nome: 'DOCES', sabor: ['Sabor sortido'], formato: 'pote',
      cor: '#1B2A70', texto: '#FFFFFF', mascote: 'manga', peso: '150 g', icone: 'bala',
      titulo: { fill: '#FFD100', contorno: AZUL_ESCURO, sombra: '#070B30' },
      bala: { forma: 'bolinha', cores: ['#E8212E', '#FF8A1F', '#58B82E', '#FFC400', '#8A3FD6'], acucar: true }
    },
    {
      id: 'uva', rotulo: 'Uva', nome: 'UVA', sabor: ['Sabor natural', 'de uva'], formato: 'travesseiro',
      cor: '#6E24C0', texto: '#FFFFFF', mascote: 'uva', peso: '70 g', icone: 'uva',
      titulo: { fill: '#B68AFF', contorno: '#FFFFFF', sombra: '#3A1180' },
      bala: { forma: 'bolinha', cores: ['#4B1A7E', '#5F2399', '#3A1263'], acucar: true }
    },
    {
      id: 'minifrutas', rotulo: 'Mini Frutas', nome: 'MINI FRUTAS', sabor: ['Sabor sortido'], formato: 'caixa',
      cor: '#FFD500', texto: AZUL, mascote: 'abacaxi', peso: '50 g', icone: 'abacaxi',
      titulo: { fill: '#FFFFFF', fill2: '#FFB000', contorno: AZUL, sombra: AZUL_ESCURO },
      bala: { forma: 'bolinha', cores: ['#E8212E', '#FF8A1F', '#58B82E', '#FFC400', '#8A3FD6'], acucar: true }
    }
  ];
  Gomo.SABORES = SABORES;
  Gomo.sabor = function (id) { return SABORES.find(function (s) { return s.id === id; }); };

  
  let fontes = null;
  Gomo.fontesDaArte = function () {
    if (!fontes) {
      fontes = document.fonts && document.fonts.load
        ? Promise.all([
          document.fonts.load('400 100px "Lilita One"'),
          document.fonts.load('800 100px "Bricolage Grotesque"'),
          document.fonts.load('700 40px "DM Sans"')
        ]).catch(function () {})
        : Promise.resolve();
    }
    return fontes;
  };

  /* ---------- Utilidades ---------- */
  function rgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function misturar(hex, alvo, t) {
    const a = rgb(hex), b = rgb(alvo);
    return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')';
  }
  function aleatorio(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function semente(str) {
    let h = 7;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  function novaTela(W, H) {
    const c = document.createElement('canvas');
    c.width = Math.round(W);
    c.height = Math.round(H);
    return c;
  }

  /* ---------- Balas desenhadas (janelas das embalagens) ---------- */
  function frutinha() {
    const pts = [[50, 30], [34, 40], [66, 40], [50, 50], [30, 58], [70, 58], [42, 68], [58, 68], [50, 82]];
    return pts.map(function (p) { return 'M' + (p[0] - 14) + ' ' + p[1] + 'a14 14 0 1 0 28 0a14 14 0 1 0-28 0z'; }).join('');
  }
  const FORMAS = {
    anel: { d: 'M50 6a44 44 0 1 1 0 88a44 44 0 1 1 0-88zm0 28a16 16 0 1 0 0 32a16 16 0 1 0 0-32z', w: 100, h: 100, regra: 'evenodd' },
    gota: { d: 'M50 6C50 6 88 54 88 78a38 38 0 0 1-76 0C12 54 50 6 50 6z', w: 100, h: 120 },
    cubo: { d: 'M30 8h40a22 22 0 0 1 22 22v40a22 22 0 0 1-22 22H30A22 22 0 0 1 8 70V30A22 22 0 0 1 30 8z', w: 100, h: 100 },
    estrela: { d: 'M50 7l12 27 29 3-22 20 7 29-26-15-26 15 7-29L9 37l29-3z', w: 100, h: 100, arredondar: 9 },
    garrafa: { d: 'M15 4h10v13c0 7 10 11 10 23v49a8 8 0 0 1-8 8H13a8 8 0 0 1-8-8V40c0-12 10-16 10-23z', w: 40, h: 100, duasCores: '#E9B96A' },
    bolinha: { d: 'M10 78C10 32 28 14 50 14s40 18 40 64c0 8-80 8-80 0z', w: 100, h: 92 },
    fruta: { d: frutinha(), w: 100, h: 100 }
  };
  const caminhos = {};
  function caminho(tipo) {
    return caminhos[tipo] || (caminhos[tipo] = new Path2D(FORMAS[tipo].d));
  }

  function desenharBala(ctx, tipo, x, y, tam, giro, cor, acucar, rnd) {
    const f = FORMAS[tipo];
    const p = caminho(tipo);
    const k = tam / Math.max(f.w, f.h);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.scale(k, k);
    ctx.translate(-f.w / 2, -f.h / 2);
    ctx.shadowColor = 'rgba(20, 8, 24, .32)';
    ctx.shadowBlur = tam * 0.08;
    ctx.shadowOffsetY = tam * 0.04;
    ctx.fillStyle = cor;
    ctx.fill(p, f.regra || 'nonzero');
    if (f.arredondar) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = f.arredondar;
      ctx.strokeStyle = cor;
      ctx.stroke(p);
    }
    ctx.shadowColor = 'transparent';
    ctx.save();
    ctx.clip(p, f.regra || 'nonzero');
    if (f.duasCores) {
      ctx.fillStyle = f.duasCores;
      ctx.globalAlpha = 0.92;
      ctx.fillRect(0, 0, f.w, f.h * 0.42);
      ctx.globalAlpha = 1;
    }
    const g = ctx.createRadialGradient(f.w * 0.32, f.h * 0.26, 0, f.w * 0.32, f.h * 0.26, Math.max(f.w, f.h) * 0.8);
    g.addColorStop(0, 'rgba(255, 255, 255, .62)');
    g.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.72, 'rgba(20, 8, 24, 0)');
    g.addColorStop(1, 'rgba(20, 8, 24, .34)');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, f.w + 20, f.h + 20);
    if (acucar) {
      ctx.fillStyle = 'rgba(255, 255, 255, .85)';
      for (let i = 0; i < 70; i++) ctx.fillRect(rnd() * f.w, rnd() * f.h, 2.2, 2.2);
    }
    ctx.restore();
    ctx.restore();
  }
  Gomo.desenharBala = desenharBala;

  /* ---------- Tipografia da embalagem ---------- */

  
  function logo(ctx, x, y, tam) {
    const txt = 'Gomolândia';
    ctx.save();
    ctx.font = '400 ' + Math.round(tam) + 'px "Lilita One"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const larg = ctx.measureText(txt).width;
    ctx.strokeStyle = AZUL_ESCURO;
    ctx.lineWidth = tam * 0.34;
    ctx.strokeText(txt, x, y + tam * 0.07);
    ctx.strokeStyle = AZUL;
    ctx.lineWidth = tam * 0.27;
    ctx.strokeText(txt, x, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(txt, x, y);
    // sorriso
    const yS = y + tam * 0.56, w = larg * 0.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - w / 2, yS);
    ctx.quadraticCurveTo(x, yS + tam * 0.34, x + w / 2, yS);
    ctx.strokeStyle = AZUL;
    ctx.lineWidth = tam * 0.28;
    ctx.stroke();
    ctx.strokeStyle = AMARELO;
    ctx.lineWidth = tam * 0.15;
    ctx.stroke();
    ctx.restore();
    return larg;
  }
  Gomo.desenharLogo = logo;


  function nomeBolha(ctx, texto, x, y, tam, t, alinhar, fill) {
    ctx.save();
    ctx.font = '400 ' + Math.round(tam) + 'px "Lilita One"';
    ctx.textAlign = alinhar || 'left';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(tam * 0.02) + 'px';
    ctx.strokeStyle = t.sombra;
    ctx.lineWidth = tam * 0.26;
    ctx.strokeText(texto, x, y + tam * 0.08);
    ctx.strokeStyle = t.contorno;
    ctx.lineWidth = tam * 0.2;
    ctx.strokeText(texto, x, y);
    ctx.fillStyle = fill || t.fill;
    ctx.fillText(texto, x, y);
    ctx.restore();
  }
  function ajustarTam(ctx, texto, tam, largura) {
    ctx.font = '400 ' + Math.round(tam) + 'px "Lilita One"';
    const w = ctx.measureText(texto).width * 1.08;
    return w > largura ? tam * (largura / w) : tam;
  }

  function textoSimples(ctx, str, x, y, tam, cor, peso, alinhar) {
    ctx.save();
    ctx.font = (peso || 700) + ' ' + Math.round(tam) + 'px "DM Sans"';
    ctx.textAlign = alinhar || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cor;
    ctx.fillText(str, x, y);
    ctx.restore();
  }


  function icone(ctx, tipo, x, y, t, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineWidth = t * 0.09;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (tipo === 'garrafa') {
      ctx.moveTo(-t * 0.12, -t * 0.5); ctx.lineTo(t * 0.12, -t * 0.5); ctx.lineTo(t * 0.12, -t * 0.25);
      ctx.quadraticCurveTo(t * 0.3, -t * 0.12, t * 0.28, t * 0.1); ctx.lineTo(t * 0.28, t * 0.45);
      ctx.lineTo(-t * 0.28, t * 0.45); ctx.lineTo(-t * 0.28, t * 0.1);
      ctx.quadraticCurveTo(-t * 0.3, -t * 0.12, -t * 0.12, -t * 0.25); ctx.closePath(); ctx.stroke();
    } else if (tipo === 'uva') {
      [[-0.17, -0.15], [0.17, -0.15], [0, 0.1], [-0.17, 0.32], [0.17, 0.32], [0, -0.38]].forEach(function (p) {
        ctx.moveTo(p[0] * t + t * 0.13, p[1] * t); ctx.arc(p[0] * t, p[1] * t, t * 0.13, 0, Math.PI * 2);
      });
      ctx.stroke();
    } else if (tipo === 'abacaxi') {
      ctx.ellipse(0, t * 0.12, t * 0.25, t * 0.33, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -t * 0.2); ctx.lineTo(-t * 0.15, -t * 0.5); ctx.moveTo(0, -t * 0.2); ctx.lineTo(0, -t * 0.55); ctx.moveTo(0, -t * 0.2); ctx.lineTo(t * 0.15, -t * 0.5); ctx.stroke();
    } else if (tipo === 'fruta') {
      ctx.arc(0, t * 0.1, t * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -t * 0.22); ctx.quadraticCurveTo(t * 0.2, -t * 0.5, t * 0.3, -t * 0.42); ctx.stroke();
    } else {
      ctx.arc(-t * 0.16, t * 0.12, t * 0.2, 0, Math.PI * 2); ctx.moveTo(t * 0.4, -t * 0.1); ctx.arc(t * 0.2, -t * 0.1, t * 0.2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function peso(ctx, s, x, y, tam, cor) {
    icone(ctx, s.icone, x, y, tam * 1.4, cor);
    textoSimples(ctx, 'Peso Líq.', x + tam * 1.05, y - tam * 0.38, tam * 0.5, cor, 600);
    textoSimples(ctx, s.peso, x + tam * 1.05, y + tam * 0.3, tam * 0.95, cor, 800);
  }

  /* ---------- Fundos e grafismos ---------- */

  function pincelada(ctx, pts, larg, cor, rnd) {
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let k = 0; k < 6; k++) {
      ctx.globalAlpha = 0.85 + rnd() * 0.15;
      ctx.lineWidth = larg * (0.72 + rnd() * 0.32);
      ctx.beginPath();
      pts.forEach(function (p, i) {
        const jx = (rnd() - 0.5) * larg * 0.18, jy = (rnd() - 0.5) * larg * 0.18;
        if (i === 0) ctx.moveTo(p[0] + jx, p[1] + jy); else ctx.lineTo(p[0] + jx, p[1] + jy);
      });
      ctx.stroke();
    }
    // respingos nas bordas da pincelada
    ctx.globalAlpha = 1;
    for (let i = 0; i < 18; i++) {
      const p = pts[Math.floor(rnd() * pts.length)];
      ctx.beginPath();
      ctx.arc(p[0] + (rnd() - 0.5) * larg * 1.4, p[1] + (rnd() - 0.5) * larg * 1.4, rnd() * larg * 0.06 + 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function manchas(ctx, lista) {
    // lista: [x, y, raio, cor, alpha]
    lista.forEach(function (m) {
      ctx.save();
      ctx.globalAlpha = m[4] == null ? 1 : m[4];
      ctx.fillStyle = m[3];
      ctx.beginPath();
      const n = 9, r = m[2];
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.82 + 0.18 * Math.sin(i * 2.7 + r));
        const px = m[0] + Math.cos(a) * rr, py = m[1] + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.quadraticCurveTo(m[0] + Math.cos(a - 0.35) * rr * 1.12, m[1] + Math.sin(a - 0.35) * rr * 1.12, px, py);
      }
      ctx.fill();
      ctx.restore();
    });
  }

  function fundoPadrao(ctx, W, H, s, rnd) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, misturar(s.cor, '#FFFFFF', s.id === 'cola' ? 0.06 : 0.14));
    g.addColorStop(0.5, s.cor);
    g.addColorStop(1, misturar(s.cor, '#000000', 0.16));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (s.id === 'cola') {
      pincelada(ctx, [[-W * 0.05, H * 0.2], [W * 0.18, H * 0.06], [W * 0.42, -H * 0.02]], W * 0.2, '#FFD100', rnd);
      pincelada(ctx, [[W * 1.04, H * 0.12], [W * 0.84, H * 0.3], [W * 0.98, H * 0.52]], W * 0.16, '#FFD100', rnd);
      pincelada(ctx, [[-W * 0.04, H * 0.84], [W * 0.24, H * 0.92], [W * 0.5, H * 0.98]], W * 0.12, '#FFD100', rnd);
    } else if (s.id === 'framboesa') {
      manchas(ctx, [[W * 0.9, H * 0.12, W * 0.24, '#FF62B2', 0.35], [W * 0.05, H * 0.55, W * 0.16, '#7A1FA8', 0.35], [W * 0.95, H * 0.75, W * 0.14, '#7A1FA8', 0.4], [W * 0.18, H * 0.2, W * 0.1, '#FF8CC6', 0.25]]);
    } else if (s.id === 'uva') {
      for (let i = 0; i < 22; i++) {
        ctx.beginPath();
        ctx.arc(rnd() * W, rnd() * H * 0.55, W * (0.03 + rnd() * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(190, 140, 255, ' + (0.12 + rnd() * 0.12) + ')';
        ctx.fill();
      }
    } else if (s.id === 'minifrutas') {
      manchas(ctx, [[W * 0.98, H * 0.05, W * 0.16, '#8A3FD6'], [W * 0.02, H * 0.4, W * 0.1, '#FF4FA3'], [W * 0.06, H * 0.96, W * 0.16, '#58B82E'], [W * 0.95, H * 0.98, W * 0.18, '#8A3FD6'], [W * 1.0, H * 0.55, W * 0.08, '#FF8A1F'], [W * 0.5, H * 1.02, W * 0.08, '#FF4FA3']]);
    }
  }

  function soldaTopo(ctx, W, alt, s) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = misturar(s.cor, '#000000', 0.35);
    ctx.fillRect(0, 0, W, alt);
    ctx.globalAlpha = 0.16;
    for (let x = 0; x < W; x += 7) {
      ctx.fillStyle = (x / 7) % 2 ? '#FFFFFF' : '#000000';
      ctx.fillRect(x, 0, 2, alt);
    }
    ctx.restore();
  }

  // Janela de plástico com as balas (onda: borda superior ondulada)
  function janela(ctx, x, y, w, h, s, rnd, estilo, borda) {
    ctx.save();
    ctx.beginPath();
    if (estilo === 'onda') {
      ctx.moveTo(x, y + h * 0.16);
      ctx.bezierCurveTo(x + w * 0.22, y - h * 0.06, x + w * 0.42, y + h * 0.18, x + w * 0.62, y + h * 0.04);
      ctx.bezierCurveTo(x + w * 0.78, y - h * 0.06, x + w * 0.92, y + h * 0.02, x + w, y + h * 0.1);
      ctx.lineTo(x + w, y + h - w * 0.07);
      ctx.quadraticCurveTo(x + w, y + h, x + w - w * 0.07, y + h);
      ctx.lineTo(x + w * 0.07, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - w * 0.07);
      ctx.closePath();
    } else {
      ctx.roundRect(x, y, w, h, w * 0.06);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, .88)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // balas bem juntinhas, de trás para frente
    const lista = [];
    const colunas = 5, linhas = 4;
    for (let i = 0; i < colunas * linhas + 6; i++) {
      const c = i % colunas, l = Math.floor(i / colunas) % linhas;
      lista.push({
        x: x + ((c + 0.5 + (rnd() - 0.5) * 0.8) / colunas) * w,
        y: y + ((l + 0.6 + (rnd() - 0.5) * 0.7) / linhas) * h,
        tam: w * (0.2 + rnd() * 0.07),
        giro: (rnd() - 0.5) * (s.bala.forma === 'garrafa' ? 2.6 : 1.4),
        cor: s.bala.cores[i % s.bala.cores.length]
      });
    }
    lista.sort(function (a, b) { return a.y - b.y; });
    lista.forEach(function (b) { desenharBala(ctx, s.bala.forma, b.x, b.y, b.tam, b.giro, b.cor, s.bala.acucar, rnd); });
    // reflexo do plástico
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(255, 255, 255, .34)');
    g.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.62, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.74, 'rgba(255, 255, 255, .16)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y - h * 0.1, w, h * 1.2);
    ctx.restore();
    ctx.lineWidth = Math.max(5, w * 0.018);
    ctx.strokeStyle = borda || 'rgba(255, 255, 255, .95)';
    ctx.stroke();
    ctx.restore();
  }

  function foto(ctx, img, x, y, t) {
    if (!img) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, .35)';
    ctx.shadowBlur = t * 0.05;
    ctx.shadowOffsetY = t * 0.025;
    ctx.drawImage(img, x, y, t, t);
    ctx.restore();
  }

  function brilhoFilme(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.07, 'rgba(255, 255, 255, .14)');
    g.addColorStop(0.15, 'rgba(255, 255, 255, 0)');
    g.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, .12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function verso(ctx, W, H, s, o) {
    logo(ctx, W / 2, H * (0.2 + o), W * 0.12);
    ['Ingredientes: imaginação, cor,', 'brilho e uma pitada de açúcar', 'de mentirinha.', '', 'Embalagem ilustrativa.', 'Projeto conceito de portfólio,', 'sem vínculo com marcas reais.']
      .forEach(function (linha, i) { textoSimples(ctx, linha, W / 2, H * (0.38 + o) + i * W * 0.055, W * 0.036, s.texto, 600, 'center'); });
  }

  /* ---------- Formatos ---------- */

  // Pacote em pé com furinho (doypack) e pacote travesseiro
  function pacote(s, img, lado, W) {
    const doy = s.formato === 'doypack';
    const H = Math.round(W * (doy ? 1.45 : 1.5));
    const c = novaTela(W, H);
    const ctx = c.getContext('2d');
    const rnd = aleatorio(semente(s.id + lado));
    ctx.save();
    ctx.beginPath();
    if (doy) {
      ctx.roundRect(0, 0, W, H, [W * 0.03, W * 0.03, W * 0.06, W * 0.06]);
    } else {
      const n = Math.round(W / 30), d = W / n, alt = d * 0.42;
      ctx.moveTo(0, alt);
      for (let i = 0; i < n; i++) { ctx.lineTo(i * d + d / 2, 0); ctx.lineTo((i + 1) * d, alt); }
      ctx.lineTo(W, H - alt);
      for (let i = n; i > 0; i--) { ctx.lineTo(i * d - d / 2, H); ctx.lineTo((i - 1) * d, H - alt); }
      ctx.closePath();
    }
    ctx.clip();
    fundoPadrao(ctx, W, H, s, rnd);
    soldaTopo(ctx, W, H * (doy ? 0.075 : 0.065), s);
    if (!doy) {
      ctx.save();
      ctx.translate(0, H);
      ctx.scale(1, -1);
      soldaTopo(ctx, W, H * 0.065, s);
      ctx.restore();
    }
    if (lado === 'verso') {
      verso(ctx, W, H, s, doy ? 0.02 : 0);
    } else if (s.id === 'cola') {
      logo(ctx, W / 2, H * 0.165, W * 0.135);
      textoSimples(ctx, 'Gomas', W * 0.11, H * 0.285, W * 0.058, '#FFFFFF', 700);
      nomeBolha(ctx, 'COLA', W * 0.1, H * 0.365, W * 0.19, s.titulo);
      textoSimples(ctx, s.sabor[0], W * 0.11, H * 0.455, W * 0.046, '#FFFFFF', 600);
      textoSimples(ctx, s.sabor[1], W * 0.11, H * 0.49, W * 0.046, '#FFFFFF', 600);
      janela(ctx, W * 0.06, H * 0.56, W * 0.88, H * 0.31, s, rnd, 'onda', '#FFD100');
      foto(ctx, img, W * 0.36, H * 0.2, W * 0.8);
      peso(ctx, s, W * 0.11, H * 0.93, W * 0.055, '#FFFFFF');
    } else if (s.id === 'framboesa') {
      logo(ctx, W / 2, H * 0.165, W * 0.135);
      textoSimples(ctx, 'Gomas', W * 0.11, H * 0.28, W * 0.058, '#FFFFFF', 700);
      nomeBolha(ctx, 'FRAMBOESA', W * 0.08, H * 0.355, ajustarTam(ctx, 'FRAMBOESA', W * 0.15, W * 0.84), s.titulo);
      textoSimples(ctx, s.sabor[0], W * 0.11, H * 0.44, W * 0.046, '#FFFFFF', 600);
      textoSimples(ctx, s.sabor[1], W * 0.11, H * 0.475, W * 0.046, '#FFFFFF', 600);
      janela(ctx, W * 0.06, H * 0.55, W * 0.88, H * 0.32, s, rnd, 'onda');
      foto(ctx, img, W * 0.47, H * 0.42, W * 0.56);
      peso(ctx, s, W * 0.11, H * 0.93, W * 0.055, '#FFFFFF');
    } else if (s.id === 'uva') {
      logo(ctx, W / 2, H * 0.16, W * 0.135);
      textoSimples(ctx, 'Gomas', W * 0.27, H * 0.255, W * 0.052, '#D9C2FF', 700);
      nomeBolha(ctx, 'UVA', W / 2, H * 0.345, W * 0.2, s.titulo, 'center');
      textoSimples(ctx, s.sabor[0], W / 2, H * 0.425, W * 0.046, '#FFFFFF', 600, 'center');
      textoSimples(ctx, s.sabor[1], W / 2, H * 0.458, W * 0.046, '#FFFFFF', 600, 'center');
      janela(ctx, W * 0.08, H * 0.51, W * 0.84, H * 0.34, s, rnd, 'retangulo');
      foto(ctx, img, W * 0.42, H * 0.5, W * 0.62);
      peso(ctx, s, W * 0.12, H * 0.9, W * 0.05, '#FFFFFF');
    }
    brilhoFilme(ctx, W, H);
    ctx.restore();
    // furinho para pendurar
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(W * 0.41, H * (doy ? 0.025 : 0.022), W * 0.18, H * 0.022, H * 0.011);
    ctx.fill();
    ctx.restore();
    return c;
  }

  // Caixinha: frente e lateral
  function caixa(s, img, lado, W) {
    if (lado === 'lateral') {
      const Wl = Math.round(W * 0.34), Hl = Math.round(W * 1.3);
      const c = novaTela(Wl, Hl);
      const ctx = c.getContext('2d');
      ctx.fillStyle = s.cor;
      ctx.fillRect(0, 0, Wl, Hl);
      manchas(ctx, [[Wl * 0.1, Hl * 0.95, Wl * 0.35, '#58B82E'], [Wl * 0.95, Hl * 0.05, Wl * 0.3, '#8A3FD6']]);
      ctx.save();
      ctx.translate(Wl * 0.52, Hl / 2);
      ctx.rotate(-Math.PI / 2);
      logo(ctx, 0, 0, Wl * 0.3);
      ctx.restore();
      return c;
    }
    const H = Math.round(W * 1.3);
    const c = novaTela(W, H);
    const ctx = c.getContext('2d');
    const rnd = aleatorio(semente(s.id + 'caixa'));
    fundoPadrao(ctx, W, H, s, rnd);
    logo(ctx, W / 2, H * 0.12, W * 0.135);
    textoSimples(ctx, 'Gomas', W * 0.2, H * 0.224, W * 0.05, AZUL, 800);
    const tam = W * 0.16;
    nomeBolha(ctx, 'MINI', W / 2, H * 0.3, tam, s.titulo, 'center', s.titulo.fill);
    nomeBolha(ctx, 'FRUTAS', W / 2, H * 0.4, tam, s.titulo, 'center', s.titulo.fill2);
    textoSimples(ctx, s.sabor[0], W / 2, H * 0.49, W * 0.048, AZUL, 800, 'center');
    janela(ctx, W * 0.08, H * 0.54, W * 0.84, H * 0.33, s, rnd, 'retangulo');
    foto(ctx, img, W * 0.44, H * 0.47, W * 0.6);
    peso(ctx, s, W * 0.12, H * 0.92, W * 0.05, AZUL);
    return c;
  }

  // Pote: faixa do rótulo (envolve o cilindro; a frente fica no meio da imagem)
  function rotuloPote(s, img, W) {
    const H = Math.round(W * 0.18);
    const c = novaTela(W, H);
    const ctx = c.getContext('2d');
    const rnd = aleatorio(semente(s.id + 'pote'));
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, misturar(s.cor, '#FFFFFF', 0.08));
    g.addColorStop(1, misturar(s.cor, '#000000', 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // faixas amarelas curvas (grafismo)
    ctx.save();
    ctx.strokeStyle = '#FFC400';
    ctx.lineCap = 'round';
    ctx.lineWidth = H * 0.09;
    [[0.22, 0.2], [0.3, 0.75], [0.72, 0.35], [0.8, 0.85]].forEach(function (p) {
      ctx.beginPath();
      ctx.moveTo(W * (p[0] - 0.05), H * p[1]);
      ctx.quadraticCurveTo(W * p[0], H * (p[1] - 0.25), W * (p[0] + 0.05), H * p[1]);
      ctx.stroke();
    });
    ctx.restore();
    const xC = W / 2;
    const xT = xC - W * 0.05;
    logo(ctx, xT, H * 0.25, H * 0.2);
    textoSimples(ctx, 'Gomas', xT - W * 0.045, H * 0.5, H * 0.1, '#FF4B78', 800, 'center');
    nomeBolha(ctx, 'DOCES', xT, H * 0.66, H * 0.22, s.titulo, 'center');
    textoSimples(ctx, s.sabor[0], xT, H * 0.84, H * 0.075, '#FFFFFF', 600, 'center');
    if (img) foto(ctx, img, xC + W * 0.03, H * 0.04, H * 0.95);
    peso(ctx, s, xT - W * 0.085, H * 0.9, H * 0.05, '#FFFFFF');
    return c;
  }

  // Versão plana do pote (quando não há 3D): tampa, corpo transparente e o rótulo
  function poteFrente(s, img, W) {
    const H = Math.round(W * 1.15);
    const c = novaTela(W, H);
    const ctx = c.getContext('2d');
    const rnd = aleatorio(semente(s.id + 'plano'));
    // corpo transparente com balas
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.2);
    ctx.lineTo(W * 0.92, H * 0.2);
    ctx.lineTo(W * 0.86, H * 0.97);
    ctx.quadraticCurveTo(W * 0.5, H * 1.01, W * 0.14, H * 0.97);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, .55)';
    ctx.fill();
    ctx.clip();
    for (let i = 0; i < 46; i++) {
      desenharBala(ctx, 'bolinha', W * (0.1 + rnd() * 0.8), H * (0.22 + rnd() * 0.74), W * 0.16, (rnd() - 0.5) * 1.4, s.bala.cores[i % s.bala.cores.length], true, rnd);
    }
    ctx.restore();
    // rótulo (recorte central da faixa)
    const faixa = rotuloPote(s, img, W * 2.6);
    const larg = W * 0.86, alt = larg * (faixa.height / (faixa.width * 0.34));
    ctx.drawImage(faixa, faixa.width * 0.33, 0, faixa.width * 0.34, faixa.height, W * 0.07, H * 0.4, larg, alt);
    // tampa
    ctx.beginPath();
    ctx.roundRect(W * 0.04, H * 0.08, W * 0.92, H * 0.14, H * 0.05);
    ctx.fillStyle = s.cor;
    ctx.fill();
    logo(ctx, W / 2, H * 0.145, W * 0.07);
    return c;
  }

  // API pública: devolve um canvas com a arte pedida
  Gomo.desenharPacote = function (s, img, lado, largura) {
    const W = largura || 768;
    if (s.formato === 'caixa') return caixa(s, img, lado, W);
    if (s.formato === 'pote') return lado === 'rotulo' ? rotuloPote(s, img, W) : poteFrente(s, img, W);
    return pacote(s, img, lado, W);
  };
  Gomo.rotuloPote = rotuloPote;
})();
