import { readFile } from 'node:fs/promises';
const dashboard=await readFile('dashboard.html','utf8');
const index=await readFile('index.html','utf8');
const prep=await readFile('scripts/prepare-web.mjs','utf8');
const logo=await readFile('assets/logo.svg','utf8');
const checks=[
['dashboard Total Income UI',dashboard.includes('id="dIncome"')&&dashboard.includes('id="dLblI"')],
['Total Income is interest-only',dashboard.includes("if(x.type==='interest_paid')income+=(x.amount||0)")],
['jama payment is green',dashboard.includes('.txn-amt.jama{color:var(--debit)}')],
['udhaar is red',dashboard.includes('.txn-amt.udhaar{color:var(--credit)}')],
['customer add entry exists on dashboard',dashboard.includes('onclick="openAddCustomer()"')],
['customer save logic exists',dashboard.includes('async function saveCustomer()')],
['dark mode toggle exists',dashboard.includes('function toggleDarkMode()')&&dashboard.includes('bsp_dark_mode')],
['PIN lock exists',dashboard.includes('function lockApp()')&&dashboard.includes('function pinPress')],
['Firebase config referenced',dashboard.includes('firebase-config.js')&&index.includes('firebase-config.js')],
['customer-view has no customer-create modal',!(await readFile('customer-view.html','utf8')).includes('openAddCustomer(')],
['customer-view payment colors defined', (await readFile('customer-view.html','utf8')).includes('.txn-amt.jama') && (await readFile('customer-view.html','utf8')).includes('.txn-amt.udhaar')],
['interest income excludes principal', (dashboard.match(/income\s*\+=\s*\(x\.amount\|\|0\)/g)||[]).length===1 && dashboard.includes("if(x.type==='interest_paid')income+=(x.amount||0)")]
];
let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' :: '+name);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('WEB VERIFICATION PASS');