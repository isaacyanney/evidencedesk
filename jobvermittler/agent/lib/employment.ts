import { createHash,randomUUID } from 'node:crypto';
import { Profile,Job,Assessment,Draft,Confirmation } from './schema.ts';
import type { JobData,ProfileData } from './schema.ts';
import type { Store } from './store.ts';
export function canonicalUrl(value:string){const u=new URL(value);u.hash='';u.pathname=u.pathname.replace(/\/$/,'');for(const k of [...u.searchParams.keys()])if(/^(utm_|fbclid$|gclid$)/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.toString().replace(/\/$/,'');}
const norm=(v:string)=>v.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function setProfile(db:Store,input:unknown){const p=Profile.parse(input);if(new Set(p.evidence.map(e=>e.id)).size!==p.evidence.length)throw new Error('Evidence IDs must be unique');db.transaction(()=>{db.put('profile','owner',p);db.db.prepare('DELETE FROM records WHERE kind=?').run('assessment');db.audit('profile.updated','owner');});return p;}
export function requireProfile(db:Store):ProfileData{const p=db.get<ProfileData>('profile','owner');if(!p)throw new Error('Import your private profile in the Profile tab first.');return p;}
export function saveJob(db:Store,input:unknown,now=new Date()){
 const job=Job.parse(input);if(Date.parse(job.checkedAt)>now.getTime()+60_000)throw new Error('Source check cannot be in the future');
 const url=canonicalUrl(job.url),id=createHash('sha256').update(url).digest('hex').slice(0,20);
 return db.transaction(()=>{const previous=db.get('job',id);const duplicates=db.list('job').filter(j=>j.id!==id&&norm(j.employer)===norm(job.employer)&&((job.reference&&norm(j.reference)===norm(job.reference))||norm(j.title)===norm(job.title)));
 const value={...job,url,id,status:previous?.status??'researched',createdAt:previous?.createdAt??now.toISOString(),updatedAt:now.toISOString(),nextActionAt:previous?.nextActionAt??null,possibleDuplicateIds:duplicates.map(j=>j.id)};
 db.put('job',id,value);db.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run('assessment',id);db.audit('job.researched',id);return value;});
}
export function assess(db:Store,input:unknown,now=new Date()){
 const a=Assessment.parse(input),p=requireProfile(db),job=db.get<JobData&{id:string,status:string}>('job',a.jobId);if(!job)throw new Error('Unknown job');
 if(a.requirements.length!==job.requirements.length||new Set(a.requirements.map(r=>r.index)).size!==job.requirements.length)throw new Error('Assess every requirement exactly once');
 const evidence=new Set(p.evidence.map(e=>e.id));for(const r of a.requirements){if(!job.requirements[r.index])throw new Error('Unknown requirement index');if(r.status==='met'&&!r.evidenceIds.length)throw new Error('Met requirements need profile evidence');if(r.evidenceIds.some(id=>!evidence.has(id)))throw new Error('Unknown profile evidence ID');}
 const blockers:string[]=[],unknowns:string[]=[];
 for(const r of a.requirements){const req=job.requirements[r.index];if(req.mandatory&&r.status==='missing')blockers.push(req.criterion);if(req.mandatory&&r.status==='unknown')unknowns.push(req.criterion);}
 if(p.excludedEmployers.some(e=>norm(job.employer).includes(norm(e))))blockers.push('Employer excluded by owner');
 if(a.locationFit==='no')blockers.push('Location does not fit');if(a.hoursFit==='no')blockers.push('Hours do not fit');
 if(a.locationFit==='unknown')unknowns.push('Location or remote eligibility');if(a.hoursFit==='unknown')unknowns.push('Suitable paid hours');
 if(!job.officialSource)unknowns.push('Verify official employer vacancy');if(now.getTime()-Date.parse(job.checkedAt)>72*3600_000)unknowns.push('Recheck vacancy: source older than 72 hours');
 const day=berlinDay(now);if(job.deadline&&job.deadline<day)blockers.push('Application deadline has passed');
 const total=job.requirements.reduce((n,r)=>n+(r.mandatory?3:1),0),matched=a.requirements.reduce((n,r)=>n+(r.status==='met'?(job.requirements[r.index].mandatory?3:1):0),0);
 const raw=Math.round(70*matched/total+(a.locationFit==='yes'?10:0)+(a.hoursFit==='yes'?10:0)+(a.fastStart==='yes'?10:0));const score=blockers.length?0:unknowns.length?Math.min(raw,69):raw;
 const result={...a,score,decision:blockers.length?'blocked':unknowns.length?'clarify':score>=75?'prioritize':'consider',blockers,unknowns,assessedAt:now.toISOString(),scoreMeaning:'Suitability sorting score, not a hiring probability'};
 db.put('assessment',a.jobId,result);db.audit('job.assessed',a.jobId);return result;
}
export function saveDraft(db:Store,input:unknown){const d=Draft.parse(input),p=requireProfile(db),job=db.get('job',d.jobId);if(!job)throw new Error('Unknown job');if(d.evidenceIds.some(id=>!p.evidence.some(e=>e.id===id)))throw new Error('Unknown evidence ID');const value={...d,id:randomUUID(),createdAt:new Date().toISOString(),status:'draft-needs-owner-review'};db.transaction(()=>{db.put('draft',value.id,value);if(job.status==='researched')db.put('job',job.id,{...job,status:'prepared'});db.audit('draft.prepared',value.id);});return value;}
// Deliberately not exposed to the model as a tool.
export function recordOwnerConfirmation(db:Store,input:unknown,now=new Date()){const c=Confirmation.parse(input);if(Date.parse(c.occurredAt)>now.getTime()+60_000)throw new Error('Confirmation cannot be in the future');return db.transaction(()=>{const job=db.get('job',c.jobId);if(!job)throw new Error('Unknown job');const value={...c,id:randomUUID(),recordedBy:'owner',recordedAt:new Date().toISOString()};db.put('confirmation',value.id,value);db.put('job',job.id,{...job,status:c.status,nextActionAt:c.nextActionAt});db.audit(`owner.confirmed.${c.status}`,job.id);return value;});}
export function berlinDay(now:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function plan(db:Store,now=new Date()){
 const day=berlinDay(now),jobs=db.list('job'),assessments=db.list('assessment'),confirmations=db.list('confirmation');
 const due=jobs.filter(j=>j.nextActionAt&&j.nextActionAt<=day&&!['rejected','withdrawn','hired'].includes(j.status));
 const shortlist=assessments.filter(a=>a.decision==='prioritize'&&jobs.some(j=>j.id===a.jobId&&['researched','prepared'].includes(j.status)&&now.getTime()-Date.parse(j.checkedAt)<=72*3600_000&&(!j.deadline||j.deadline>=day)&&!j.possibleDuplicateIds.length)).sort((a,b)=>b.score-a.score).slice(0,5).map(a=>({...a,job:jobs.find(j=>j.id===a.jobId)}));
 const interviews=jobs.filter(j=>['interview','offer'].includes(j.status));
 return {date:day,timeZone:'Europe/Berlin',due,interviews,shortlist,metrics:{researched:jobs.length,prepared:db.list('draft').length,confirmedSubmissions:new Set(confirmations.filter(c=>c.status==='submitted').map(c=>c.jobId)).size,interviews:interviews.filter(j=>j.status==='interview').length,offers:jobs.filter(j=>j.status==='offer').length},historyWarning:'Only imported or recorded applications are known. Absence does not prove you have never applied.'};
}
export function context(db:Store){return {profile:db.get('profile','owner')??null,...plan(db),jobs:db.list('job'),assessments:db.list('assessment'),drafts:db.list('draft'),reports:db.list('report').slice(0,10),confirmations:db.list('confirmation')};}
