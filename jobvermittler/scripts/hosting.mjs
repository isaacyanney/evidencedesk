import { mkdir,lstat,readdir,symlink,readlink } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';

export async function attachWorkflowStorage(root,persistentRoot){
 if(!persistentRoot)return;
 const target=resolve(persistentRoot,'workflows'),link=resolve(root,'.eve','.workflow-data');
 await mkdir(target,{recursive:true,mode:0o700});await mkdir(dirname(link),{recursive:true});
 let existing;try{existing=await lstat(link);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing){
  if(existing.isSymbolicLink()&&resolve(dirname(link),await readlink(link))===target)return;
  // Never silently replace or strand existing workflow data.
  throw new Error('Workflow storage already exists at .eve/.workflow-data. Migrate it to the persistent volume before hosting.');
 }
 await symlink(target,link,'dir');
}
export async function waitForRuntime(url,timeoutMs=60000,signal){
 const deadline=Date.now()+timeoutMs;
 while(Date.now()<deadline){
  if(signal?.aborted)throw new Error('Startup cancelled');
  try{const r=await fetch(new URL('/eve/v1/health',url),{signal:AbortSignal.timeout(2000)});const b=await r.json();if(r.ok&&b.ok===true)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw new Error('Agent runtime did not become healthy before the startup timeout.');
}
