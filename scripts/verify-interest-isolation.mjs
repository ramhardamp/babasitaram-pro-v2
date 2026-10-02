import {readFile} from 'node:fs/promises';

const dashboard=await readFile('dashboard.html','utf8');
const engine=await readFile('scripts/interest-engine.mjs','utf8');

const dashboardForbidden=[
  /(?:^|[\\s;])(?:import|export)\\s.*interest-engine/i,
  /previewInterest\\s*\\(/,
  /interest-engine\\.mjs/i
];
for(const pattern of dashboardForbidden){
  if(pattern.test(dashboard)) throw new Error(`Interest engine must remain isolated: dashboard matches ${pattern}`);
}

const engineForbidden=[
  /firebase/i,
  /firestore/i,
  /fetch\\s*\\(/i,
  /XMLHttpRequest/i,
  /localStorage/i,
  /sessionStorage/i,
  /indexedDB/i,
  /\\.collection\\s*\\(/,
  /\\.set\\s*\\(/,
  /\\.update\\s*\\(/,
  /\\.delete\\s*\\(/
];
for(const pattern of engineForbidden){
  if(pattern.test(engine)) throw new Error(`Interest engine must be side-effect-free: matches ${pattern}`);
}

if(!engine.includes('Not wired to live ledger writes.')){
  throw new Error('Interest engine isolation marker missing');
}
console.log('PASS :: interest engine remains isolated from live dashboard and external data writes');
