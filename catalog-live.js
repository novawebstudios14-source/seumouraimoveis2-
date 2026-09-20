'use strict';
const grid=document.querySelector('#catalog-grid');
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function addProperty(property){
  const article=document.createElement('article');article.className='catalog-card property-item';article.id='imovel-'+property.id;
  const detailUrl='./imovel.html?id='+encodeURIComponent(property.id);
  article.dataset.propertyUrl=detailUrl;
  article.dataset.purpose=property.finalidade;
  article.dataset.location='outros';article.dataset.type=property.tipo.toLocaleLowerCase('pt-BR');article.dataset.bedrooms=String(property.quartos||0);
  const media=document.createElement('div');media.className='catalog-media';
  const cover=document.createElement('a');cover.href=detailUrl;cover.setAttribute('aria-label','Ver detalhes de '+property.titulo);cover.className='catalog-cover-link';const img=document.createElement('img');img.src=property.photos[0];img.alt='Foto 1 de '+property.titulo;img.loading='lazy';cover.append(img);media.append(cover);
  if(property.photos.length>1){let photoIndex=0;const changePhoto=step=>{photoIndex=(photoIndex+step+property.photos.length)%property.photos.length;img.src=property.photos[photoIndex];img.alt=`Foto ${photoIndex+1} de ${property.titulo}`;counter.textContent=`${photoIndex+1}/${property.photos.length}`;};const previous=document.createElement('button'),next=document.createElement('button'),counter=document.createElement('span');previous.type=next.type='button';previous.className='catalog-arrow catalog-arrow-prev';next.className='catalog-arrow catalog-arrow-next';counter.className='catalog-photo-counter';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Foto anterior de '+property.titulo);next.setAttribute('aria-label','Próxima foto de '+property.titulo);counter.textContent=`1/${property.photos.length}`;previous.onclick=event=>{event.preventDefault();event.stopPropagation();changePhoto(-1);};next.onclick=event=>{event.preventDefault();event.stopPropagation();changePhoto(1);};media.append(previous,next,counter);}
  const badge=document.createElement('span');badge.className='catalog-badge';badge.textContent=property.finalidade==='aluguel'?'Para alugar':'À venda';media.append(badge);
  const body=document.createElement('div');body.className='catalog-card-body';
  const heading=document.createElement('div');const label=document.createElement('p');label.className='listing-type';label.textContent=property.finalidade==='aluguel'?'PARA ALUGAR':'À VENDA';
  const title=document.createElement('h2');const titleLink=document.createElement('a');titleLink.href=detailUrl;titleLink.textContent=property.titulo;title.append(titleLink);
  const place=document.createElement('p');place.className='listing-location';place.textContent=[property.bairro,property.cidade].filter(Boolean).join(' · ');heading.append(label,title,place);
  const price=document.createElement('div');price.className='catalog-price';const caption=document.createElement('span');caption.textContent=property.finalidade==='aluguel'?'Aluguel mensal':'Valor de venda';const amount=document.createElement('strong');amount.textContent=BRL.format(property.preco);price.append(caption,amount);
  const link=document.createElement('a');link.className='button cream';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Tenho interesse ↗';link.href='https://wa.me/5594992972083?text='+encodeURIComponent(`Olá, Seu Moura! Tenho interesse em ${property.titulo}. Ver imóvel: ${location.href.split('#')[0]}#${article.id}`);
  const details=document.createElement('a');details.href=detailUrl;details.className='button catalog-details-button';details.textContent='Ver imóvel completo →';
  body.append(heading,price,details,link);article.append(media,body);
  grid.append(article);
}
if(grid){fetch('./api/properties',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(!data?.properties)return;grid.replaceChildren();for(const property of data.properties)addProperty(property);document.querySelector('#search')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}).catch(()=>{});}
