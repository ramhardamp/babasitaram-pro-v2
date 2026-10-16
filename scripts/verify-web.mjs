import { readFile } from 'node:fs/promises';
const dashboard=await readFile('dashboard.html','utf8');
const appConfig=await readFile('app-config.js','utf8');
const index=await readFile('index.html','utf8');
const signup=await readFile('signup.html','utf8');
const forgot=await readFile('forgot-password.html','utf8');
const prep=await readFile('scripts/prepare-web.mjs','utf8');
const guruLogo=await readFile('assets/guru-shree-logo.svg','utf8');
const customerView=await readFile('customer-view.html','utf8');
const uxProCss=await readFile('ux-pro.css','utf8');
const checks=[
['dashboard Total Income UI',dashboard.includes('id="dIncome"')&&dashboard.includes('id="dLblI"')],
['Total Income is interest-only',/if\s*\(x\.type\s*===\s*['\"]interest_paid['\"]\)\s*income\s*\+=\s*\(?\s*(?:Number\(x\.amount\)|x\.amount)\s*\|\|\s*0\s*\)?/.test(dashboard)],
['jama payment is green',dashboard.includes('.txn-amt.jama{color:var(--debit)}')],
['udhaar is red',dashboard.includes('.txn-amt.udhaar{color:var(--credit)}')],
['customer add entry exists on dashboard',dashboard.includes('onclick="openAddCustomer()"')],
['customer save logic exists',dashboard.includes('async function saveCustomer()')],
['one shared theme system (theme.js) on every page, no OS-media/body.dark-mode duplicates',[dashboard,index,signup,forgot,customerView].every(s=>{return s.includes('theme.js')&&s.includes('theme.css')&&!s.includes('prefers-color-scheme: dark')&&!s.includes('prefers-color-scheme:dark')&&!s.includes('.dark-mode')})&&!dashboard.includes('toggleDarkMode')],
['PIN security flow exists',dashboard.includes('function showPinScreen(')&&dashboard.includes('function handlePinComplete(')&&dashboard.includes('function savePIN(')],
['Firebase config referenced',dashboard.includes('firebase-config.js')&&index.includes('firebase-config.js')],
['customer-view has no customer-create modal',!(await readFile('customer-view.html','utf8')).includes('openAddCustomer(')],
['customer-view payment colors defined', (await readFile('customer-view.html','utf8')).includes('.txn-amt.jama') && (await readFile('customer-view.html','utf8')).includes('.txn-amt.udhaar')],
['interest income excludes principal', (dashboard.match(/income\s*\+=\s*\(?\s*(?:Number\(x\.amount\)|x\.amount)\s*\|\|\s*0\s*\)?/g)||[]).length===1 && /if\s*\(x\.type\s*===\s*['\"]interest_paid['\"]\)\s*income\s*\+=/.test(dashboard)],
['100+ customer scroll architecture',dashboard.includes('height:100dvh')&&dashboard.includes('height:0')&&dashboard.includes('min-height:0')&&dashboard.includes('overflow-y:auto')&&dashboard.includes('touch-action:pan-y')&&dashboard.includes('overscroll-behavior-y:contain')&&dashboard.includes('env(safe-area-inset-bottom')&&dashboard.includes('html,body{height:100%;overflow:hidden')],
['large customer list rendering guard',(dashboard+uxProCss).includes('content-visibility:auto')&&(dashboard+uxProCss).includes('contain-intrinsic-size:0 150px')],
['incremental customer rendering',dashboard.includes('CUSTOMER_RENDER_CHUNK = 5')&&dashboard.includes('IntersectionObserver')&&dashboard.includes('customerListTail')],
['secure public view token generation',dashboard.includes('crypto.getRandomValues')&&dashboard.includes('Uint8Array(32)')],
['customer deletion is non-destructive and transaction-protected',dashboard.includes('Never destructively delete a customer')&&dashboard.includes("const txSnap=await txCol.where('partyId','==',customerId).limit(1).get()")&&dashboard.includes('await db.runTransaction(async(transaction)=>')&&dashboard.includes('transaction.delete(partyRef)')],
['atomic loan repayment and interest history',dashboard.includes("async function saveRepay()")&&dashboard.includes("db.runTransaction(async transaction=>")&&dashboard.includes("async function saveIntPaid()")&&dashboard.includes("transaction.set(txnRef")],
['customer search exists',dashboard.includes('id="customerSearch"')&&dashboard.includes('function setCustomerSearch')],
['transaction index exists',dashboard.includes('const txnIndex = new Map()')&&dashboard.includes('function rebuildTxnIndex')],
['verified backup schema exists',dashboard.includes('schemaVersion:2')&&dashboard.includes('checksumSha256')&&dashboard.includes('function verifyDataIntegrity')],
['backup export UI exists',dashboard.includes('onclick="exportData()"')&&dashboard.includes('onclick="exportExcelData()"')&&dashboard.includes('onclick="exportBusinessPdf()"')&&dashboard.includes('onclick="exportCsvData()"')],
['Excel export has multi-sheet structure',dashboard.includes("function exportExcelData(){")&&dashboard.includes("addSheet('Customers'")&&dashboard.includes("addSheet('Transactions'")&&dashboard.includes("addSheet('Loans'")],
['PDF business report is printable',dashboard.includes('function exportBusinessPdf()')&&dashboard.includes('function printExportWindow')&&dashboard.includes('w.print()')],
['customer statement export exists',dashboard.includes('function exportCustomerStatementPdf(id,range)')&&dashboard.includes('exportCustomerStatementPdf(\'')],
['backup export is read-only',dashboard.includes('Export read-only')&&dashboard.includes('buildBackupPayload()')&&dashboard.includes('downloadTextFile')],
['backup export fails closed without a valid SHA-256',dashboard.includes("if(!/^[a-f0-9]{64}$/.test(data?.integrity?.checksumSha256||''))throw new Error('Backup checksum could not be verified; export cancelled.')")],
  ['backup export recomputes and matches the payload SHA-256',dashboard.includes("const canonical=JSON.stringify(data.data)")&&dashboard.includes("if(actual!==data.integrity.checksumSha256)throw new Error('Backup checksum mismatch; export cancelled.')")],
['customer Hisaab share UI exists',dashboard.includes('openShareHisaab(')&&dashboard.includes('Share Hisaab')&&dashboard.includes('share-reminder-preview')],
['customer Hisaab message uses profile identity',dashboard.includes('function getCustomerShareMessage(c,s)')&&dashboard.includes('userData?.shopName')&&dashboard.includes('userData?.ownerName')&&dashboard.includes('userData?.phone')],
['customer Hisaab message excludes app branding',(()=>{const a=dashboard.indexOf('function getCustomerShareMessage(c,s)');const b=dashboard.indexOf('function getShareCardData',a);return a>=0&&b>a&&!dashboard.slice(a,b).includes('BABASITARAM PRO')})()],
['WhatsApp reminder targets customer number',dashboard.includes('function shareHisaabWhatsApp(id)')&&dashboard.includes("window.open('https://wa.me/'+phone+'?text='")],
['SMS reminder targets customer number',dashboard.includes('function shareHisaabSms(id)')&&dashboard.includes("window.location.href='sms:'")],
['photo reminder sharing has file fallback',dashboard.includes('function buildShareReminderImage(id)')&&dashboard.includes('navigator.canShare')&&dashboard.includes('image/png')],
['profile photo is used when available',dashboard.includes('function getProfilePhotoUrl()')&&dashboard.includes('currentUser?.photoURL')&&dashboard.includes('userData?.profilePhoto')],

['atomic customer/payment writes',dashboard.includes('const batch=db.batch()')&&dashboard.includes('db.runTransaction(async transaction=>')],
['Guru Shree logo asset exists',guruLogo.includes('<svg')&&dashboard.includes('assets/guru-shree-logo.svg')&&index.includes('assets/guru-shree-logo.svg')],
['Guru Shree fallback is used consistently',dashboard.includes("this.src='assets/guru-shree-logo.jpg'")&&index.includes("this.src='assets/guru-shree-logo.jpg'")&&!dashboard.includes("this.src='assets/babasitaram-pro-logo.svg'")&&!index.includes("this.src='assets/babasitaram-pro-logo.svg'")],
['Customer avatars use brand logo',dashboard.includes('cc-avatar-brand')&&dashboard.includes('cc-avatar-logo')&&dashboard.includes('assets/guru-shree-logo.svg')],
['PDF logo uses Guru Shree live URL',dashboard.includes("new URL('assets/guru-shree-logo.svg?v=20261010-1',window.location.href).href")&&!dashboard.includes("new URL('assets/babasitaram-pro-logo.svg',window.location.href).href")],
['Branded PDF header uses Guru Shree identity',dashboard.includes('function printExportWindow(title,bodyHtml)')&&dashboard.includes('class="brand-head"')&&dashboard.includes('BSR PRO')&&dashboard.includes('assets/guru-shree-logo.svg')&&dashboard.includes('w.print()')],
['Settings shows the same version as package.json',dashboard.includes('id="appVersionLabel"')&&dashboard.includes('APP_CONFIG.appVersion')&&appConfig.includes("appVersion: '"+JSON.parse(await readFile('package.json','utf8')).version+"'")],
['native shim loaded on every app page (Back + SMS plugin bridge)',[dashboard,index,signup,forgot].every(h=>h.includes('<script src="native-shim.js"></script>'))&&prep.includes("'native-shim.js'")],
['app pages use viewport-fit=cover (safe area / status bar)',[dashboard,index,signup,forgot].every(h=>h.includes('viewport-fit=cover'))],
['release workflow builds with direct SMS enabled',(await readFile('.github/workflows/release.yml','utf8')).includes("ENABLE_DIRECT_SMS: 'true'")],
['edge-to-edge margins forced for Android',(await readFile('capacitor.config.json','utf8')).includes('adjustMarginsForEdgeToEdge')],
['web asset copied into www',!prep.includes("'assets/logo.svg'")&&prep.includes("'assets/guru-shree-logo.svg'")&&prep.includes("mkdir('www/assets'")]
];
checks.push(['Guru Shree asset is the original Guru Shree image wrapper',guruLogo.includes('<image href="data:image/jpeg;base64,')&&guruLogo.length>1000]);
checks.push(['Support email is consistent across public entry pages',!index.includes('ramhardamp@gmail.com')&&!signup.includes('ramhardamp@gmail.com')&&!forgot.includes('ramhardamp@gmail.com')&&index.includes('babasitaram@gmail.com')&&signup.includes('babasitaram@gmail.com')&&forgot.includes('babasitaram@gmail.com')]);
checks.push(['Signup captures immutable profile mobile',signup.includes('id="ownerPhone"')&&signup.includes('profilePhone: ownerPhone')&&signup.includes('profileName: ownerName')&&signup.includes('profileEmail: user.email')]);
checks.push(['Settings shows locked profile identity',dashboard.includes('id="pOwnerName"')&&dashboard.includes('id="pPhone"')&&dashboard.includes('id="pEmail"')&&dashboard.includes('प्रोफाइल में लॉक')]);
checks.push(['Business edit cannot change profile mobile',dashboard.includes('const updateData = {shopName}')&&!dashboard.includes('const updateData = {shopName,phone}')]);
checks.push(['Existing users get non-destructive profile fields',dashboard.includes('const profilePatch={}')&&dashboard.includes('set(profilePatch,{merge:true})')&&dashboard.includes('if(!userData.profilePhone && userData.phone)')]);

checks.push(['Login keeps Firestore profile and ledger off the critical path',!index.includes('preloadDashboardData(user.uid)')&&!index.includes('bsp_dashboard_prefetched')&&!index.includes('bsp_user_prefetched')&&index.includes('bsp_login_handoff')&&!index.includes('const userDoc = await db.collection(\'users\').doc(user.uid).get()')&&!index.includes('loginDataLoading')]);
checks.push(['Login progress stays inside the login button',index.includes('id="loginBtn"')&&index.includes("btn.id === 'loginBtn'")&&!index.includes('id="loginDataLoading"')&&!index.includes('function showLoginDataLoading')]);
checks.push(['Dashboard totals function is unique',((dashboard.match(/function getTotals\(\)/g)||[]).length===1)]);
checks.push(['Dashboard boot timing instrumentation exists',dashboard.includes('[DASH-BOOT]')&&index.includes('[LOGIN-TIMING]')]);
checks.push(['Dashboard hydrates through parallel Firestore listeners',dashboard.includes('function setupListeners()')&&dashboard.includes('onSnapshot({includeMetadataChanges:true}')&&dashboard.includes('initialCustomersReady=true')&&dashboard.includes('initialTransactionsReady=true')&&!dashboard.includes('async function primeDashboardData()')&&dashboard.includes("get({source:'cache'})")&&dashboard.includes("setupListeners();")]);
checks.push(['Supplied Guru Shree logo is embedded as a valid SVG image',guruLogo.includes('<svg')&&guruLogo.includes('data:image/jpeg;base64,')&&guruLogo.includes('<image ')&&guruLogo.length>2500]);
checks.push(['PIN change has return target and visible back',dashboard.includes("pinReturnScreen='settings'")&&dashboard.includes('const canGoBack=!!pinReturnScreen')&&dashboard.includes("if(currentScreen==='pin' && pinReturnScreen)")]);
checks.push(['Support email is updated',dashboard.includes('mailto:babasitaram@gmail.com')&&dashboard.includes('babasitaram@gmail.com')&&!dashboard.includes('ramhardamp@gmail.com')]);
checks.push(['Dashboard top logo markup is valid',dashboard.includes('<img class="brand-logo" src="assets/guru-shree-logo.svg?v=')&&!dashboard.includes("src=\\\"'+logoUrl+'\\\"")]);
checks.push(['Customer avatar logo markup is JS-safe',dashboard.includes('const brandLogo=')&&dashboard.includes('cc-avatar-logo')&&!dashboard.includes("const brandLogo='<img class='cc-avatar-logo'")]);
checks.push(['Customer statement includes loan principal',dashboard.includes("tx.type==='byaj_loan'?Number(tx.principal||tx.amount)||0:Number(tx.amount)||0")&&dashboard.includes("byaj_loan:'लोन मूलधन दिया'")&&dashboard.includes('periodLoanGiven')&&dashboard.includes('लोन मूलधन दिया')]);
checks.push(['Customer statement exposes PDF action',dashboard.includes('exportCustomerStatementPdf')&&dashboard.includes('Statement PDF')]);
checks.push(['Offline/cache status is visible',dashboard.includes('id="syncStatus"')&&dashboard.includes('function setSyncStatus(')&&dashboard.includes('includeMetadataChanges:true')&&dashboard.includes('snap.metadata.fromCache')]);
checks.push(['Settings has one bottom navigation Settings entry',!dashboard.includes('id="settingsHeaderBtn"')&&dashboard.includes('data-view="settings" onclick="switchTab(\'settings\')"')]);
checks.push(['Obsolete login marketing badges removed',!index.includes('हमेशा फ्री')&&!index.includes('बिना इंटरनेट')&&!index.includes('डेटा सुरक्षित')]);
checks.push(['PIN and Language are inside Settings',dashboard.includes('PIN / Security')&&dashboard.includes('PIN बदलें')&&dashboard.includes('Language')&&dashboard.includes('English / हिंदी')]);
checks.push(['Android automatic SMS hooks exist',dashboard.includes('function getSmsPlugin()')&&dashboard.includes('BsrSmsScheduler')&&dashboard.includes('function sendNativeSms')&&dashboard.includes('function scheduleUdhaarReminder')]);
checks.push(['SMS settings are persisted non-destructively',dashboard.includes('smsSettings')&&dashboard.includes("db.collection('users').doc(currentUser.uid).update({smsSettings:next})")]);
checks.push(['Transaction update triggers automatic SMS',dashboard.includes('smsMessageForTransaction(c,type,amt,newBal)')&&dashboard.includes('type===\'udhaar\'')&&dashboard.includes('type===\'jama\'')]);
checks.push(['Seven-day reminder is scheduled from udhaar date',dashboard.includes('7*24*60*60*1000')&&dashboard.includes("id:'udhaar7:'")&&dashboard.includes('scheduleReminder')]);
checks.push(['Payment cancels duplicate customer reminders',dashboard.includes('cancelCustomerSmsReminders(customerId)')]);
checks.push(['Android SMS preparation script exists',await readFile('scripts/prepare-android.mjs','utf8').then(x=>x.includes('BsrSmsSchedulerPlugin.java')&&x.includes('SEND_SMS')&&x.includes('BsrSmsAlarmReceiver'))]);
checks.push(['Android workflow prepares native SMS layer',await readFile('.github/workflows/android-ci.yml','utf8').then(x=>x.includes('node scripts/prepare-android.mjs'))]);
checks.push(['Unified mobile Back bridge exists',dashboard.includes('window.__nativeAndroidBack')&&dashboard.includes('function setupNativeBackHandler')&&dashboard.includes('handleAppBack()')]);
checks.push(['Android native Back preparation is present',await readFile('scripts/prepare-android.mjs','utf8').then(x=>x.includes('bsrSetupAndroidBack')&&x.includes('getOnBackPressedDispatcher()')&&x.includes('getBridge().getWebView()')&&x.includes('__nativeAndroidBack'))]);
checks.push(['Capacitor App dependency is installed for secondary Back bridge',JSON.parse(await readFile('package.json','utf8')).dependencies?.['@capacitor/app']==='7.1.2']);
checks.push(['PWA files exist',await readFile('manifest.json','utf8').then(x=>x.includes('BSRPRO Digital Khata'))&&await readFile('service-worker.js','utf8').then(x=>x.includes('guru-shree-shell'))]);


checks.push(['Statement date validator uses digit classes and calendar validation',/const validDate=s=>\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(s\)&&!Number\.isNaN\(new Date\(s\+'T12:00:00'\)\.getTime\(\)\)&&localDateInputValue\(new Date\(s\+'T12:00:00'\)\)===s/.test(dashboard)]);
const statementDatePattern=/^\d{4}-\d{2}-\d{2}$/;
checks.push(['Statement date pattern accepts valid ISO dates',statementDatePattern.test('2026-10-02')&&statementDatePattern.test('2024-02-29')]);
checks.push(['Statement date pattern rejects malformed dates',!statementDatePattern.test('2026-1-02')&&!statementDatePattern.test('02-10-2026')&&!statementDatePattern.test('2026/10/02')]);



checks.push(['backup checksum verifier rejects malformed structure and count drift',dashboard.includes("!Array.isArray(data.data.customers)||!Array.isArray(data.data.transactions)")&&dashboard.includes('data.counts.customers!==data.data.customers.length')&&dashboard.includes('data.counts.transactions!==data.data.transactions.length')]);
checks.push(['All backup formats verify SHA-256 before export',dashboard.includes('async function verifyBackupPayloadChecksum(data)')&&dashboard.includes('await verifyBackupPayloadChecksum(data);const json=JSON.stringify(data,null,2)')&&dashboard.includes("const data=await buildBackupPayload();await verifyBackupPayloadChecksum(data);const tables=buildExportTables(data);")&&dashboard.includes('const data=existingData||await buildBackupPayload();await verifyBackupPayloadChecksum(data);const tables=buildExportTables(data);')]);


// ---- Batch 1: release/config hygiene (2026-10-08) ----
{
const pkg=JSON.parse(await readFile('package.json','utf8'));
const appCfg=await readFile('app-config.js','utf8');
const sw=await readFile('service-worker.js','utf8');
const cap=JSON.parse(await readFile('capacitor.config.json','utf8'));
const androidWf=await readFile('.github/workflows/android-ci.yml','utf8');
const webWf=await readFile('.github/workflows/web-ci.yml','utf8');
const prepAndroid=await readFile('scripts/prepare-android.mjs','utf8');
const { versionCodeOf, normalizeWebUrl, applySync }=await import('./sync-version.mjs');
const { patchGradle }=await import('./set-android-version.mjs');
const vm=await import('node:vm');
const runCfg=(loc)=>{const w={location:loc};vm.runInNewContext(appCfg,{window:w});return w.APP_CONFIG;};
const CANON='com.bsrpro.digitalkhata';
checks.push(['Version single source: app-config.js and service-worker match package.json',appCfg.includes(`appVersion: '${pkg.version}'`)&&sw.includes(`const CACHE='guru-shree-shell-v${pkg.version}';`)]);
checks.push(['Backup appVersion comes from APP_CONFIG (no hardcoded version)',dashboard.includes('appVersion:APP_CONFIG.appVersion')&&!/appVersion:'\d/.test(dashboard)]);
checks.push(['Canonical Android applicationId is consistent',cap.appId===CANON&&androidWf.includes(CANON)&&prepAndroid.includes(`package ${CANON};`)&&appCfg.includes(CANON)]);
checks.push(['Legacy package ID is absent from executable files',![dashboard,signup,index,androidWf,prepAndroid,appCfg,JSON.stringify(cap)].some(x=>x.includes('com.babasitaram.pro'))]);
const releaseWf=await readFile('.github/workflows/release.yml','utf8');
checks.push(['Android CI triggers on main push, pull_request and manual; release.yml on v* tags',/push:[\s\S]*?- main/.test(androidWf)&&/pull_request:[\s\S]*?- main/.test(androidWf)&&androidWf.includes('workflow_dispatch')&&/tags:\s*\n\s*- 'v\*'/.test(releaseWf)]);
checks.push(['CI debug release is pre-release only, skipped on pull_request, never called production',/Publish debug pre-release[^\n]*\n\s*if: github\.event_name != 'pull_request'/.test(androidWf)&&androidWf.includes('--prerelease')&&androidWf.includes('NOT a production')]);
checks.push(['Android versionName/versionCode set from package.json and verified in APK',androidWf.includes('node scripts/set-android-version.mjs')&&androidWf.includes("versionName='${EXPECTED_VERSION}'")]);
checks.push(['Web workflow runs version-sync check',webWf.includes('sync-version.mjs --check')]);
checks.push(['No repository URL hardcoded outside app-config.js',![dashboard,signup,index,forgot,await readFile('customer-view.html','utf8'),sw].some(x=>x.includes('github.io'))]);
checks.push(['app-config.js loaded before use, cached and packaged',dashboard.indexOf('src="app-config.js"')>0&&dashboard.indexOf('src="app-config.js"')<dashboard.indexOf('const CUSTOMER_VIEW_BASE_URL')&&signup.includes('src="app-config.js"')&&sw.includes("'./app-config.js'")&&prep.includes("'app-config.js'")]);
checks.push(['Portal/email links use APP_CONFIG',dashboard.includes("APP_CONFIG.pageUrl('customer-view.html')")&&signup.includes('APP_CONFIG.webBaseUrl()')&&signup.includes("APP_CONFIG.pageUrl('forgot-password.html')")]);
const pagesCfg=runCfg({protocol:'https:',hostname:'someone.github.io',origin:'https://someone.github.io',pathname:'/renamed-repo/dashboard.html'});
checks.push(['Web base URL follows current host/repo (rename-proof)',pagesCfg.pageUrl('customer-view.html')==='https://someone.github.io/renamed-repo/customer-view.html'&&pagesCfg.webBaseUrl()==='https://someone.github.io/renamed-repo/']);
const capCfg=runCfg({protocol:'https:',hostname:'localhost',origin:'https://localhost',pathname:'/dashboard.html'});
const fileCfg=runCfg({protocol:'file:',hostname:'',origin:'null',pathname:'/x/dashboard.html'});
checks.push(['Capacitor/file:// fall back to productionWebUrl',capCfg.webBaseUrl()===capCfg.productionWebUrl&&fileCfg.webBaseUrl()===fileCfg.productionWebUrl&&capCfg.productionWebUrl.endsWith('/')]);
checks.push(['versionCode formula and validation',versionCodeOf('6.8.3')===60803&&versionCodeOf('1.0.0')===10000&&(()=>{try{versionCodeOf('6.8');return false}catch{return true}})()&&(()=>{try{versionCodeOf('1.100.0');return false}catch{return true}})()]);
checks.push(['PRODUCTION_WEB_URL normalised and https-only',normalizeWebUrl('https://x.github.io/y')==='https://x.github.io/y/'&&normalizeWebUrl('https://x.org/')==='https://x.org/'&&(()=>{try{normalizeWebUrl('http://x.org');return false}catch{return true}})()]);
const g0='defaultConfig {\n  versionCode 1\n  versionName "1.0"\n}';
checks.push(['Gradle patcher sets version and rejects unknown template',patchGradle(g0,'6.8.3').includes('versionCode 60803')&&patchGradle(g0,'6.8.3').includes('versionName "6.8.3"')&&(()=>{try{patchGradle('nothing','6.8.3');return false}catch{return true}})()]);
const sy=applySync(appCfg,sw,'7.0.0','https://a.b/c/');
checks.push(['sync-version rewrites version, cache name and fallback URL',sy.cfg.includes("appVersion: '7.0.0'")&&sy.cfg.includes("productionWebUrl: 'https://a.b/c/'")&&sy.sw.includes("guru-shree-shell-v7.0.0")]);
}

let failed=0;
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' :: '+name);if(!ok)failed++;}
if(failed)process.exit(1);