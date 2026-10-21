# Gomolândia (conceito)

Landing page conceito de portfólio para uma marca **inventada** de gomas de gelatina. Criei este projeto para estudar animação, 3D e interação na web.

**Projeto conceito de portfólio. Sem vínculo com nenhuma marca real.** Nome, personagens, produtos, embalagens e textos são fictícios e foram criados do zero.

**Ver online:** [gomolandiaprojeto.netlify.app](https://gomolandiaprojeto.netlify.app/)

## O que tem no projeto

**Animações na rolagem:** textos e seções que aparecem e se movem conforme a página desce, feitos com GSAP e ScrollTrigger, com rolagem suave via Lenis.

**3D:** vitrine de produtos e seção de sensações com cenas em Three.js, com plano B para quando o 3D não carrega.

**Arte própria:** as embalagens e os personagens são ilustrações em SVG e código, sem imagens de terceiros.

**Detalhes de interação:** cursor personalizado, letreiro em movimento e escolha de sabor na vitrine.

**Acessibilidade:** link para pular ao conteúdo e formulários com rótulos.

Os formulários são só visuais: nada é enviado nem armazenado.

## Tecnologias

HTML, CSS e JavaScript puro, com GSAP 3.13, ScrollTrigger, Lenis 1.3 e Three.js 0.170 carregados por CDN. Fontes do Google Fonts: Bricolage Grotesque, DM Sans e Lilita One.

## Estrutura

**index.html:** a página inteira.

**css/:** base, layout, components e motion.

**js/:** arte-embalagem, cursor e main, além da pasta js/3d com nucleo, vitrine3d e sensacoes3d.

## Como rodar

Abra a pasta do projeto por um servidor local (por exemplo, rodando npx serve dentro dela) e acesse o endereço que aparecer. É preciso ter internet para carregar as bibliotecas e as fontes.

## Autor

Feito por Rafael Barone. Contato: [LinkedIn](https://www.linkedin.com/in/rafael-b-b188363b1)
