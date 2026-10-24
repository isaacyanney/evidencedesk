import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from 'eve/client';
import { z } from 'zod';
import { store } from '../agent/lib/store.ts';
import { context,setProfile,saveJob,recordOwnerConfirmation } from '../agent/lib/employment.ts';
import { authorized,sameOrigin } from './security.ts';

const token=process.env.JOBVERMITTLER_TOKEN;
if(!token||token.length<32)throw new Error('Run npm run setup to create a private access token first.');
const db=store(),port=Number(process.env.DASHBOARD_PORT||3000);
const client=new Client({host:process.env.EVE_HOST||'http://127.0.0.1:2000',auth:{bearer:token},redirect:'error'});
for(const task of db.list('task'))if(task.status==='running'){db.put('task',task.id,{...task,status:'interrupted',message:'Dashboard restarted. Check the agent before starting another search.'});}
let busy=false;
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 const send=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 try{
  const path=new URL(req.url||'/','http://localhost').pathname;
  const assets:Record<string,[string,string]>={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
  if(req.method==='GET'&&assets[path]){const [file,type]=assets[path];res.writeHead(200,{'Content-Type':type});res.end(await readFile(fileURLToPath(new URL('../web/'+file,import.meta.url))));return;}
  if(!authorized(req.headers.authorization,token)){send(401,{error:'Your private access token is required.'});return;}
  if(!sameOrigin(req.headers.origin,req.headers.host)){send(403,{error:'Cross-origin request rejected'});return;}
  async function body(){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>256_000)throw new Error('Request too large');}return JSON.parse(text||'{}');}
  if(req.method==='GET'&&path==='/api/state'){send(200,{...context(db),tasks:db.list('task').slice(0,20),modelConfigured:Boolean(process.env.AI_GATEWAY_API_KEY),agentHost:process.env.EVE_HOST||'http://127.0.0.1:2000'});return;}
  if(req.method==='GET'&&path==='/api/export'){send(200,{version:1,exportedAt:new Date().toISOString(),...context(db)});return;}
  if(req.method==='POST'&&path==='/api/profile'){send(200,setProfile(db,await body()));return;}
  if(req.method==='POST'&&path==='/api/job'){send(200,saveJob(db,await body()));return;}
  if(req.method==='POST'&&path==='/api/confirmation'){send(200,recordOwnerConfirmation(db,await body()));return;}
  if(req.method==='POST'&&path==='/api/chat'){
   if(busy){send(409,{error:'A task is already running. Wait for it to finish or cancel it.'});return;}
   const input=z.object({message:z.string().min(1).max(16000),newSession:z.boolean().default(false)}).parse(await body());
   const id=randomUUID(),task={id,prompt:input.message,status:'running',createdAt:new Date().toISOString(),sessionId:null as string|null};
   db.put('task',id,task);busy=true;send(202,{id});
   void(async()=>{try{
    let sid=input.newSession?undefined:db.get<{id:string}>('session','chat')?.id;
    let response;
    if(sid){response=await client.sessions.attach(sid).send(input.message);}else{const created=await client.sessions.create({message:input.message});response=created.response;sid=response.sessionId;db.put('session','chat',{id:sid});}
    db.put('task',id,{...task,sessionId:sid});const result=await response.result();
    db.put('task',id,{...task,sessionId:sid,status:result.status,message:result.message||'No final reply. Check agent runtime and credentials.',finishedAt:new Date().toISOString()});
   }catch(e){db.put('task',id,{...task,status:'failed',message:e instanceof Error?e.message.slice(0,1200):'Agent unavailable',finishedAt:new Date().toISOString()});}finally{busy=false;}})();return;
  }
  if(req.method==='POST'&&path==='/api/cancel'){const task=db.list('task').find(t=>t.status==='running');if(task?.sessionId)await client.sessions.attach(task.sessionId).cancel();send(200,{message:task?'Cancellation requested; check task outcome.':'No active task.'});return;}
  send(404,{error:'Not found'});
 }catch(e){send(400,{error:e instanceof Error?e.message.slice(0,1500):'Request failed'});}
});
server.listen(port,'127.0.0.1',()=>console.log(`Private dashboard: http://127.0.0.1:${port}`));
