import { defineTool } from 'eve/tools';
import { Assessment } from '../lib/schema.ts';
import { store } from '../lib/store.ts';
import { assess } from '../lib/employment.ts';
export default defineTool({description:'Assess every requirement against profile evidence IDs. Enforces blockers, unknowns, source freshness and deadlines. Score is not hiring probability.',inputSchema:Assessment,execute:input=>assess(store(),input)});
