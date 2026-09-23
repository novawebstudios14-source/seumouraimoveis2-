'use strict';
const root=document.querySelector('#detail-content');
const id=new URLSearchParams(location.search).get('id');
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function render(p){
  document.title=`${p.titulo} | Seu Moura Imóveis`;
  root.replaceChildren();root.removeAttribute('role');
  const header=element('div','detail-heading');header.append(element('p','listing-type',p.finalidade==='aluguel'?'PARA ALUGAR':'À VENDA'),element('h1','',p.titulo),element('p','listing-location',[p.bairro,p.cidade].filter(Boolean).join(' · ')));
  const layout=element('div','detail-layout'),left=element('div','detail-main'),right=element('aside','detail-aside');
  const gallery=element('section','detail-gallery');
  const stage=element('div','detail-gallery-stage'),openPhoto=element('button','detail-gallery-open'),mainImage=document.createElement('img'),counter=element('span','detail-gallery-counter'),thumbs=element('div','detail-thumbnails');
  let currentPhoto=0,lightboxIndex=0,touchStartX=0,touchStartY=0,lastFocused=null;
  openPhoto.type='button';openPhoto.setAttribute('aria-label','Ampliar foto');mainImage.loading='eager';openPhoto.append(mainImage);stage.append(openPhoto);
  const lightbox=element('div','detail-lightbox');lightbox.hidden=true;lightbox.setAttribute('role','dialog');lightbox.setAttribute('aria-modal','true');lightbox.setAttribute('aria-label','Galeria de fotos ampliada');
  const lightboxImage=document.createElement('img'),lightboxCounter=element('span','detail-lightbox-counter');
  const closeLightbox=element('button','detail-lightbox-close'),previousLightbox=element('button','detail-lightbox-arrow detail-lightbox-prev'),nextLightbox=element('button','detail-lightbox-arrow detail-lightbox-next');
  for(const button of [closeLightbox,previousLightbox,nextLightbox])button.type='button';
  closeLightbox.setAttribute('aria-label','Fechar galeria');previousLightbox.setAttribute('aria-label','Foto anterior');nextLightbox.setAttribute('aria-label','Próxima foto');
  closeLightbox.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg>';
  previousLightbox.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  nextLightbox.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  lightbox.append(closeLightbox,previousLightbox,lightboxImage,nextLightbox,lightboxCounter);document.body.append(lightbox);
  const thumbButtons=[];
  const showPhoto=index=>{currentPhoto=(index+p.photos.length)%p.photos.length;mainImage.src=p.photos[currentPhoto];mainImage.alt=`${p.titulo}, foto ${currentPhoto+1}`;counter.textContent=`${currentPhoto+1} de ${p.photos.length}`;thumbButtons.forEach((button,i)=>button.classList.toggle('active',i===currentPhoto));};
  const showLightboxPhoto=index=>{lightboxIndex=(index+p.photos.length)%p.photos.length;lightboxImage.src=p.photos[lightboxIndex];lightboxImage.alt=`${p.titulo}, foto ampliada ${lightboxIndex+1}`;lightboxCounter.textContent=`${lightboxIndex+1} de ${p.photos.length}`;};
  const openLightbox=()=>{lastFocused=document.activeElement;showLightboxPhoto(currentPhoto);lightbox.hidden=false;document.body.classList.add('lightbox-open');closeLightbox.focus();};
  const hideLightbox=()=>{lightbox.hidden=true;document.body.classList.remove('lightbox-open');lastFocused?.focus?.();};
  openPhoto.onclick=openLightbox;closeLightbox.onclick=hideLightbox;previousLightbox.onclick=()=>showLightboxPhoto(lightboxIndex-1);nextLightbox.onclick=()=>showLightboxPhoto(lightboxIndex+1);
  lightbox.addEventListener('click',event=>{if(event.target===lightbox)hideLightbox();});
  lightbox.addEventListener('touchstart',event=>{const touch=event.changedTouches[0];touchStartX=touch.clientX;touchStartY=touch.clientY;},{passive:true});
  lightbox.addEventListener('touchend',event=>{const touch=event.changedTouches[0],dx=touch.clientX-touchStartX,dy=touch.clientY-touchStartY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)showLightboxPhoto(lightboxIndex+(dx<0?1:-1));},{passive:true});
  document.addEventListener('keydown',event=>{if(lightbox.hidden)return;if(event.key==='Escape')hideLightbox();if(event.key==='ArrowLeft')showLightboxPhoto(lightboxIndex-1);if(event.key==='ArrowRight')showLightboxPhoto(lightboxIndex+1);});
  if(p.photos.length>1){const previous=element('button','detail-gallery-arrow detail-gallery-prev','‹'),next=element('button','detail-gallery-arrow detail-gallery-next','›');previous.type=next.type='button';previous.setAttribute('aria-label','Foto anterior');next.setAttribute('aria-label','Próxima foto');previous.onclick=()=>showPhoto(currentPhoto-1);next.onclick=()=>showPhoto(currentPhoto+1);stage.append(previous,next,counter);}else{previousLightbox.hidden=true;nextLightbox.hidden=true;}
  for(const [i,src] of p.photos.entries()){const button=document.createElement('button'),thumb=document.createElement('img');button.type='button';button.className='detail-thumbnail';button.setAttribute('aria-label',`Mostrar foto ${i+1}`);thumb.src=src;thumb.alt='';thumb.loading=i?'lazy':'eager';button.append(thumb);button.onclick=()=>showPhoto(i);thumbButtons.push(button);thumbs.append(button);}
  gallery.append(stage,thumbs);left.append(gallery);showPhoto(0);
  const specs=element('dl','detail-specs');for(const [label,value,suffix] of [['Área',p.area,' m²'],['Quartos',p.quartos,''],['Banheiros',p.banheiros,'']]){if(value===undefined||value===null||value==='')continue;const item=document.createElement('div');item.append(element('dt','',label),element('dd','',String(value)+suffix));specs.append(item);}right.append(specs);
  const price=element('div','catalog-price');price.append(element('span','',p.finalidade==='aluguel'?'Aluguel mensal':'Valor de venda'),element('strong','',money.format(p.preco)));right.append(price);
  const share=element('button','button detail-share');share.type='button';share.innerHTML='Compartilhar imóvel <span aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.9 7.4-4.7M8.3 13.1l7.4 4.7"/></svg></span>';share.setAttribute('aria-label','Compartilhar '+p.titulo);
  const shareData={title:p.titulo,text:`Olha o que achei na Seu Moura Imóveis: ${p.titulo}`,url:location.href};
  share.onclick=async()=>{try{if(navigator.share){await navigator.share(shareData);return;}if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(location.href);else{const field=document.createElement('textarea');field.value=location.href;field.style.position='fixed';field.style.opacity='0';document.body.append(field);field.select();document.execCommand('copy');field.remove();}share.innerHTML='Link copiado <span aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span>';setTimeout(()=>{share.innerHTML='Compartilhar imóvel <span aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.9 7.4-4.7M8.3 13.1l7.4 4.7"/></svg></span>';},2200);}catch(error){if(error.name!=='AbortError'){share.textContent='Não foi possível compartilhar';setTimeout(()=>{share.textContent='Compartilhar imóvel';},2200);}}};right.append(share);
  const contact=element('a','button cream detail-floating-cta');contact.innerHTML='Tenho interesse <span aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 7l-10 10"/><path d="M8 7h9v9"/></svg></span>';contact.href='https://wa.me/5594992972083?text='+encodeURIComponent(`Olá, Seu Moura! Tenho interesse em ${p.titulo}. Ver imóvel: ${location.href}`);contact.target='_blank';contact.rel='noopener noreferrer';contact.setAttribute('aria-label','Falar no WhatsApp sobre '+p.titulo);layout.append(left,right);
  root.append(header,layout,contact);
  if(p.descricao?.trim()){const section=element('section','detail-description');section.append(element('h2','','Sobre este imóvel'),element('p','',p.descricao));root.append(section);}
  root.append(element('p','catalog-note','Valores e disponibilidade sujeitos à confirmação com a equipe da Seu Moura.'));
}
if(!id||!/^[a-f0-9-]{8,36}$/.test(id)){root.textContent='Imóvel não encontrado.';}else fetch('./api/properties',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Falha ao consultar imóveis');return r.json();}).then(data=>{const p=data.properties?.find(item=>item.id===id);if(!p){root.textContent='Este imóvel não está disponível.';return;}render(p);}).catch(()=>{root.textContent='Não foi possível carregar o imóvel. Tente novamente.';});
