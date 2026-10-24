import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { attachWorkflowStorage,waitForRuntime } from './hosting.mjs';

const root=process.cwd(),env={...process.env};
if(!env.JOBVERMITTLER_TOKEN||env.JOBVERMITTLER_TOKEN.length<32)throw new Error('Set a generated JOBVERMITTLER_TOKEN of at least 32 characters.');
if(!env.AI_GATEWAY_API_KEY)throw new Error('Set AI_GATEWAY_API_KEY in your hosting provider secret settings.');
if(env.RENDER&&!env.JOBVERMITTLER_PERSISTENT_DIR)throw new Error('A persistent disk is required for hosted operation.');
await attachWorkflowStorage(root,env.JOBVERMITTLER_PERSISTENT_DIR);
if(env.JOBVERMITTLER_PERSISTENT_DIR)env.JOBVERMITTLER_DATA_DIR=resolve(env.JOBVERMITTLER_PERSISTENT_DIR,'records');
const runtimePort=env.JOBVERMITTLER_RUNTIME_PORT||'2000';
env.EVE_HOST='http://127.0.0.1:'+runtimePort;
env.WORKFLOW_LOCAL_BASE_URL=env.EVE_HOST;
env.EVE_TELEMETRY_DISABLED='1';
env.DASHBOARD_HOST=env.DASHBOARD_HOST||(env.RENDER?'0.0.0.0':'127.0.0.1');
env.DASHBOARD_PORT=env.PORT||env.DASHBOARD_PORT||'3000';
const children=[],controller=new AbortController();let stopping=false;
function stop(code){if(stopping)return;stopping=true;controller.abort();for(const child of children)child.kill('SIGTERM');const timer=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},7000);timer.unref();Promise.all(children.map(c=>c.exitCode!==null||c.signalCode?Promise.resolve():new Promise(r=>c.once('exit',r)))).then(()=>process.exit(code));}
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>stop(0));
function run(args){const child=spawn(process.execPath,args,{cwd:root,env,stdio:'inherit'});children.push(child);child.once('error',()=>{console.error('A service process could not start.');stop(1);});child.once('exit',(code)=>{if(!stopping){console.error('A service process stopped; restarting the complete service is required.');stop(code||1);}});return child;}
run([resolve('node_modules/eve/bin/eve.js'),'start','--host','127.0.0.1','--port',runtimePort]);
try{await waitForRuntime(env.EVE_HOST,60000,controller.signal);if(!stopping)run(['--experimental-strip-types','server/index.ts']);}
catch(e){if(!stopping){console.error(e.message);stop(1);}}
