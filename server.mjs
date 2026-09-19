import http from 'node:http';
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR||path.join(root,'data');
const dataFile=path.join(dataDir,'catalog.json');
const mediaDir=path.join(dataDir,'media');
const port=Number(process.env.PORT||3000);
const preview=process.env.DEMO_MODE==='1';
const allowed=new Set((process.env.EDITOR_PHONES||'').split(',').map(x=>x.replace(/\D/g,'')).filter(Boolean));
const appSecret=process.env.META_APP_SECRET||'';
const accessToken=process.env.WHATSAPP_ACCESS_TOKEN||'';
const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID||'';
const apiVersion=process.env.META_API_VERSION||'v23.0';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mov':'video/quicktime','.json':'application/json; charset=utf-8'};
const fields=['titulo','finalidade','tipo','bairro','cidade','preco','quartos','banheiros','area','descricao'];
const required=['titulo','finalidade','tipo','bairro','preco'];
const labels={titulo:'Título',finalidade:'Finalidade (venda ou aluguel)',tipo:'Tipo',bairro:'Bairro',cidade:'Cidade',preco:'Preço em reais',quartos:'Quartos',banheiros:'Banheiros',area:'Área em m²',descricao:'Descrição'};
let state={properties:[],drafts:{},seen:[]};
let queue=Promise.resolve();

async function save(){await mkdir(dataDir,{recursive:true});const tmp=dataFile+'.'+randomUUID();await writeFile(tmp,JSON.stringify(state,null,2));await rename(tmp,dataFile);}
try{state={...state,...JSON.parse(await readFile(dataFile,'utf8'))};}catch(error){if(error.code!=='ENOENT')throw error;}

