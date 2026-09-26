import { readFile } from 'node:fs/promises';
const dashboard=await readFile('dashboard.html','utf8');
const index=await readFile('index.html','utf8');
const prep=await readFile('scripts/prepare-web.mjs','utf8');
const guruLogo=await readFile('assets/guru-shree-logo.svg','utf8');
const brandLogo=await readFile('assets/babasitaram-pro-logo.svg','utf8');
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
['Reliable brand logo fallback exists',brandLogo.includes('<svg')&&dashboard.includes("this.src='assets/babasitaram-pro-logo.svg'")&&index.includes("this.src='assets/babasitaram-pro-logo.svg'")&&prep.includes("'assets/babasitaram-pro-logo.svg'")],
['Customer avatars use brand logo',dashboard.includes('cc-avatar-brand')&&dashboard.includes('cc-avatar-logo')&&dashboard.includes('assets/guru-shree-logo.svg')],
['PDF logo uses absolute live URL',dashboard.includes("new URL('assets/guru-shree-logo.svg',window.location.href).href")&&dashboard.includes("new URL('assets/babasitaram-pro-logo.svg',window.location.href).href")],
['Branded PDF header includes logo and business identity',dashboard.includes('function printExportWindow(title,bodyHtml)')&&dashboard.includes('class="brand-head"')&&dashboard.includes('BABASITARAM PRO')&&dashboard.includes('assets/babasitaram-pro-logo.svg')&&dashboard.includes('w.print()')],
['web asset copied into www',!prep.includes("'assets/logo.svg'")&&prep.includes("'assets/guru-shree-logo.svg'")&&prep.includes("mkdir('www/assets'")]
];
let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' :: '+name);if(!ok)failed++;}
if(failed)process.exit(1);
console.log('WEB VERIFICATION PASS');checks.push(['PIN change has return target and visible back',dashboard.includes("pinReturnScreen='settings'")&&dashboard.includes('const canGoBack=!!pinReturnScreen')&&dashboard.includes("if(currentScreen==='pin' && pinReturnScreen)")]);
checks.push(['Support email is updated',dashboard.includes('mailto:babasitaram@gmail.com')&&dashboard.includes('babasitaram@gmail.com')&&!dashboard.includes('ramhardamp@gmail.com')]);
checks.push(['Dashboard top logo markup is valid',dashboard.includes('<img class="brand-logo" src="assets/guru-shree-logo.svg"')&&!dashboard.includes("src=\\\"'+logoUrl+'\\\"")]);
checks.push(['Customer avatar logo markup is JS-safe',dashboard.includes('const brandLogo=')&&dashboard.includes('cc-avatar-logo')&&!dashboard.includes("const brandLogo='<img class='cc-avatar-logo'")]);
checks.push(['Customer statement includes loan principal',dashboard.includes("const isLoan=tx.type==='byaj_loan'")&&dashboard.includes('Number(tx.principal||tx.amount)||0')&&dashboard.includes('Loan Principal')]);
checks.push(['Customer statement exposes PDF action',dashboard.includes('exportCustomerStatementPdf')&&dashboard.includes('Statement PDF')]);
checks.push(['Offline/cache status is visible',dashboard.includes('id="syncStatus"')&&dashboard.includes('function setSyncStatus(')&&dashboard.includes('includeMetadataChanges:true')&&dashboard.includes('snap.metadata.fromCache')]);

// Account identity and logo integrity checks.
checks.push(['Guru Shree asset is the original Guru Shree image wrapper',guruLogo.includes('<image href="data:image/webp;base64,')&&guruLogo.length>1000]);
checks.push(['Support email is consistent across public entry pages',!index.includes('ramhardamp@gmail.com')&&!signup.includes('ramhardamp@gmail.com')&&!forgot.includes('ramhardamp@gmail.com')&&index.includes('babasitaram@gmail.com')&&signup.includes('babasitaram@gmail.com')&&forgot.includes('babasitaram@gmail.com')]);
checks.push(['Signup captures immutable profile mobile',signup.includes('id="ownerPhone"')&&signup.includes('profilePhone: ownerPhone')&&signup.includes('profileName: ownerName')&&signup.includes('profileEmail: user.email')]);
checks.push(['Settings shows locked profile identity',dashboard.includes('id="pOwnerName"')&&dashboard.includes('id="pPhone"')&&dashboard.includes('id="pEmail"')&&dashboard.includes('प्रोफाइल में लॉक')]);
checks.push(['Business edit cannot change profile mobile',dashboard.includes('const updateData = {shopName}')&&!dashboard.includes('const updateData = {shopName,phone}')]);
checks.push(['Existing users get non-destructive profile fields',dashboard.includes('const profilePatch={}')&&dashboard.includes('set(profilePatch,{merge:true})')&&dashboard.includes('if(!userData.profilePhone && userData.phone)')]);
