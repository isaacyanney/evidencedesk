// Never prints a credential or makes a billable model call.
const key=process.env.AI_GATEWAY_API_KEY;
if(!key){console.error('AI_GATEWAY_API_KEY is missing. Add it through the hosting provider secret settings.');process.exit(2);}
const response=await fetch('https://ai-gateway.vercel.sh/v1/credits',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});
if(!response.ok){console.error(`Gateway access check failed (HTTP ${response.status}). Check key, account verification and credits in your Gateway dashboard.`);process.exit(1);}
const data=await response.json();console.log(JSON.stringify({gatewayAccess:'verified',balance:data.balance??data.credit_balance??null}));
console.log('Verify the dedicated API key budget and disabled auto top-up in your AI Gateway dashboard before the first model request.');
