import { existsSync,writeFileSync,readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if(!existsSync('.env')){writeFileSync('.env',`JOBVERMITTLER_TOKEN=${randomBytes(32).toString('hex')}\n# Add your AI Gateway API key below. Never commit this file.\nAI_GATEWAY_API_KEY=\n`,{mode:0o600});console.log('Created .env. Your private dashboard access token is stored there.');}else console.log('Keeping existing .env.');
console.log('Next: configure AI_GATEWAY_API_KEY in .env, import your profile, and run the agent and dashboard. See README.md.');