function normalizePrice(value){const text=String(value).trim().replace(/\s|R\$/gi,'');if(!/^\d[\d.,]*$/.test(text))return null;const clean=text.includes(',')?text.replace(/\./g,'').replace(',','.'):text.replace(/\./g,'');const number=Number(clean);return Number.isFinite(number)&&number>0&&number<=1e10?number:null;}
function safeText(value,max=500){return String(value??'').trim().slice(0,max);}
function missing(d){return required.filter(k=>!d[k]);}
function summary(d){return `${d.titulo||'(sem título)'}\n${d.finalidade||'?'} · ${d.tipo||'?'} · ${d.bairro||'?'}${d.cidade?', '+d.cidade:''}\n${d.preco?'R$ '+Number(d.preco).toLocaleString('pt-BR'):'Preço pendente'} · ${d.photos.length} foto(s)`;}
function newDraft(){return {fields:{cidade:'Marabá'},photos:[],status:'draft'};}
function execute(sender,text,photo){
  const input=safeText(text,2000);const lower=input.toLocaleLowerCase('pt-BR').trim();let d=state.drafts[sender];
  if(lower==='novo'||lower==='novo imóvel'||lower==='novo imovel'){
    d=state.drafts[sender]=newDraft();return 'Novo rascunho iniciado. Envie dados assim, em uma ou várias mensagens:\nTítulo: Casa no Centro\nFinalidade: venda\nTipo: casa\nBairro: Centro\nPreço: 450000\nQuartos: 3\n\nDepois envie as fotos e digite PUBLICAR.';
  }
  const status=lower.match(/^(pausar|ativar|vendido|alugado)\s+([a-z0-9-]+)$/);
  if(status){const item=state.properties.find(p=>p.id===status[2]&&p.owner===sender);if(!item)return 'Não encontrei esse código nos seus imóveis.';item.status=status[1]==='ativar'?'published':status[1];return `Imóvel ${item.id}: ${item.status}.`;}
  const edit=lower.match(/^editar\s+([a-z0-9-]+)$/);
  if(edit){const item=state.properties.find(p=>p.id===edit[1]&&p.owner===sender);if(!item)return 'Não encontrei esse código nos seus imóveis.';d=state.drafts[sender]={fields:{...item.fields},photos:[...item.photos],status:'editing',id:item.id};return `Editando ${item.id}. Envie os campos que deseja alterar e depois PUBLICAR.\n${summary({...d.fields,photos:d.photos})}`;}
  if(lower==='listar'){const list=state.properties.filter(p=>p.owner===sender);return list.length?list.map(p=>`${p.id} · ${p.fields.titulo} · ${p.status}`).join('\n'):'Ainda não há imóveis. Digite NOVO.';}
  if(lower==='cancelar'){delete state.drafts[sender];return 'Rascunho cancelado. Digite NOVO para começar outro.';}
  if(!d)return 'Olá! Para cadastrar um imóvel, digite NOVO. Para ver os seus anúncios, digite LISTAR.';
  if(photo){if(d.photos.length>=20)return 'Limite de 20 fotos por imóvel. Envie PUBLICAR para conferir o anúncio.';d.photos.push(photo);}
  if(lower==='publicar'){
    const absent=missing(d.fields);if(absent.length)return `Faltam: ${absent.map(k=>labels[k]).join(', ')}. Envie esses dados antes de publicar.`;
    if(!d.photos.length)return 'Envie pelo menos uma foto antes de publicar.';
    d.status='confirm';return `Confira o anúncio:\n${summary({...d.fields,photos:d.photos})}\n\nResponda CONFIRMAR para colocar no site ou envie correções.`;
  }
  if(lower==='confirmar'){
    if(d.status!=='confirm')return 'Digite PUBLICAR para conferir o anúncio antes de confirmar.';
    const id=d.id||randomUUID().slice(0,8);const item={id,owner:sender,fields:d.fields,photos:d.photos,status:'published',updatedAt:new Date().toISOString()};
    const index=state.properties.findIndex(p=>p.id===id&&p.owner===sender);if(index===-1)state.properties.push(item);else state.properties[index]=item;
    delete state.drafts[sender];return `Publicado! Código: ${id}. Para editar: EDITAR ${id}. Para tirar do ar: PAUSAR ${id}.`;
  }
  const invalid=[];let changed=!!photo;
  for(const line of input.split('\n')){
    const match=line.match(/^\s*([^:]+):\s*(.*?)\s*$/);if(!match)continue;
    const key=match[1].toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    const target={titulo:'titulo',finalidade:'finalidade',tipo:'tipo',bairro:'bairro',cidade:'cidade',preco:'preco',quartos:'quartos',banheiros:'banheiros',area:'area',descricao:'descricao'}[key];
    if(!target)continue;
    let value=safeText(match[2],target==='descricao'?1000:160);
    if(target==='preco'){value=normalizePrice(value);if(value===null){invalid.push(labels[target]);continue;}}
    if(target==='finalidade'){value=value.toLocaleLowerCase('pt-BR');if(!['venda','aluguel'].includes(value)){invalid.push(labels[target]);continue;}}
    if(['quartos','banheiros','area'].includes(target)){value=Number(value.replace(',','.'));if(!Number.isFinite(value)||value<0||value>100000){invalid.push(labels[target]);continue;}}
    if(!value){invalid.push(labels[target]);continue;}
    d.fields[target]=value;changed=true;
  }
  if(changed)d.status='draft';
  return `${changed?'Rascunho atualizado.':'Não identifiquei dados.'}${invalid.length?' Confira: '+invalid.join(', ')+'.':''}\n${summary({...d.fields,photos:d.photos})}\n${missing(d.fields).length?'Faltam: '+missing(d.fields).map(k=>labels[k]).join(', ')+'.':''} Envie fotos e digite PUBLICAR quando terminar.`;
}

