'use strict';
let csrf='',properties=[],editing=null,selectedPhotos=[],existingPhotos=[],removedPhotos=[];
const $=id=>document.getElementById(id),notice=$('notice');
let noticeTimer;
function clearMessage(){clearTimeout(noticeTimer);notice.textContent='';notice.className='';}
function message(text,bad=false){
  clearTimeout(noticeTimer);
  notice.textContent=text;
  notice.className=bad?'error':'ok';
  noticeTimer=setTimeout(clearMessage,bad?5500:3500);
}
function updatePublishState(){
  const form=$('property-form'),save=$('save'),hint=$('publish-hint');
  if(!form||!save)return;
  const photosReady=existingPhotos.length+selectedPhotos.length>0;
  const complete=form.checkValidity()&&photosReady;
  save.disabled=!complete;
  if(hint)hint.textContent=complete?'Tudo preenchido. O imóvel está pronto para publicar.':'Preencha todos os campos obrigatórios e adicione ao menos uma foto.';
}
async function api(route,options={}){const response=await fetch('/api/admin/'+route,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...options.headers}});const result=await response.json();if(!response.ok)throw Error(result.error||'Erro de conexão');return result;}
function show(logged){$('login').classList.toggle('hidden',logged);$('workspace').classList.toggle('hidden',!logged);}
async function loadAiConfig(){}
async function load(){const data=await api('properties');properties=data.properties;const list=$('list');list.replaceChildren();if(!properties.length){list.textContent='Nenhum imóvel cadastrado ainda.';return;}for(const p of properties){const row=document.createElement('div');row.className='item';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=p.fields.titulo;const meta=document.createElement('small');meta.className='muted';meta.textContent=`${p.fields.bairro} · ${p.photos.length} foto(s) · ${p.status==='published'?'Publicado':p.status}`;info.append(title,meta);const actions=document.createElement('div');actions.className='actions';const edit=document.createElement('button');edit.className='secondary';edit.textContent='Editar';edit.onclick=()=>editProperty(p);const toggle=document.createElement('button');toggle.className='secondary';toggle.textContent=p.status==='published'?'Pausar':'Publicar';toggle.onclick=async()=>{try{await api('status',{method:'POST',body:JSON.stringify({id:p.id,status:p.status==='published'?'pausar':'published'})});await load();}catch(e){message(e.message,true);}};actions.append(edit,toggle);row.append(info,actions);list.append(row);}}
function formatPriceValue(value){const raw=String(value??'').replace(/[^\d,]/g,'');if(!raw)return '';const comma=raw.indexOf(',');let integer=(comma<0?raw:raw.slice(0,comma)).replace(/^0+(?=\d)/,'')||'0';const decimals=comma<0?'':raw.slice(comma+1).replace(/\D/g,'').slice(0,2);integer=integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.');return integer+(comma>=0?','+decimals:'');}
function editProperty(p){editing=p.id;selectedPhotos=[];existingPhotos=[...p.photos];removedPhotos=[];for(const [k,v] of Object.entries(p.fields)){const field=$('property-form').elements[k];if(field)field.value=k==='preco'?formatPriceValue(v):v;}$('form-heading').textContent='Editar imóvel';$('save').textContent='Salvar alterações';$('cancel').classList.remove('hidden');renderPhotos();updatePublishState();scrollTo({top:0,behavior:'smooth'});}
function reset(){editing=null;selectedPhotos=[];existingPhotos=[];removedPhotos=[];$('property-form').reset();$('form-heading').textContent='Novo imóvel';$('save').textContent='Publicar imóvel';$('cancel').classList.add('hidden');renderPhotos();$('description-source').textContent='';updatePublishState();}
async function resize(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Cada foto deve ser JPG, PNG ou WebP com até 10 MB.');const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78);}finally{bitmap.close();}}
function renderPhotos(){const box=$('preview');box.replaceChildren();const entries=[...existingPhotos.map(src=>({src,existing:true})),...selectedPhotos.map(file=>({file,existing:false}))];$('upload-count').textContent=entries.length?`${entries.length} de 20 fotos selecionadas${editing?' (incluindo as já publicadas)':''}`:'Nenhuma foto selecionada';for(const entry of entries){const tile=document.createElement('div');tile.className='photo-tile';const img=document.createElement('img');img.alt=entry.existing?'Foto já publicada':entry.file.name;if(entry.existing)img.src='/api/admin/media/'+encodeURIComponent(entry.src.split('/').pop());else{img.src=URL.createObjectURL(entry.file);img.onload=()=>URL.revokeObjectURL(img.src);}const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Remover ${entry.existing?'foto publicada':entry.file.name}`);remove.onclick=()=>{if(entry.existing){existingPhotos=existingPhotos.filter(src=>src!==entry.src);removedPhotos.push(entry.src);}else selectedPhotos=selectedPhotos.filter(file=>file!==entry.file);renderPhotos();};tile.append(img,remove);box.append(tile);}updatePublishState();}
function addPhotos(files){const images=Array.from(files);if(images.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){message('Cada foto deve ser JPG, PNG ou WebP com até 10 MB.',true);return;}if(images.length+existingPhotos.length+selectedPhotos.length>20){message('O limite é de 20 fotos por imóvel.',true);return;}selectedPhotos.push(...images);renderPhotos();updatePublishState();}
$('photos').onchange=e=>{addPhotos(e.target.files);e.target.value='';};
const zone=$('upload-zone');for(const name of ['dragenter','dragover'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.add('dragging');});for(const name of ['dragleave','drop'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.remove('dragging');});zone.addEventListener('drop',e=>{if(e.dataTransfer?.files.length)addPhotos(e.dataTransfer.files);});
$('login-form').onsubmit=async e=>{e.preventDefault();try{const result=await api('login',{method:'POST',body:JSON.stringify({username:$('user').value,password:$('password').value})});csrf=result.csrf;$('password').value='';show(true);await load();await loadAiConfig();message('Acesso autorizado.');}catch(error){message(error.message,true);}};
let pendingFields=null,confirmObjectUrls=[];
function cleanDescription(value){return String(value||'').normalize('NFC').replace(/[\u00AD\u200B-\u200D\u2060\uFEFF]/g,'').replace(/[ \t]+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();}
function priceForReview(value){const text=String(value||'').trim().replace(/\s|R\$/gi,'');const clean=text.includes(',')?text.replace(/\./g,'').replace(',','.'):text.replace(/\./g,'');const number=Number(clean);return Number.isFinite(number)?number.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}):String(value||'');}
function closeConfirmation(){$('confirm-dialog').close();}
function openConfirmation(fields){
  pendingFields={...fields,descricao:cleanDescription(fields.descricao)};
  const items=[
    ['Título',pendingFields.titulo],['Finalidade',pendingFields.finalidade==='aluguel'?'Aluguel':'Venda'],
    ['Tipo',pendingFields.tipo],['Bairro',pendingFields.bairro],['Cidade',pendingFields.cidade],
    ['Preço',priceForReview(pendingFields.preco)],['Quartos',pendingFields.quartos],['Banheiros',pendingFields.banheiros],
    ['Área',pendingFields.area?pendingFields.area+' m²':''],['Diferenciais',pendingFields.detalhes,'wide'],
    ['Descrição',pendingFields.descricao,'wide']
  ].filter(([,value])=>String(value||'').trim());
  const summary=$('confirm-summary');summary.replaceChildren();
  for(const [label,value,wide] of items){const item=document.createElement('div');item.className='confirm-item'+(wide?' wide':'');const name=document.createElement('span');name.className='confirm-label';name.textContent=label;const content=document.createElement('p');content.className='confirm-value';content.textContent=value;item.append(name,content);summary.append(item);}
  confirmObjectUrls.forEach(URL.revokeObjectURL);confirmObjectUrls=[];
  const photos=$('confirm-photo-list');photos.replaceChildren();
  const photoEntries=[...existingPhotos.map(src=>({src:'/api/admin/media/'+encodeURIComponent(src.split('/').pop()),alt:'Foto já publicada'})),...selectedPhotos.map(file=>{const src=URL.createObjectURL(file);confirmObjectUrls.push(src);return {src,alt:file.name};})];
  $('confirm-photo-title').textContent=`Fotos (${photoEntries.length})`;
  for(const photo of photoEntries){const img=document.createElement('img');img.src=photo.src;img.alt=photo.alt;photos.append(img);}
  $('confirm-title').textContent=editing?'Revisar alterações':'Revisar imóvel';
  $('confirm-publish').textContent=editing?'Confirmar alterações':'Confirmar publicação';
  $('confirm-dialog').showModal();
}
$('confirm-close').onclick=closeConfirmation;
$('confirm-edit').onclick=closeConfirmation;
$('confirm-dialog').addEventListener('close',()=>{confirmObjectUrls.forEach(URL.revokeObjectURL);confirmObjectUrls=[];});
$('property-form').onsubmit=e=>{e.preventDefault();if(!existingPhotos.length&&!selectedPhotos.length){message('Adicione ao menos uma foto.',true);return;}clearMessage();openConfirmation(Object.fromEntries(new FormData(e.target).entries()));};
$('confirm-publish').onclick=async()=>{if(!pendingFields)return;const button=$('confirm-publish');button.disabled=true;message('Preparando fotos...');try{const photos=[];for(const file of selectedPhotos)photos.push(await resize(file));if(JSON.stringify(photos).length>15*1024*1024)throw Error('Fotos muito grandes; selecione menos fotos.');await api('properties',{method:'POST',body:JSON.stringify({id:editing,fields:pendingFields,photos,removePhotos:removedPhotos})});closeConfirmation();reset();await load();message('Imóvel salvo e catálogo atualizado.');}catch(error){message(error.message,true);}finally{button.disabled=false;updatePublishState();}};
$('generate-description').onclick=async()=>{if($('descricao').value.trim()&&!confirm('Substituir a descrição atual pelo texto gerado?'))return;const button=$('generate-description');button.disabled=true;$('description-source').textContent='Gerando descrição...';try{const fields=Object.fromEntries(new FormData($('property-form')).entries());const result=await api('description',{method:'POST',body:JSON.stringify({fields})});$('descricao').value=cleanDescription(result.description);updatePublishState();$('description-source').textContent='Descrição gerada.';message('Descrição gerada.');}catch(error){$('description-source').textContent='';message(error.message,true);}finally{button.disabled=false;}};
$('cancel').onclick=reset;
$('logout').onclick=async()=>{try{await api('logout',{method:'POST',body:'{}'});}finally{csrf='';clearMessage();reset();show(false);}};
$('preco').addEventListener('input',event=>{const formatted=formatPriceValue(event.target.value);if(event.target.value!==formatted)event.target.value=formatted;});
$('preco').addEventListener('blur',event=>{event.target.value=formatPriceValue(event.target.value).replace(/,$/,'');});
$('property-form').addEventListener('input',updatePublishState);
$('property-form').addEventListener('change',updatePublishState);
updatePublishState();
function finishAdminLoading(){
  const state=window.mouraLoading;
  const loader=document.getElementById('moura-loader');
  if(!state||!loader||!document.documentElement.classList.contains('moura-loading'))return;
  const logo=loader.querySelector('.moura-loader__original');
  const reveal=logo?.getAnimations?.().find(animation=>animation.animationName==='moura-brand');
  const brandReady=reveal?reveal.finished.catch(()=>{}):new Promise(resolve=>setTimeout(resolve,1900));
  brandReady.then(()=>setTimeout(()=>{
    if(!document.documentElement.classList.contains('moura-loading'))return;
    loader.classList.add('is-leaving');
    setTimeout(()=>{clearTimeout(state.timer);state.release();},720);
  },300));
}
api('session').then(async data=>{csrf=data.csrf;show(true);await load();await loadAiConfig();}).catch(()=>{clearMessage();show(false);}).finally(finishAdminLoading);
