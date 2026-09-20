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
  const gallery=element('div','detail-gallery');for(const [i,src] of p.photos.entries()){const link=document.createElement('a');link.href=src;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label',`Abrir foto ${i+1} do imóvel`);const img=document.createElement('img');img.src=src;img.alt=`${p.titulo}, foto ${i+1}`;img.loading=i?'lazy':'eager';link.append(img);gallery.append(link);}left.append(gallery);
  const specs=element('dl','detail-specs');for(const [label,value,suffix] of [['Área',p.area,' m²'],['Quartos',p.quartos,''],['Banheiros',p.banheiros,'']]){if(value===undefined||value===null||value==='')continue;const item=document.createElement('div');item.append(element('dt','',label),element('dd','',String(value)+suffix));specs.append(item);}right.append(specs);
  const price=element('div','catalog-price');price.append(element('span','',p.finalidade==='aluguel'?'Aluguel mensal':'Valor de venda'),element('strong','',money.format(p.preco)));right.append(price);
  const contact=element('a','button cream','Tenho interesse ↗');contact.href='https://wa.me/5594992972083?text='+encodeURIComponent(`Olá, Seu Moura! Tenho interesse em ${p.titulo}. Ver imóvel: ${location.href}`);contact.target='_blank';contact.rel='noopener noreferrer';right.append(contact);layout.append(left,right);
  root.append(header,layout);
  if(p.descricao?.trim()){const section=element('section','detail-description');section.append(element('h2','','Sobre este imóvel'),element('p','',p.descricao));root.append(section);}
  root.append(element('p','catalog-note','Valores e disponibilidade sujeitos à confirmação com a equipe da Seu Moura.'));
}
if(!id||!/^[a-f0-9-]{8,36}$/.test(id)){root.textContent='Imóvel não encontrado.';}else fetch('./api/properties',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Falha ao consultar imóveis');return r.json();}).then(data=>{const p=data.properties?.find(item=>item.id===id);if(!p){root.textContent='Este imóvel não está disponível.';return;}render(p);}).catch(()=>{root.textContent='Não foi possível carregar o imóvel. Tente novamente.';});
