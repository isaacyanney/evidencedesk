import { defineTool } from 'eve/tools';
import { Job } from '../lib/schema.ts';
import { store } from '../lib/store.ts';
import { saveJob } from '../lib/employment.ts';
export default defineTool({description:'Save a researched vacancy with source evidence; deduplicate URLs and flag similar roles. Cannot set submission status.',inputSchema:Job,execute:input=>saveJob(store(),input)});
