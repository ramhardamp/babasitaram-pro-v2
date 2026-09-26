import { readFile } from 'node:fs/promises';
const dashboard=await readFile('dashboard.html','utf8');
const index=await readFile('index.html','utf8');
const prep=await readFile('scripts/prepare-web.mjs','utf8');
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
['customer deletion is non-destructive and transaction-protected',dashboard.includes('Never destructively delete a customer')&&dashboard.includes("const txSnap=await txCol.where('partyId','==',customerId).limit(1).get()")&&dashboard.includes('await db.runTransaction(async(transaction)=>')&&dashboard.includes('transaction.delete(partyRef)')],
['atomic loan repayment and interest history',dashboard.includes("async function saveRepay()")&&dashboard.includes("db.runTransaction(async transaction=>")&&dashboard.includes("async function saveIntPaid()")&&dashboard.includes("transaction.set(txnRef")],
['customer search exists',dashboard.includes('id="customerSearch"')&&dashboard.includes('function setCustomerSearch')],
['transaction index exists',dashboard.includes('const txnIndex = new Map()')&&dashboard.includes('function rebuildTxnIndex')],
['verified backup schema exists',dashboard.includes('schemaVersion:2')&&dashboard.includes('checksumSha256')&&dashboard.includes('function verifyDataIntegrity')],
['backup export UI exists',dashboard.includes('class="export-card primary"')&&dashboard.includes('onclick="exportExcelData()"')&&dashboard.includes('onclick="exportBusinessPdf()"')&&dashboard.includes('onclick="exportCsvData()"')],
['Excel export has multi-sheet structure',dashboard.includes("function exportExcelData(){")&&dashboard.includes("addSheet('Customers'")&&dashboard.includes("addSheet('Transactions'")&&dashboard.includes("addSheet('Loans'")],
['PDF business report is printable',dashboard.includes('function exportBusinessPdf()')&&dashboard.includes('function printExportWindow')&&dashboard.includes('w.print()')],
['customer statement export exists',dashboard.includes('function exportCustomerStatementPdf(id)')&&dashboard.includes('exportCustomerStatementPdf(\'')],
['backup export is read-only',dashboard.includes('Export read-only')&&dashboard.includes('buildBackupPayload()')&&dashboard.includes('downloadTextFile')],
['customer Hisaab share UI exists',dashboard.includes('openShareHisaab(')&&dashboard.includes('Share Hisaab')&&dashboard.includes('share-reminder-preview')],
['customer Hisaab message uses profile identity',dashboard.includes('function getCustomerShareMessage(c,s)')&&dashboard.includes('userData?.shopName')&&dashboard.includes('userData?.ownerName')&&dashboard.includes('userData?.phone')],
['customer Hisaab message excludes app branding',(()=>{const a=dashboard.indexOf('function getCustomerShareMessage(c,s)');const b=dashboard.indexOf('function getShareCardData',a);return a>=0&&b>a&&!dashboard.slice(a,b).includes('BABASITARAM PRO')})()],
['WhatsApp reminder targets customer number',dashboard.includes('function shareHisaabWhatsApp(id)')&&dashboard.includes("window.open('https://wa.me/'+phone+'?text='")],
['SMS reminder targets customer number',dashboard.includes('function shareHisaabSms(id)')&&dashboard.includes("window.location.href='sms:'")],
['photo reminder sharing has file fallback',dashboard.includes('function buildShareReminderImage(id)')&&dashboard.includes('navigator.canShare')&&dashboard.includes('image/png')],
['profile photo is used when available',dashboard.includes('function getProfilePhotoUrl()')&&dashboard.includes('currentUser?.photoURL')&&dashboard.includes('userData?.profilePhoto')],

['atomic customer/payment writes',dashboard.includes('const batch=db.batch()')&&dashboard.includes('db.runTransaction(async transaction=>')],
['Guru Shree logo asset exists',guruLogo.includes('<svg')&&dashboard.includes('assets/guru-shree-logo.svg')&&index.includes('assets/guru-shree-logo.svg')],
['web asset copied into www',!prep.includes("'assets/logo.svg'")&&prep.includes("'assets/guru-shree-logo.svg'")&&prep.includes("mkdir('www/assets'")]
];
let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' :: '+name);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('WEB VERIFICATION PASS');