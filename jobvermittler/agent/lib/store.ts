import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
export class Store {
 db:DatabaseSync;
 constructor(directory=process.env.JOBVERMITTLER_DATA_DIR||resolve('data')){
  mkdirSync(directory,{recursive:true,mode:0o700});const path=resolve(directory,'employment.sqlite');this.db=new DatabaseSync(path);chmodSync(path,0o600);
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(kind,id));
   CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,at TEXT NOT NULL,action TEXT NOT NULL,record_id TEXT NOT NULL);`);
 }
 get<T=any>(kind:string,id:string):T|undefined{const r=this.db.prepare('SELECT json FROM records WHERE kind=? AND id=?').get(kind,id) as {json:string}|undefined;return r?JSON.parse(r.json):undefined;}
 list<T=any>(kind:string):T[]{return this.db.prepare('SELECT json FROM records WHERE kind=? ORDER BY rowid DESC').all(kind).map(r=>JSON.parse(String(r.json)));}
 put(kind:string,id:string,value:unknown){this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json').run(kind,id,JSON.stringify(value));}
 audit(action:string,id:string){this.db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(randomUUID(),new Date().toISOString(),action,id);}
 transaction<T>(fn:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 close(){this.db.close();}
}
let instance:Store|undefined;
export function store(){return instance??=new Store();}
