import {readFile} from 'node:fs/promises';

const dashboard=await readFile('dashboard.html','utf8');
const engine=await readFile('scripts/interest-engine.mjs','utf8');

const dashboardForbidden=[
  'interest-engine.mjs',
  'previewInterest(',
  'from \'./scripts/interest-engine\'',
  'from "./scripts/interest-engine"',
  'import \'./scripts/interest-engine',
  'import "./scripts/interest-engine'
];
for(const needle of dashboardForbidden){
  if(dashboard.includes(needle)) throw new Error(`Interest engine must remain isolated: dashboard contains ${needle}`);
}

const engineForbidden=[
  'firebase',
  'firestore',
  'fetch(',
  'XMLHttpRequest',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  '.collection(',
  '.set(',
  '.update(',
  '.delete('
];
for(const needle of engineForbidden){
  if(engine.toLowerCase().includes(needle.toLowerCase())) throw new Error(`Interest engine must be side-effect-free: contains ${needle}`);
}

if(!engine.includes('Not wired to live ledger writes.')){
  throw new Error('Interest engine isolation marker missing');
}
console.log('PASS :: interest engine remains isolated from live dashboard and external data writes');
