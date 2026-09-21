import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';

test('webhook lento não bloqueia o catálogo e cabeçalhos defensivos estão presentes',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'moura-availability-'));
  const port=41000+Math.floor(Math.random()*5000),base=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,META_APP_SECRET:'test-secret'},stdio:'ignore'});
  let socket;
  try{
    for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
    socket=net.connect(port,'127.0.0.1');
    socket.write('POST /webhooks/whatsapp HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 1000\r\nX-Hub-Signature-256: sha256=bad\r\n\r\n{');
    await new Promise(resolve=>setTimeout(resolve,100));
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1000);
    const response=await fetch(base+'/api/properties',{signal:controller.signal});clearTimeout(timer);
    assert.equal(response.status,200);
    const home=await fetch(base+'/');
    assert.equal(home.headers.get('x-content-type-options'),'nosniff');
    assert.equal(home.headers.get('x-frame-options'),'DENY');
    assert.match(home.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
  }finally{socket?.destroy();server.kill();await rm(dir,{recursive:true,force:true});}
});
