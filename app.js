'use strict';
const $=selector=>document.querySelector(selector);
const header=$('.header'),menu=$('.menu'),nav=$('#navigation');
const hero=$('.hero');

if(header){
  if(hero&&'IntersectionObserver' in window){
    const observer=new IntersectionObserver(([entry])=>header.classList.toggle('scrolled',!entry.isIntersecting),{rootMargin:'-80px 0px 0px 0px'});
    observer.observe(hero);
  }else{
    header.classList.add('scrolled');
  }
}

function closeMenu(){
  if(!nav||!menu)return;
  nav.classList.remove('open');
  menu.setAttribute('aria-expanded','false');
  menu.setAttribute('aria-label','Abrir menu');
}

if(menu&&nav){
  menu.addEventListener('click',()=>{
    const open=nav.classList.toggle('open');
    menu.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
  });
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
}

const whatsapp=message=>'https://wa.me/5594992972083?text='+encodeURIComponent(message||'Olá! Gostaria de falar com a Seu Moura.');
document.querySelectorAll('.whatsapp').forEach(link=>{
  let message=link.dataset.message;
  const propertyUrl=link.closest('[data-property-url]')?.dataset.propertyUrl;
  if(propertyUrl)message+=`\n\nVer imóvel: ${new URL(propertyUrl,window.location.href).href}`;
  link.href=whatsapp(message);
});
if($('#year'))$('#year').textContent=new Date().getFullYear();

const ownerForm=$('#owner-form');
if(ownerForm){
  ownerForm.addEventListener('submit',event=>{
    event.preventDefault();
    const name=$('#name').value.trim(),city=$('#city').value.trim();
    if(!name||!city)return;
    const message=`Olá, Seu Moura! Meu nome é ${name}. Quero anunciar um imóvel.\nObjetivo: ${$('#owner-purpose').value}\nTipo: ${$('#owner-type').value}\nCidade: ${city}\nPodemos conversar?`;
    window.open(whatsapp(message),'_blank','noopener,noreferrer');
  });
}

const search=$('#search');
if(search){
  const controls=['purpose','location','type','bedrooms'].map(id=>$('#'+id)).filter(Boolean);
  const count=$('#result-count'),empty=$('#empty'),clear=$('#clear');
  const matches=(item,key,value)=>value==='all'||item.dataset[key].split(' ').includes(value);
  const filter=()=>{
    const values=Object.fromEntries(controls.map(control=>[control.id,control.value]));
    let visible=0;
    document.querySelectorAll('.property-item').forEach(item=>{
      const roomMatch=values.bedrooms==='all'||Number(item.dataset.bedrooms)>=Number(values.bedrooms);
      const match=matches(item,'purpose',values.purpose)&&matches(item,'location',values.location)&&matches(item,'type',values.type)&&roomMatch;
      item.hidden=!match;
      if(match)visible+=1;
    });
    if(empty)empty.hidden=visible>0;
    if(count)count.textContent=visible===0?'Nenhum imóvel encontrado':`${visible} ${visible===1?'imóvel encontrado':'imóveis encontrados'}`;
    if(clear)clear.hidden=controls.every(control=>control.value==='all');
  };
  search.addEventListener('submit',event=>{event.preventDefault();filter();});
  controls.forEach(control=>control.addEventListener('change',filter));
  if(clear)clear.addEventListener('click',()=>{search.reset();filter();});
  filter();
}

