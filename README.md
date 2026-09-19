# Seu Moura Imóveis

Site responsivo para a Seu Moura Imóveis, com catálogo, filtros, galeria acessível, menu mobile, animações com suporte a movimento reduzido e contatos pelo WhatsApp. O experimento de cadastro pelo WhatsApp está neste **repositório de testes**, separado do site principal.

## Ambiente de homologação\n\nSite com serviço Node e volume persistente: https://site-whatsapp-production.up.railway.app/ (catálogo: https://site-whatsapp-production.up.railway.app/imoveis.html). O webhook ainda requer a ativação da conta oficial WhatsApp Business Platform; nenhuma mensagem real é recebida até configurar os segredos Meta. O repositório principal não foi alterado.\n\n## Cadastro de imóveis pelo WhatsApp (teste)

O serviço `server.mjs` recebe mensagens pela API oficial do WhatsApp Business, aceita dados enviados em várias mensagens e até 20 fotos por anúncio, mantém o rascunho, pede confirmação e publica no catálogo em `imoveis.html`. Somente números cadastrados em `EDITOR_PHONES` podem criar ou alterar anúncios. O número de atendimento dos compradores continua separado.

Fluxo de mensagens para o editor:

1. `NOVO`
2. `Título: Casa no Centro`, `Finalidade: venda`, `Tipo: casa`, `Bairro: Centro`, `Preço: 450000` (pode mandar cada linha separadamente ou tudo junto). Campos opcionais: `Cidade`, `Quartos`, `Banheiros`, `Área`, `Descrição`.
3. Envie pelo menos uma foto JPG, PNG ou WebP. Digite `PUBLICAR` para receber a prévia.
4. Digite `CONFIRMAR` para colocar no catálogo. `LISTAR` mostra os códigos; `EDITAR código`, `PAUSAR código`, `ATIVAR código`, `VENDIDO código` e `ALUGADO código` administram os anúncios. `CANCELAR` descarta um rascunho.

### Teste local sem WhatsApp real

Requer Node.js 20 ou superior, sem dependências externas. Rode `DEMO_MODE=1 npm start` e abra `http://localhost:3000/simulador.html`. Envie `NOVO`, os campos e uma foto, depois `PUBLICAR` e `CONFIRMAR`; confira `http://localhost:3000/imoveis.html`. O simulador só atende requisições locais e não é servido fora do modo de teste. Rode `npm test` para testar o fluxo. Os dados de teste ficam em `data/`, que não é versionado.

### Ligação com o número oficial

É necessário ter um número receptor conectado à WhatsApp Business Platform, um endereço HTTPS público para o webhook e armazenamento persistente para `data/`. Configure estas variáveis **no serviço privado**, nunca no site ou no GitHub:

| Variável | Finalidade |
| --- | --- |
| `EDITOR_PHONES` | Números autorizados em formato internacional, com DDI 55, separados por vírgula |
| `META_VERIFY_TOKEN` | Segredo escolhido para validar a configuração do webhook |
| `META_APP_SECRET` | Segredo do aplicativo Meta para validar a assinatura das mensagens |
| `WHATSAPP_ACCESS_TOKEN` | Token da Cloud API para baixar fotos e responder |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número receptor na Cloud API |
| `DATA_DIR` | Diretório em volume persistente para dados e fotos |
| `PORT` | Porta HTTP do serviço (padrão 3000) |
| `META_API_VERSION` | Versão da Graph API (padrão `v23.0`, ajuste conforme a versão disponível) |

Webhook: `https://SEU-DOMINIO/webhooks/whatsapp`, com assinatura `X-Hub-Signature-256`. Mantenha `DEMO_MODE` desligado na hospedagem. O serviço responde apenas aos números autorizados; erros de entrega aparecem nos logs para diagnóstico. Faça backups regulares do volume de `data/`.

**Importante:** GitHub Pages publica apenas os arquivos estáticos. O catálogo novo é carregado de `/api/properties` pelo serviço Node; portanto, **o endereço do GitHub Pages, sozinho, não recebe mensagens nem mostra anúncios novos**. Para operar de verdade, hospede o serviço Node em um endereço HTTPS que sirva também o site, com armazenamento persistente, e configure nele o webhook e as variáveis acima. Até essa ligação, o site no GitHub Pages continua exibindo os anúncios originais. Nenhum token ou número receptor foi conectado neste repositório.

## Publicação

O workflow `.github/workflows/pages.yml` publica a branch `main` no GitHub Pages. Na primeira publicação, selecione **Settings → Pages → Source → GitHub Actions**. Se a execução inicial ocorreu antes da ativação, execute novamente o workflow **Publish website to GitHub Pages** em Actions.

Também é possível publicar sem Actions: **Settings → Pages → Deploy from a branch → main → / (root)**. Os arquivos já estão prontos na raiz.

## Conteúdo

Dados e fotografias consultados em https://seumouraimoveis.com.br/ em 16/09/2026. O catálogo público apresentava um imóvel: casa de porteira fechada no Condomínio Ipiranga. Valor e disponibilidade precisam ser confirmados com a imobiliária. Não há sincronização automática com o site de origem. As imagens estão armazenadas em `assets/`.

Referências de direção visual: Bossa Nova Sotheby's (https://www.bnsir.com.br/), Axpe (https://www.axpe.com.br/) e Bamberg (https://www.bamberg.com.br/). Implementação original; não reutiliza código ou imagens dessas referências.

## Edição

- `index.html`: apresentação e imóvel em destaque.
- `imoveis.html` e `catalog-live.js`: catálogo e anúncios vindos do serviço.
- `server.mjs`: webhook, rascunhos, confirmação, fotos e API do catálogo.
- `styles.css`: identidade visual, responsividade e animações.
- `app.js`: filtros, galeria e preparação das mensagens.
- `assets/`: fotografias e marca do site original.

O formulário abre o WhatsApp com uma mensagem preenchida; o visitante revisa e envia. Não há envio automático, banco de dados ou armazenamento de dados pessoais. As fontes são carregadas do Google Fonts, com fontes locais de fallback.

## Verificação local

Sirva o diretório com qualquer servidor HTTP estático. Não há dependências de build. Valide JavaScript com `node --check app.js`.
