import { eveChannel } from 'eve/channels/eve';
import { withAuthChallenges,type AuthFn } from 'eve/channels/auth';
import { timingSafeEqual } from 'node:crypto';
const owner:AuthFn<Request>=withAuthChallenges(request=>{
 const expected=process.env.JOBVERMITTLER_TOKEN,value=request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!expected||expected.length<32||!value)return null;const a=Buffer.from(expected),b=Buffer.from(value);
 if(a.length!==b.length||!timingSafeEqual(a,b))return null;
 return {authenticator:'private-owner-token',principalId:'owner',principalType:'user' as const,attributes:{}};
},[{scheme:'Bearer'}]);
export default eveChannel({auth:[owner]});
