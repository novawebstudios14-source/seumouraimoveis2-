import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const port=39000+Math.floor(Math.random()*10000),base=`http://localhost:${port}`;
test('painel bloqueia acesso sem verificação e limita tentativas',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'moura-admin-'));
  const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,ADMIN_USER:'gestor',ADMIN_PASSWORD:'long-test-password',SESSION_SECRET:'test-only-secret',OTP_EMAIL:'test@example.com',OTP_PHONE:'+5594999999999',RESEND_API_KEY:'test',OTP_FROM_EMAIL:'test@example.com',TWILIO_ACCOUNT_SID:'test',TWILIO_AUTH_TOKEN:'test',TWILIO_FROM_PHONE:'+15555555555'},stdio:'ignore'});
  try{
    let ready=false;for(let i=0;i<80;i++){try{const response=await fetch(base+'/api/properties');if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,60));}assert.ok(ready);
    const publish=await fetch(base+'/api/admin/properties',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(publish.status,401);
    const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'gestor',password:'wrong-password'})});assert.equal(login.status,401);
    const missingOrigin=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(missingOrigin.status,403);
    for(let i=0;i<6;i++)await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
    const limited=await fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(limited.status,429);
  }finally{server.kill();await rm(dir,{recursive:true,force:true});}
});
