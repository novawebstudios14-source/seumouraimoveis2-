# Seu Moura: identidade e refinamento

## Fonte de verdade

A logo original `assets/logo.png` é preservada. Sua cor laranja predominante é RGB 255, 151, 30: **#FF971E**. A marca usa laranja, branco e preto. Não usar verde-petróleo, bege ou dourado substituindo essas cores.

## Direção

Refinamento do site imobiliário existente para compradores e proprietários de Marabá. Fotografia real, composição editorial, hierarquia clara. Preservar catálogo, navegação, contatos e semântica dos formulários.

Design variance 6, motion intensity 4, visual density 3: manter o espaço e a composição existente, concentrar a animação na entrada principal e no retorno das interações, sem animação repetitiva de todas as seções.

## Tokens e comportamento

- Marca e ações principais: #FF971E; hover #FFAC4D; texto escuro #191919.
- Tema claro: fundo #FAFAFA, superfície #FFFFFF, texto #191919, secundário #626262.
- Tema escuro acompanha o sistema: fundo #161616, superfície #202020, texto #F5F5F5, secundário #B8B8B8.
- Laranja sobre branco não serve para texto pequeno. Ações laranja usam texto preto. Foco claro #A84E00; foco sobre fundos escuros #FF971E.
- Fotografias recebem apenas sobreposição neutra, nunca uma tintura verde.
- Títulos usam Archivo 600/500, com construção arquitetônica, peso firme e tracking fechado. Textos, navegação e controles usam Manrope 400–700 para leitura clara. Não usar serifas decorativas ou itálicos frágeis.
- Botões e controles de galeria: raio 4px; botão flutuante de WhatsApp: pill, como controle persistente separado.
- Textos de campos: 16px para evitar zoom no Safari; alvos de toque 44px ou maiores.
- Tabler Icons, outline, 1.8px. Sem glifos que possam virar emoji no iOS.
- Transições interativas 160-200ms, cubic-bezier(.16,1,.3,1). Hover com movimento só em ponteiro preciso. Resposta de pressionamento scale(.97).
- Hero: entrada pontual de 650ms e imagem 1100ms; conteúdo permanece acessível com movimento reduzido. Seções não dependem de animação para aparecer.
- Cabeçalho usa IntersectionObserver, sem processamento contínuo de rolagem.

## Skills instaladas e aplicadas

- emilkowalski/skills: emil-design-eng, decisões de animação e acabamento de componentes.
- pbakaus/impeccable: contexto, colorize, craft-floor e detector.
- Leonxlnx/taste-skill: design-taste-frontend, identidade, consistência, responsividade e hierarquia.

Instalações reproduzíveis: `sh scripts/install-design-skills.sh`. A procedência está registrada em `skills-lock.json`. São ferramentas de desenvolvimento, não dependências carregadas pelo site.

## Refero

https://styles.refero.design/
https://styles.refero.design/style/fe8cdcf9-c850-4d52-be07-5ad269bf9ebf
https://styles.refero.design/style/f61cf515-ccd5-4494-bdd1-be9fe4d7258c

Referências para um acento forte sobre neutros e hierarquia editorial. Não copiar a paleta ou identidade dessas marcas: a logo Seu Moura é a autoridade.
