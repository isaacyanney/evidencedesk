import { timingSafeEqual } from 'node:crypto';
export function authorized(header:string|undefined,token:string|undefined){if(!token||token.length<32||!header?.startsWith('Bearer '))return false;const a=Buffer.from(token),b=Buffer.from(header.slice(7));return a.length===b.length&&timingSafeEqual(a,b);}
export function sameOrigin(origin:string|undefined,host:string|undefined){if(!origin)return true;try{return new URL(origin).host===host;}catch{return false;}}
