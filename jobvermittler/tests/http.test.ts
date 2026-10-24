import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';

test('private dashboard API persists profile and confirmed updates and fails closed',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'jobvermittler-http-')),token=randomBytes(32).toString('hex');
 const port='3187',base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-strip-types','server/index.ts'],{cwd:process.cwd(),env:{...process.env,JOBVERMITTLER_TOKEN:token,JOBVERMITTLER_DATA_DIR:directory,DASHBOARD_PORT:port,EVE_HOST:'http://127.0.0.1:9'},stdio:['ignore','pipe','pipe']});
 let logs='';child.stderr.on('data',d=>logs+=d);
 try{
  await Promise.race([new Promise<void>((resolve,reject)=>{child.stdout.on('data',()=>resolve());child.on('exit',()=>reject(new Error(logs||'Dashboard exited')));}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Startup timeout')),10000).unref())]);
  const request=(path:string,body?:unknown,extra:Record<string,string>={})=>fetch(base+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal((await fetch(base+'/api/state')).status,401);
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/Jobvermittler/);assert.match(page.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
  const profile={name:'Test Owner',location:'Berlin',goal:'Paid employment',preferences:[],evidence:[{id:'support',fact:'Support work experience',source:'CV'}],uncertainties:[]};
  assert.equal((await request('profile',profile,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request('profile',profile)).status,200);
  const jobResponse=await request('job',{employer:'Example',title:'Assistant',url:'https://example.org/job/1',reference:'1',location:'Berlin',hours:'Full time',salary:null,start:null,deadline:null,checkedAt:new Date().toISOString(),officialSource:true,requirements:[{criterion:'Support experience',mandatory:true,excerpt:'Experience required'}]});assert.equal(jobResponse.status,200);const job=await jobResponse.json();
  assert.equal((await request('confirmation',{jobId:job.id,status:'submitted',evidence:'Actual owner-recorded receipt ABC123',occurredAt:new Date().toISOString(),nextActionAt:'2026-11-10'})).status,200);
  const state=await (await request('state')).json();assert.equal(state.profile.name,'Test Owner');assert.equal(state.jobs[0].status,'submitted');assert.equal(state.metrics.confirmedSubmissions,1);
  const exported=await(await request('export')).json();assert.equal(exported.version,1);assert.equal(exported.confirmations.length,1);
  assert.equal((await request('chat',{message:'Prepare my plan'})).status,202);
  await new Promise<void>(resolve=>{const timer=setInterval(async()=>{const s=await(await request('state')).json();if(s.tasks[0]?.status==='failed'){clearInterval(timer);resolve();}},100);setTimeout(()=>{clearInterval(timer);resolve();},3000).unref();});
  const failed=await(await request('state')).json();assert.equal(failed.tasks[0].status,'failed');assert.equal(failed.metrics.confirmedSubmissions,1);
 }finally{child.kill('SIGTERM');await once(child,'exit');rmSync(directory,{recursive:true,force:true});}
});
