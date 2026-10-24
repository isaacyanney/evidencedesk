import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,readlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { attachWorkflowStorage } from '../scripts/hosting.mjs';
test('host storage link preserves workflow data across releases and repeated startup',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jobvermittler-host-'));
 try{const disk=join(root,'disk'),a=join(root,'release-a'),b=join(root,'release-b');await attachWorkflowStorage(a,disk);await writeFile(join(a,'.eve','.workflow-data','receipt'),'persisted');await attachWorkflowStorage(a,disk);await attachWorkflowStorage(b,disk);assert.equal(await readFile(join(b,'.eve','.workflow-data','receipt'),'utf8'),'persisted');assert.equal(await readlink(join(a,'.eve','.workflow-data')),join(disk,'workflows'));}
 finally{await rm(root,{recursive:true,force:true});}
});
test('host preparation refuses to overwrite existing workflow data',async()=>{
 const root=await mkdtemp(join(tmpdir(),'jobvermittler-host-'));
 try{const link=join(root,'app','.eve','.workflow-data');await mkdir(link,{recursive:true});await writeFile(join(link,'existing'),'retain');await assert.rejects(()=>attachWorkflowStorage(join(root,'app'),join(root,'disk')),/Migrate/);assert.equal(await readFile(join(link,'existing'),'utf8'),'retain');}
 finally{await rm(root,{recursive:true,force:true});}
});