const dialog=$('#property-dialog');
if(dialog){
  let previousFocus,currentPhoto=0;
  const photos=[['house.webp','Fachada da casa no Condomínio Ipiranga'],['living.webp','Ambiente interno do imóvel'],['interior.webp','Detalhes dos ambientes do imóvel'],['detail.webp','Interior da residência'],['room.webp','Ambiente da casa no Condomínio Ipiranga']];
  const showPhoto=index=>{
    currentPhoto=(index+photos.length)%photos.length;
    $('#gallery-image').src='./assets/'+photos[currentPhoto][0];
    $('#gallery-image').alt=photos[currentPhoto][1];
    $('#gallery-count').textContent=`${currentPhoto+1} / ${photos.length}`;
  };
  document.querySelectorAll('.open-property').forEach(button=>button.addEventListener('click',()=>{
    previousFocus=button;showPhoto(0);dialog.showModal();document.body.classList.add('modal-open');
  }));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}
  });
  dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');previousFocus?.focus();});
  $('#previous').addEventListener('click',()=>showPhoto(currentPhoto-1));
  $('#next').addEventListener('click',()=>showPhoto(currentPhoto+1));
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight')showPhoto(currentPhoto+1);if(event.key==='ArrowLeft')showPhoto(currentPhoto-1);});
}


const founderVideo=document.querySelector('.founder-video video');
const founderPlayer=document.querySelector('.founder-video');
const founderPlay=document.querySelector('.founder-play');
const videoToggle=document.querySelector('.video-toggle');
const videoTime=document.querySelector('.video-time');
const videoProgress=document.querySelector('.video-progress');
const videoMute=document.querySelector('.video-mute');
const videoVolume=document.querySelector('.video-volume');
const videoFullscreen=document.querySelector('.video-fullscreen');
if(founderVideo&&founderPlay&&founderPlayer){
  const formatTime=value=>{
    const seconds=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
    return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  };
  const toggleVideo=()=>{
    if(founderVideo.paused||founderVideo.ended)founderVideo.play();
    else founderVideo.pause();
  };
  const updateFounderPlayer=()=>{
    const playing=!founderVideo.paused&&!founderVideo.ended;
    founderPlay.classList.toggle('is-hidden',playing);
    founderPlay.setAttribute('aria-label',playing?'Pausar vídeo':'Reproduzir vídeo');
    if(videoToggle){
      videoToggle.textContent=playing?'❚❚':'▶';
      videoToggle.setAttribute('aria-label',playing?'Pausar':'Reproduzir');
    }
    if(videoTime)videoTime.textContent=formatTime(founderVideo.currentTime)+' / '+formatTime(founderVideo.duration);
    if(videoProgress){
      const progress=founderVideo.duration?(founderVideo.currentTime/founderVideo.duration)*100:0;
      videoProgress.value=String(progress);
      videoProgress.style.setProperty('--video-progress',progress+'%');
    }
    if(videoMute){
      videoMute.textContent=founderVideo.muted||founderVideo.volume===0?'🔇':'🔊';
      videoMute.setAttribute('aria-label',founderVideo.muted?'Ativar som':'Silenciar');
    }
  };
  founderPlay.addEventListener('click',toggleVideo);
  videoToggle?.addEventListener('click',toggleVideo);
  founderVideo.addEventListener('click',toggleVideo);
  founderVideo.addEventListener('play',updateFounderPlayer);
  founderVideo.addEventListener('pause',updateFounderPlayer);
  founderVideo.addEventListener('ended',updateFounderPlayer);
  founderVideo.addEventListener('timeupdate',updateFounderPlayer);
  founderVideo.addEventListener('loadedmetadata',updateFounderPlayer);
  founderVideo.addEventListener('volumechange',updateFounderPlayer);
  videoProgress?.addEventListener('input',()=>{
    if(founderVideo.duration)founderVideo.currentTime=(Number(videoProgress.value)/100)*founderVideo.duration;
  });
  videoMute?.addEventListener('click',()=>{founderVideo.muted=!founderVideo.muted;});
  videoVolume?.addEventListener('input',()=>{
    founderVideo.volume=Number(videoVolume.value);
    founderVideo.muted=founderVideo.volume===0;
  });
  videoFullscreen?.addEventListener('click',()=>{
    if(document.fullscreenElement)document.exitFullscreen?.();
    else founderPlayer.requestFullscreen?.();
  });
  document.addEventListener('fullscreenchange',()=>{
    videoFullscreen?.setAttribute('aria-label',document.fullscreenElement?'Sair da tela cheia':'Tela cheia');
  });
  updateFounderPlayer();
}
