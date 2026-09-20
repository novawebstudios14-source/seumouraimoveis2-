import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';

const port=39000+Math.floor(Math.random()*10000),base=`http://localhost:${port}`;
test('painel bloqueia acesso sem verificação e limita tentativas',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'moura-admin-'));
  const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_USER:'gestor',ADMIN_PASSWORD:'long-test-password',SESSION_SECRET:'test-only-secret',TOTP_SECRET:'3132333435363738393031323334353637383930'},stdio:'ignore'});
  try{
    let ready=false;for(let i=0;i<80;i++){try{const response=await fetch(base+'/api/properties');if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,60));}assert.ok(ready);
    const publish=await fetch(base+'/api/admin/properties',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(publish.status,401);
    const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'gestor',password:'wrong-password'})});assert.equal(login.status,401);
    const missingOrigin=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(missingOrigin.status,403);
    for(let i=0;i<6;i++)await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
    const limited=await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(limited.status,429);
  }finally{server.kill();await rm(dir,{recursive:true,force:true});}
});


test('autenticador é exigido, código usado não pode ser repetido e publicação requer sessão',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'moura-totp-'));
  const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port+1),DATA_DIR:dir,ADMIN_USER:'gestor',ADMIN_PASSWORD:'long-test-password',SESSION_SECRET:'test-only-secret',TOTP_SECRET:'3132333435363738393031323334353637383930'},stdio:'ignore'});
  const url=`http://localhost:${port+1}`;
  const request=(route,payload,cookie='',csrf='')=>fetch(url+'/api/admin/'+route,{method:'POST',headers:{Origin:url,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:JSON.stringify(payload)});
  try{
    for(let i=0;i<80;i++){try{if((await fetch(url+'/api/properties')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,60));}
    const login=await request('login',{username:'gestor',password:'long-test-password'});assert.equal(login.status,200);
    const {challenge,setup}=await login.json();assert.ok(setup.secret);
    const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
    const h=createHmac('sha1',Buffer.from('3132333435363738393031323334353637383930','hex')).update(counter).digest();
    const code=String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1_000_000).padStart(6,'0');
    const verify=await request('verify',{challenge,code});assert.equal(verify.status,200);
    const session=await verify.json();assert.equal(session.recoveryCodes.length,8);
    const cookie=verify.headers.get('set-cookie').split(';')[0];assert.match(verify.headers.get('set-cookie'),/HttpOnly/);
    const blocked=await request('properties',{fields:{},photos:[]},cookie);assert.equal(blocked.status,403);
    const second=await request('login',{username:'gestor',password:'long-test-password'});assert.equal(second.status,200);
    const fresh=await second.json();assert.equal(fresh.setup,undefined);
    const replay=await request('verify',{challenge:fresh.challenge,code});assert.equal(replay.status,401);
    const recovered=await request('verify',{challenge:fresh.challenge,code:session.recoveryCodes[0]});assert.equal(recovered.status,200);
    const published=await request('properties',{fields:{titulo:'Casa',finalidade:'venda',tipo:'Casa',bairro:'Centro',preco:'120000'},photos:['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/V7sAAAAASUVORK5CYII=']},cookie,session.csrf);
    assert.equal(published.status,200,await published.text());
    const publicResult=await (await fetch(url+'/api/properties')).json();assert.equal(publicResult.properties.length,1);
  }finally{server.kill();await rm(dir,{recursive:true,force:true});}
});
