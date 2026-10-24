import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { store } from '../lib/store.ts';
export default defineTool({description:'Save research findings and next actions to the private dashboard. Say when live research was unavailable.',inputSchema:z.object({title:z.string().min(1).max(200),content:z.string().min(1).max(30000)}),execute:input=>{const value={...input,id:randomUUID(),createdAt:new Date().toISOString()};store().put('report',value.id,value);return value;}});
