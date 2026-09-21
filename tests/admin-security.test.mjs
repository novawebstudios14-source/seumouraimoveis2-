import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const port=39000+Math.floor(Math.random()*10000),base=`http://localhost:${port}`;
test('login com senha limita tentativas, protege publicações e encerra sessão',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'moura-admin-'));
  const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_USER:'gestor',ADMIN_PASSWORD:'long-test-password',SESSION_SECRET:'test-only-secret',NODE_ENV:'test'},stdio:'ignore'});
  const request=(route,payload,cookie='',csrf='',origin=base)=>fetch(base+'/api/admin/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(payload)});
  try{
    let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/properties')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}assert.ok(ready);
    const forbidden=await request('properties',{fields:{},photos:[]});assert.equal(forbidden.status,401);
    const wrongOrigin=await request('login',{username:'gestor',password:'long-test-password'},'','','https://evil.example');assert.equal(wrongOrigin.status,403);
    const wrong=await request('login',{username:'gestor',password:'wrong'});assert.equal(wrong.status,401);
    const login=await request('login',{username:'gestor',password:'long-test-password'});assert.equal(login.status,200);
    const {csrf}=await login.json(),cookie=login.headers.get('set-cookie').split(';')[0];assert.ok(csrf);assert.match(login.headers.get('set-cookie'),/HttpOnly/);
    const blocked=await request('properties',{fields:{},photos:[]},cookie);assert.equal(blocked.status,403);
    const aiStatus=await (await fetch(base+'/api/admin/ai-config',{headers:{Cookie:cookie}})).json();assert.equal(aiStatus.configured,false);
    const badKey=await request('ai-config',{key:'invalid'},cookie,csrf);assert.equal(badKey.status,400);
    const unauthorizedDescription=await request('description',{fields:{tipo:'Casa',bairro:'Centro'}});assert.equal(unauthorizedDescription.status,401);
    const descriptionResponse=await request('description',{fields:{tipo:'Casa',bairro:'Centro',cidade:'Marabá',finalidade:'venda',quartos:'3',preco:'120000'}},cookie,csrf);
    assert.equal(descriptionResponse.status,200);const draft=await descriptionResponse.json();assert.equal(draft.source,'automatic');assert.match(draft.description,/Casa à venda no bairro Centro, em Marabá/);assert.match(draft.description,/3 quartos/);
    const photo='data:image/webp;base64,'+(await readFile(new URL('../assets/house.webp',import.meta.url))).toString('base64');
    const published=await request('properties',{fields:{titulo:'Casa',finalidade:'venda',tipo:'Casa',bairro:'Centro',cidade:'Marabá',preco:'120000',quartos:'3',banheiros:'2',area:'120',descricao:draft.description},photos:[photo]},cookie,csrf);
    assert.equal(published.status,200,await published.text());
    assert.equal((await (await fetch(base+'/api/properties')).json()).properties.length,1);
    const logout=await request('logout',{},cookie,csrf);assert.equal(logout.status,200);
    const after=await fetch(base+'/api/admin/properties',{headers:{Cookie:cookie}});assert.equal(after.status,401);
    for(let i=0;i<8;i++)await request('login',{username:'gestor',password:'wrong'});
    const limited=await request('login',{username:'gestor',password:'long-test-password'});assert.equal(limited.status,429);
  }finally{server.kill();await rm(dir,{recursive:true,force:true});}
});
