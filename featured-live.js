'use strict';
(()=>{
  const root=document.querySelector('#property.featured-live');
  if(!root)return;
  const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(value)||0);
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const absolutePhoto=path=>path&&path.startsWith('http')?path:path||'./assets/house.webp';
  fetch('/api/properties',{headers:{Accept:'application/json'}})
    .then(response=>{if(!response.ok)throw new Error('Falha ao carregar');return response.json();})
    .then(data=>{
      const item=Array.isArray(data)?data[0]:data.properties?.[0];
      if(!item){root.innerHTML='<p class="featured-empty">Nenhum imóvel publicado no momento.</p>';return;}
      const photos=(item.photos||[]).filter(Boolean);
      if(!photos.length)photos.push('./assets/house.webp');
      const detail='./imovel.html?id='+encodeURIComponent(item.id);
      const purpose=String(item.finalidade||'venda').toLowerCase()==='aluguel'?'PARA ALUGAR':'À VENDA';
      const priceLabel=String(item.finalidade||'venda').toLowerCase()==='aluguel'?'ALUGUEL MENSAL':'VALOR DE VENDA';
      const propertyLocation=[item.bairro,item.cidade].filter(Boolean).join(' · ');
      const message='Olá, Seu Moura! Tenho interesse no imóvel '+(item.titulo||'anunciado')+', anunciado por '+money(item.preco)+'. Gostaria de saber mais.';
      root.innerHTML=`
        <div class="featured-card">
          <div class="featured-media">
            <a class="featured-cover" href="${detail}" aria-label="Ver imóvel completo"><img src="${escape(absolutePhoto(photos[0]))}" alt="${escape(item.titulo||'Imóvel em destaque')}" loading="lazy"></a>
            ${photos.length>1?'<button class="catalog-arrow catalog-arrow-prev" type="button" aria-label="Foto anterior">‹</button><button class="catalog-arrow catalog-arrow-next" type="button" aria-label="Próxima foto">›</button>':''}
            <span class="catalog-photo-counter">1/${photos.length}</span>
          </div>
          <div class="featured-info">
            <p class="listing-type">${purpose}</p>
            <h3><a href="${detail}">${escape(item.titulo||'Imóvel em destaque')}</a></h3>
            <p class="listing-location">${escape(propertyLocation)}</p>
            <div class="catalog-price"><span>${priceLabel}</span><strong>${money(item.preco)}</strong></div>
            <div class="featured-actions">
              <a class="button catalog-details-button" href="${detail}">Ver imóvel completo <span aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span></a>
              <a class="button cream" href="https://wa.me/5594992972083?text=${encodeURIComponent(message+'\\n\\nVer imóvel: '+new URL(detail,window.location.href).href)}" target="_blank" rel="noopener">Tenho interesse <span aria-hidden="true"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 7l-10 10"/><path d="M8 7h9v9"/></svg></span></a>
            </div>
            <p class="fine">Valor e disponibilidade sujeitos à confirmação.</p>
          </div>
        </div>`;
      let current=0;
      const image=root.querySelector('.featured-media img');
      const counter=root.querySelector('.catalog-photo-counter');
      const show=index=>{current=(index+photos.length)%photos.length;image.src=absolutePhoto(photos[current]);counter.textContent=(current+1)+'/'+photos.length;};
      root.querySelector('.catalog-arrow-prev')?.addEventListener('click',()=>show(current-1));
      root.querySelector('.catalog-arrow-next')?.addEventListener('click',()=>show(current+1));
    })
    .catch(()=>{root.innerHTML='<p class="featured-empty">Não foi possível carregar o imóvel em destaque. <a href="./imoveis.html">Veja o catálogo completo.</a></p>';});
})();
