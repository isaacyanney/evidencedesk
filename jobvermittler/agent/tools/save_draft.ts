import { defineTool } from 'eve/tools';
import { Draft } from '../lib/schema.ts';
import { store } from '../lib/store.ts';
import { saveDraft } from '../lib/employment.ts';
export default defineTool({description:'Save a cover letter, CV-change proposal, follow-up, interview preparation or recruiter message for owner review. Does not send or submit.',inputSchema:Draft,execute:input=>saveDraft(store(),input)});
