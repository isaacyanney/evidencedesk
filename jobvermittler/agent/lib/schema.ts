import { z } from 'zod';
export const Profile = z.object({
 name:z.string().max(120),location:z.string().max(200),goal:z.string().max(1000),
 preferences:z.array(z.string().max(1000)).max(40),
 evidence:z.array(z.object({id:z.string().regex(/^[a-z0-9_-]+$/),fact:z.string().max(3000),source:z.string().max(500)})).max(100),
 uncertainties:z.array(z.string().max(1500)).max(30),excludedEmployers:z.array(z.string().min(2).max(200)).max(50).default([])
});
export const Job=z.object({
 employer:z.string().min(1).max(200),title:z.string().min(1).max(300),reference:z.string().max(200).default(''),
 url:z.url().refine(v=>new URL(v).protocol==='https:','Use a public HTTPS vacancy URL'),
 location:z.string().max(200),hours:z.string().max(200),salary:z.string().max(300).nullable(),start:z.string().max(200).nullable(),deadline:z.iso.date().nullable(),
 checkedAt:z.iso.datetime(),officialSource:z.boolean(),
 requirements:z.array(z.object({criterion:z.string().min(1).max(600),mandatory:z.boolean(),excerpt:z.string().min(1).max(1000)})).min(1).max(30),notes:z.string().max(5000).default('')
});
export const Assessment=z.object({jobId:z.string().min(1),requirements:z.array(z.object({index:z.number().int().min(0),status:z.enum(['met','missing','unknown']),evidenceIds:z.array(z.string()).max(20),explanation:z.string().min(1).max(1200)})).min(1).max(30),locationFit:z.enum(['yes','no','unknown']),hoursFit:z.enum(['yes','no','unknown']),fastStart:z.enum(['yes','no','unknown']),nextAction:z.string().min(1).max(1500)});
export const Draft=z.object({jobId:z.string().min(1),kind:z.enum(['cover-letter','cv-changes','follow-up','interview-prep','recruiter-message']),content:z.string().min(1).max(24000),evidenceIds:z.array(z.string()).min(1).max(100)});
export const Confirmation=z.object({jobId:z.string().min(1),status:z.enum(['submitted','interview','offer','rejected','hired','withdrawn']),evidence:z.string().min(10).max(4000),occurredAt:z.iso.datetime(),nextActionAt:z.iso.date().nullable()});
export type ProfileData=z.infer<typeof Profile>;
export type JobData=z.infer<typeof Job>;
