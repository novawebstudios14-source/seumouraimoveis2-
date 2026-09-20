import http from 'node:http';
import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {createHmac,timingSafeEqual,randomUUID,scryptSync,randomBytes} from 'node:crypto';
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
const adminPassword=process.env.ADMIN_PASSWORD||'';
const sessionSecret=process.env.SESSION_SECRET||'';
const adminUser=process.env.ADMIN_USER||'admin';
const passwordSalt=sessionSecret?createHmac('sha256',sessionSecret).update('password-salt').digest():Buffer.alloc(32);
const passwordHash=adminPassword?scryptSync(adminPassword,passwordSalt,64):Buffer.alloc(64);
const sessions=new Map(), attempts=new Map();
const challenges=new Map();
const secureCookie=process.env.NODE_ENV==='production';
const totpSeed=/^[a-f0-9]{40,128}$/i.test(process.env.TOTP_SECRET||'')?Buffer.from(process.env.TOTP_SECRET,'hex'):null;
function base32(bytes){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let out='',buffer=0,bits=0;for(const byte of bytes){buffer=(buffer<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(buffer>>>(bits-=5))&31];}}if(bits)out+=alphabet[(buffer<<(5-bits))&31];return out;}
function totpAt(step){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(step));const hash=createHmac('sha1',totpSeed).update(counter).digest();const offset=hash[19]&15;return String((hash.readUInt32BE(offset)&0x7fffffff)%1_000_000).padStart(6,'0');}
function codeStep(code){if(!/^[0-9]{6}$/.test(code))return null;const now=Math.floor(Date.now()/30000);for(let step=now-1;step<=now+1;step++)if(equal(totpAt(step),code)&&step>(state.lastTotpStep??-1))return step;return null;}
function recoveryHash(code){return createHmac('sha256',sessionSecret).update('recovery:'+code).digest('hex');}
function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
function originOK(req){const origin=req.headers.origin;const host=req.headers.host;return !!origin&&!!host&&new URL(origin).host===host&&(origin.startsWith('https://')||!secureCookie);}
function session(req){const token=(req.headers.cookie||'').match(/(?:^|;\s*)moura_session=([a-f0-9]{64})/)?.[1];if(!token)return null;const entry=sessions.get(createHmac('sha256',sessionSecret).update(token).digest('hex'));if(!entry)return null;if(entry.expires<Date.now()){sessions.delete(createHmac('sha256',sessionSecret).update(token).digest('hex'));return null;}return entry;}
function throttle(key,max,period){const now=Date.now(),entry=attempts.get(key);if(!entry||entry.until<now){attempts.set(key,{count:1,until:now+period});return false;}entry.count++;return entry.count>max;}
function adminGuard(req,res){if(!adminPassword||!sessionSecret){send(res,503,{error:'Cadastro ainda não configurado'});return null;}const current=session(req);if(!current){send(res,401,{error:'Entre na sua conta novamente'});return null;}if(req.method!=='GET'&&(!originOK(req)||!equal(req.headers['x-csrf-token']||'',current.csrf))){send(res,403,{error:'Solicitação não autorizada'});return null;}return current;}
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
  if(url.pathname.startsWith('/api/admin/')){
    res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    if(url.pathname==='/api/admin/login'&&req.method==='POST'){
      if(!adminPassword||!sessionSecret||!totpSeed)return send(res,503,{error:'Acesso seguro ainda não configurado'});
      const ip=req.socket.remoteAddress||'unknown';
      if(throttle('login:'+ip,8,15*60_000))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
      if(!originOK(req))return send(res,403,{error:'Origem inválida'});
      const input=JSON.parse((await body(req,2048)).toString('utf8'));
      const incoming=scryptSync(String(input.password||'').slice(0,256),passwordSalt,64);
      if(!equal(input.username||'',adminUser)||!timingSafeEqual(incoming,passwordHash))return send(res,401,{error:'Dados de acesso inválidos'});
      const id=randomBytes(24).toString('hex');
      challenges.set(id,{expires:Date.now()+5*60_000,tries:0,ip});
      const secret=base32(totpSeed);
      return send(res,200,{challenge:id,...(!state.totpEnrolled?{setup:{secret,uri:`otpauth://totp/Seu%20Moura%20Im%C3%B3veis:gestor?secret=${secret}&issuer=Seu%20Moura%20Im%C3%B3veis&algorithm=SHA1&digits=6&period=30`}}:{})});
    }
    if(url.pathname==='/api/admin/verify'&&req.method==='POST'){
      if(!adminPassword||!sessionSecret||!totpSeed)return send(res,503,{error:'Acesso seguro ainda não configurado'});
      if(!originOK(req))return send(res,403,{error:'Origem inválida'});
      if(throttle('verify:'+(req.socket.remoteAddress||'unknown'),12,15*60_000))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
      const input=JSON.parse((await body(req,1024)).toString('utf8'));
      const challenge=challenges.get(String(input.challenge||''));
      if(!challenge||challenge.expires<Date.now()||challenge.ip!==req.socket.remoteAddress||++challenge.tries>5){challenges.delete(String(input.challenge||''));return send(res,401,{error:'Códigos expirados. Entre novamente.'});}
      const code=String(input.code||'').trim().toUpperCase();
      const step=codeStep(code);
      const recoveryIndex=state.totpEnrolled&&Array.isArray(state.recoveryHashes)?state.recoveryHashes.findIndex(hash=>equal(hash,recoveryHash(code))):-1;
      if(step===null&&recoveryIndex<0)return send(res,401,{error:'Código incorreto ou já utilizado'});
      if(!state.totpEnrolled&&step===null)return send(res,401,{error:'Configure o aplicativo autenticador antes de entrar'});
      if(step!==null)state.lastTotpStep=step;
      if(recoveryIndex>=0)state.recoveryHashes.splice(recoveryIndex,1);
      let recoveryCodes;
      if(!state.totpEnrolled){recoveryCodes=Array.from({length:8},()=>randomBytes(8).toString('hex').toUpperCase());state.recoveryHashes=recoveryCodes.map(recoveryHash);state.totpEnrolled=true;}
      await save();
      challenges.delete(input.challenge);attempts.delete('login:'+challenge.ip);
      const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
      sessions.set(createHmac('sha256',sessionSecret).update(token).digest('hex'),{csrf,expires:Date.now()+8*60*60_000});
      res.setHeader('Set-Cookie',`moura_session=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${secureCookie?'; Secure':''}`);
      return send(res,200,{csrf,...(recoveryCodes?{recoveryCodes}:{})});
    }
    const current=adminGuard(req,res);if(!current)return;
    if(req.method!=='GET'&&throttle('admin-write:'+(req.socket.remoteAddress||'unknown'),40,60_000))return send(res,429,{error:'Muitas alterações. Aguarde um minuto.'});
    if(url.pathname==='/api/admin/session'&&req.method==='GET')return send(res,200,{csrf:current.csrf});
    if(url.pathname==='/api/admin/logout'&&req.method==='POST'){
      const token=(req.headers.cookie||'').match(/moura_session=([a-f0-9]{64})/)?.[1];if(token)sessions.delete(createHmac('sha256',sessionSecret).update(token).digest('hex'));
      res.setHeader('Set-Cookie',`moura_session=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${secureCookie?'; Secure':''}`);return send(res,200,{ok:true});
    }
    if(url.pathname==='/api/admin/properties'&&req.method==='GET')return send(res,200,{properties:state.properties});
    if(url.pathname==='/api/admin/properties'&&req.method==='POST'){
      if(throttle('upload:'+(req.socket.remoteAddress||'unknown'),30,60_000))return send(res,429,{error:'Muitas solicitações. Aguarde um minuto.'});
      const input=JSON.parse((await body(req,16*1024*1024)).toString('utf8'));
      if(!input||typeof input!=='object'||!input.fields||typeof input.fields!=='object')return send(res,400,{error:'Dados inválidos'});
      const f={};for(const key of fields)f[key]=safeText(input.fields[key],key==='descricao'?1000:160);
      if(!['venda','aluguel'].includes(f.finalidade))return send(res,400,{error:'Finalidade inválida'});
      f.preco=Number(f.preco);if(!Number.isFinite(f.preco)||f.preco<=0||f.preco>1e10)return send(res,400,{error:'Preço inválido'});
      for(const key of ['quartos','banheiros','area']){if(f[key]===''){delete f[key];continue;}const n=Number(f[key]);if(!Number.isFinite(n)||n<0||n>100000)return send(res,400,{error:`${labels[key]} inválido`});f[key]=n;}
      if(missing(f).length)return send(res,400,{error:'Preencha os campos obrigatórios'});
      const id=typeof input.id==='string'&&/^[a-f0-9-]{8,36}$/.test(input.id)?input.id:null;
      const existing=id?state.properties.find(p=>p.id===id):null;if(id&&!existing)return send(res,404,{error:'Imóvel não encontrado'});
      const photos=Array.isArray(input.photos)?input.photos:[];
      if(photos.length>20||!photos.length&&!existing)return send(res,400,{error:'Envie de 1 a 20 fotos'});
      if((existing?.photos.length||0)+photos.length>20)return send(res,400,{error:'Limite de 20 fotos por imóvel'});
      const saved=[];
      for(const item of photos){if(typeof item!=='string'||item.length>14*1024*1024)return send(res,400,{error:'Foto inválida'});const match=item.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)throw Error('Envie JPG, PNG ou WebP');saved.push(await storePhoto(Buffer.from(match[2],'base64'),{jpeg:'jpg',png:'png',webp:'webp'}[match[1]]));}
      const item={id:existing?.id||randomUUID(),owner:existing?.owner||'admin',fields:f,photos:[...(existing?.photos||[]),...saved].slice(0,20),status:existing?.status||'published',updatedAt:new Date().toISOString()};
      if(existing)Object.assign(existing,item);else state.properties.push(item);
      await save();return send(res,200,{item});
    }
    if(url.pathname==='/api/admin/status'&&req.method==='POST'){
      const input=JSON.parse((await body(req,1024)).toString('utf8'));
      if(!['published','pausar','vendido','alugado'].includes(input.status))return send(res,400,{error:'Status inválido'});
      const item=state.properties.find(p=>p.id===input.id);if(!item)return send(res,404,{error:'Imóvel não encontrado'});
      item.status=input.status;item.updatedAt=new Date().toISOString();await save();return send(res,200,{ok:true});
    }
    return send(res,404,{error:'Não encontrado'});
  }
  if(url.pathname==='/webhooks/whatsapp'&&req.method==='GET'){if(!process.env.META_VERIFY_TOKEN)return send(res,503,{error:'Token de verificação ausente'});return url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===process.env.META_VERIFY_TOKEN?send(res,200,url.searchParams.get('hub.challenge')||'','text/plain'):send(res,403,{error:'Verificação inválida'});}
  if(url.pathname==='/webhooks/whatsapp'&&req.method==='POST')return await webhook(req,res);
  if(url.pathname==='/api/properties'&&req.method==='GET')return send(res,200,{properties:state.properties.filter(p=>p.status==='published').map(({id,fields,photos,updatedAt})=>({id,...fields,photos,updatedAt}))});
  if(url.pathname==='/api/demo'&&req.method==='POST'){if(!preview||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(res,404,{error:'Indisponível'});const input=JSON.parse((await body(req,14*1024*1024)).toString('utf8'));const sender='5594000000000';allowed.add(sender);let photo=null;if(input.photo){const match=String(input.photo).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/s);if(!match)throw Error('Imagem inválida');photo=await storePhoto(Buffer.from(match[2],'base64'),{jpeg:'jpg',png:'png',webp:'webp'}[match[1]]);}const response=await processMessage(sender,input.text||'',photo,randomUUID());return send(res,200,{reply:response,draft:state.drafts[sender]||null});}
  if(req.method!=='GET')return send(res,405,{error:'Método não permitido'});
  if(url.pathname==='/simulador.html'&&(!preview||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)))return send(res,404,{error:'Indisponível'});
  if(url.pathname==='/admin.html'||url.pathname==='/admin.js'){
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  }
  let filename;
  if(url.pathname.startsWith('/media/'))filename=path.join(mediaDir,path.basename(url.pathname));
  else {const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep)||filename.startsWith(dataDir+path.sep)||path.basename(filename).startsWith('.')||!['.html','.css','.js','.svg','.jpg','.jpeg','.png','.webp','.mov'].includes(path.extname(filename)))return send(res,404,{error:'Não encontrado'});}
  const file=await readFile(filename);res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(file);
}catch(error){console.error(error);send(res,error.code==='ENOENT'?404:400,{error:error.message||'Erro inesperado'});}}
const server=http.createServer((req,res)=>{queue=queue.then(()=>handler(req,res)).catch(console.error);});
server.listen(port,()=>console.log(`Seu Moura: http://localhost:${port}`));