function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);}
async function body(req,max=1024*1024){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Corpo grande demais');chunks.push(chunk);}return Buffer.concat(chunks);}
async function storePhoto(bytes,extension){if(bytes.length>10*1024*1024)throw Error('Foto grande demais (máximo 10 MB)');const signatures={jpg:['ffd8ff'],png:['89504e47'],webp:['52494646']};if(!signatures[extension]?.some(s=>bytes.toString('hex',0,s.length/2)===s))throw Error('Formato de imagem inválido');await mkdir(mediaDir,{recursive:true});const name=randomUUID()+'.'+extension;await writeFile(path.join(mediaDir,name),bytes,{flag:'wx'});return '/media/'+name;}
async function metaPhoto(mediaId){if(!accessToken)throw Error('WHATSAPP_ACCESS_TOKEN não configurado');const headers={Authorization:`Bearer ${accessToken}`};const info=await fetch(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(mediaId)}`,{headers});if(!info.ok)throw Error('Falha ao consultar mídia');const meta=await info.json();const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[meta.mime_type];if(!extension)throw Error('Formato de imagem não suportado');const download=await fetch(meta.url,{headers});if(!download.ok)throw Error('Falha ao baixar foto');return storePhoto(Buffer.from(await download.arrayBuffer()),extension);}
async function reply(phone,message){if(!accessToken||!phoneId)return;const response=await fetch(`https://graph.facebook.com/${apiVersion}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'text',text:{body:message}})});if(!response.ok)console.error('Falha ao responder WhatsApp:',response.status);}
async function processMessage(sender,text,photo,id){if(!allowed.has(sender))return null;if(id&&state.seen.includes(id))return null;const message=execute(sender,text,photo);if(id)state.seen=[...state.seen.slice(-999),id];await save();return message;}
async function webhook(req,res){if(!appSecret)return send(res,503,{error:'Configure META_APP_SECRET'});const raw=await body(req);const sent=req.headers['x-hub-signature-256']||'';const expected='sha256='+createHmac('sha256',appSecret).update(raw).digest('hex');if(sent.length!==expected.length||!timingSafeEqual(Buffer.from(sent),Buffer.from(expected)))return send(res,401,{error:'Assinatura inválida'});
  const payload=JSON.parse(raw.toString('utf8'));const events=payload.entry?.flatMap(e=>e.changes||[]).flatMap(c=>c.value?.messages||[])||[];
  for(const event of events){const sender=String(event.from||'').replace(/\D/g,'');if(!allowed.has(sender))continue;try{const photo=event.type==='image'?await metaPhoto(event.image.id):null;const response=await processMessage(sender,event.text?.body||event.image?.caption||'',photo,event.id);if(response)await reply(sender,response);}catch(error){console.error('Erro no evento:',error);await reply(sender,'Não consegui processar essa mensagem. Tente novamente.');}}
  send(res,200,{ok:true});
}
async function handler(req,res){try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/webhooks/whatsapp'&&req.method==='GET'){if(!process.env.META_VERIFY_TOKEN)return send(res,503,{error:'Token de verificação ausente'});return url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===process.env.META_VERIFY_TOKEN?send(res,200,url.searchParams.get('hub.challenge')||'','text/plain'):send(res,403,{error:'Verificação inválida'});}
  if(url.pathname==='/webhooks/whatsapp'&&req.method==='POST')return await webhook(req,res);
  if(url.pathname==='/api/properties'&&req.method==='GET')return send(res,200,{properties:state.properties.filter(p=>p.status==='published').map(({id,fields,photos,updatedAt})=>({id,...fields,photos,updatedAt}))});
  if(url.pathname==='/api/demo'&&req.method==='POST'){if(!preview||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(res,404,{error:'Indisponível'});const input=JSON.parse((await body(req,14*1024*1024)).toString('utf8'));const sender='5594000000000';allowed.add(sender);let photo=null;if(input.photo){const match=String(input.photo).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/s);if(!match)throw Error('Imagem inválida');photo=await storePhoto(Buffer.from(match[2],'base64'),{jpeg:'jpg',png:'png',webp:'webp'}[match[1]]);}const response=await processMessage(sender,input.text||'',photo,randomUUID());return send(res,200,{reply:response,draft:state.drafts[sender]||null});}
  if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
  if(url.pathname==='/simulador.html'&&!preview)return send(res,404,{error:'Indisponível'});
  let filename;
  if(url.pathname.startsWith('/media/'))filename=path.join(mediaDir,path.basename(url.pathname));
  else {const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep)||filename.startsWith(dataDir+path.sep)||path.basename(filename).startsWith('.')||!['.html','.css','.js','.svg','.jpg','.jpeg','.png','.webp','.mov'].includes(path.extname(filename)))return send(res,404,{error:'Não encontrado'});}
  const file=await readFile(filename);res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(file);
}catch(error){console.error(error);send(res,error.code==='ENOENT'?404:400,{error:error.message||'Erro inesperado'});}}
const server=http.createServer((req,res)=>{queue=queue.then(()=>handler(req,res)).catch(console.error);});
server.listen(port,()=>console.log(`Seu Moura: http://localhost:${port}`));
