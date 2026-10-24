import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { store } from '../lib/store.ts';
import { plan } from '../lib/employment.ts';
export default defineTool({description:'Get due follow-ups, interviews, offers, current strong matches and actual progress metrics.',inputSchema:z.object({}),execute:()=>plan(store())});
