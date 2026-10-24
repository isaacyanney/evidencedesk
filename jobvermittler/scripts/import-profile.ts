import { readFileSync } from 'node:fs';
import { store } from '../agent/lib/store.ts';
import { setProfile } from '../agent/lib/employment.ts';
const path=process.argv[2];if(!path)throw new Error('Usage: npm run import-profile -- /path/to/profile.private.json');
setProfile(store(),JSON.parse(readFileSync(path,'utf8')));console.log('Private profile imported. No personal content printed.');
