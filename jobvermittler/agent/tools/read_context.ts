import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { store } from '../lib/store.ts';
import { context } from '../lib/employment.ts';
export default defineTool({description:'Read private owner profile, full application ledger, drafts, due actions and reports. Required before research or advice.',inputSchema:z.object({}),execute:()=>context(store())});
