import { readFile } from 'node:fs/promises';
const dashboard=await readFile('dashboard.html','utf8');
const index=await readFile('index.html','utf8');
const prep=await readFile('scripts/prepare-web.mjs','utf8');
const logo=await readFile('assets/logo.svg','utf8');
const guruLogo=await readFile('assets/guru-shree-logo.svg','utf8');
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
['interest income excludes principal', (dashboard.match(/income\s*\+=\s*\(x\.amount\|\|0\)/g)||[]).length===1 && dashboard.includes("if(x.type==='interest_paid')income+=(x.amount||0)")],
['100+ customer scroll architecture',dashboard.includes('height:100dvh')&&dashboard.includes('height:0')&&dashboard.includes('min-height:0')&&dashboard.includes('overflow-y:auto')&&dashboard.includes('touch-action:pan-y')&&dashboard.includes('overscroll-behavior-y:contain')&&dashboard.includes('env(safe-area-inset-bottom')&&dashboard.includes('html,body{height:100%;overflow:hidden')],
['large customer list rendering guard',dashboard.includes('content-visibility:auto')&&dashboard.includes('contain-intrinsic-size:0 150px')],
['incremental customer rendering',dashboard.includes('CUSTOMER_RENDER_CHUNK = 100')&&dashboard.includes('IntersectionObserver')&&dashboard.includes('customerListTail')],
['secure public view token generation',dashboard.includes('crypto.getRandomValues')&&dashboard.includes('Uint8Array(32)')],
['batched customer deletion',dashboard.includes('for(let i=0;i<txns.length;i+=450)')&&dashboard.includes('batch.commit()')],
['atomic loan repayment and interest history',dashboard.includes("async function saveRepay()")&&dashboard.includes("db.runTransaction(async transaction=>")&&dashboard.includes("async function saveIntPaid()")&&dashboard.includes("transaction.set(txnRef")],
['customer search exists',dashboard.includes('id="customerSearch"')&&dashboard.includes('function setCustomerSearch')],
['transaction index exists',dashboard.includes('const txnIndex = new Map()')&&dashboard.includes('function rebuildTxnIndex')],
['verified backup schema exists',dashboard.includes('schemaVersion:2')&&dashboard.includes('checksumSha256')&&dashboard.includes('function verifyDataIntegrity')],
['atomic customer/payment writes',dashboard.includes('const batch=db.batch()')&&dashboard.includes('db.runTransaction(async transaction=>')],
['Guru Shree logo asset exists',guruLogo.includes('<svg')&&dashboard.includes('assets/guru-shree-logo.svg')&&index.includes('assets/guru-shree-logo.svg')],
['web asset copied into www',prep.includes("'assets/logo.svg'")&&prep.includes("'assets/guru-shree-logo.svg'")&&prep.includes("mkdir('www/assets'")]
];
let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' :: '+name);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('WEB VERIFICATION PASS');