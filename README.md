# Seu Moura Imóveis

Site estático responsivo para a Seu Moura Imóveis, com catálogo, filtros, galeria acessível, menu mobile, animações com suporte a movimento reduzido e contatos pelo WhatsApp.

## Publicação

O workflow `.github/workflows/pages.yml` publica a branch `main` no GitHub Pages. Na primeira publicação, selecione **Settings → Pages → Source → GitHub Actions**. Se a execução inicial ocorreu antes da ativação, execute novamente o workflow **Publish website to GitHub Pages** em Actions.

Também é possível publicar sem Actions: **Settings → Pages → Deploy from a branch → main → / (root)**. Os arquivos já estão prontos na raiz.

## Conteúdo

Dados e fotografias consultados em https://seumouraimoveis.com.br/ em 16/09/2026. O catálogo público apresentava um imóvel: casa de porteira fechada no Condomínio Ipiranga. Valor e disponibilidade precisam ser confirmados com a imobiliária. Não há sincronização automática com o site de origem. As imagens estão armazenadas em `assets/`.

Referências de direção visual: Bossa Nova Sotheby's (https://www.bnsir.com.br/), Axpe (https://www.axpe.com.br/) e Bamberg (https://www.bamberg.com.br/). Implementação original; não reutiliza código ou imagens dessas referências.

## Edição

- `index.html`: conteúdo e dados do imóvel.
- `styles.css`: identidade visual, responsividade e animações.
- `app.js`: filtros, galeria e preparação das mensagens.
- `assets/`: fotografias e marca do site original.

O formulário abre o WhatsApp com uma mensagem preenchida; o visitante revisa e envia. Não há envio automático, banco de dados ou armazenamento de dados pessoais. As fontes são carregadas do Google Fonts, com fontes locais de fallback.

## Verificação local

Sirva o diretório com qualquer servidor HTTP estático. Não há dependências de build. Valide JavaScript com `node --check app.js`.
