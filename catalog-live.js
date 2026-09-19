'use strict';
const grid=document.querySelector('#catalog-grid');
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function addProperty(property){
  const article=document.createElement('article');article.className='catalog-card property-item';article.id='imovel-'+property.id;
  article.dataset.propertyUrl='./imoveis.html#'+article.id;
  article.dataset.purpose=property.finalidade;
  article.dataset.location='outros';article.dataset.type=property.tipo.toLocaleLowerCase('pt-BR');article.dataset.bedrooms=String(property.quartos||0);
  const media=document.createElement('div');media.className='catalog-media';
  const img=document.createElement('img');img.src=property.photos[0];img.alt='Foto de '+property.titulo;img.loading='lazy';media.append(img);
  const badge=document.createElement('span');badge.className='catalog-badge';badge.textContent=property.finalidade==='aluguel'?'Para alugar':'À venda';media.append(badge);
  const body=document.createElement('div');body.className='catalog-card-body';
  const heading=document.createElement('div');const label=document.createElement('p');label.className='listing-type';label.textContent=property.finalidade==='aluguel'?'PARA ALUGAR':'À VENDA';
  const title=document.createElement('h2');title.textContent=property.titulo;
  const place=document.createElement('p');place.className='listing-location';place.textContent=[property.bairro,property.cidade].filter(Boolean).join(' · ');heading.append(label,title,place);
  if(property.descricao){const description=document.createElement('p');description.textContent=property.descricao;heading.append(description);}
  const specs=document.createElement('dl');specs.className='catalog-specs';for(const [key,value,suffix] of [['area',property.area,' m²'],['quartos',property.quartos,''],['banheiros',property.banheiros,'']]){if(value===undefined||value===null)continue;const spec=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent={area:'Área',quartos:'Quartos',banheiros:'Banheiros'}[key];dd.textContent=String(value)+suffix;spec.append(dt,dd);specs.append(spec);}
  const price=document.createElement('div');price.className='catalog-price';const caption=document.createElement('span');caption.textContent=property.finalidade==='aluguel'?'Aluguel mensal':'Valor de venda';const amount=document.createElement('strong');amount.textContent=BRL.format(property.preco);price.append(caption,amount);
  const link=document.createElement('a');link.className='button cream';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Tenho interesse ↗';link.href='https://wa.me/5594992972083?text='+encodeURIComponent(`Olá, Seu Moura! Tenho interesse em ${property.titulo}. Ver imóvel: ${location.href.split('#')[0]}#${article.id}`);
  body.append(heading,specs,price,link);article.append(media,body);
  if(property.photos.length>1){const gallery=document.createElement('div');gallery.className='live-gallery';for(const [i,src] of property.photos.entries()){const a=document.createElement('a');a.href=src;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`Foto ${i+1}`;gallery.append(a);}body.append(gallery);}
  grid.append(article);
}
if(grid){fetch('./api/properties').then(r=>r.ok?r.json():null).then(data=>{if(!data?.properties)return;for(const property of data.properties)addProperty(property);document.querySelector('#search')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}).catch(()=>{});}
