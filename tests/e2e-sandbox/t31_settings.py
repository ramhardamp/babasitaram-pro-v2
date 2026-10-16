import asyncio,sys,datetime,json
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
today=datetime.date.today().isoformat()
parties=[{'id':f'p{i}','name':n,'phone':f'98765000{i:02d}','type':'customer','createdAt':i} for i,n in enumerate(['Davender Kumar','Ronald Stewart'])]
txns=[{'id':f't{i}','partyId':f'p{i}','type':'udhaar','amount':500*(i+1),'note':'n','date':today,'dateTime':today+'T01:30:00.000Z','transactionAt':today+'T01:30:00.000Z'} for i in range(2)]
R=[]
def ok(name,cond,extra=''):
    R.append((name,bool(cond))); print(('PASS' if cond else 'FAIL'),'::',name,(' | '+str(extra)[:220]) if (extra!='' and not cond) else '')
async def main():
    s=Session()
    # CDN (xlsx) sandbox me offline => 'Failed to load resource' ko error nahi ginte
    real_errors=lambda:[e for e in s.errors if 'ERR_FAILED' not in str(e)]
    pg=await s.start(viewport=(390,844),seed=seed_script(parties=parties,txns=txns),logged_in=True)
    dl=[]; pg.on('download',lambda d:dl.append(d.suggested_filename)); popups=[]; pg.on('popup',lambda p:popups.append(1))
    failed=[]; pg.on('requestfailed',lambda r:failed.append(r.url[:120]))
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(2500)
    await pg.evaluate("window.__toasts=[];window.__dlg=[];window.confirm=m=>{window.__dlg.push(String(m));return true};const _t=window.toast;window.toast=function(m,t){window.__toasts.push(String(m));return _t.apply(this,arguments)}")
    async def toasts(): return await pg.evaluate("window.__toasts.splice(0)")
    async def open_settings(): 
        await pg.click('.btab[data-view="settings"]'); await pg.wait_for_timeout(600)
    async def panel(name):
        await pg.evaluate(f"openSettingsPanel('{name}')"); await pg.wait_for_timeout(450)
    async def close_panel():
        await pg.evaluate("typeof closeSettingsPanel==='function'&&closeSettingsPanel()"); await pg.wait_for_timeout(300)
    await open_settings()
    # ---------- PROFILE
    await panel('profile')
    vals=await pg.evaluate("[document.getElementById('panelProfileName')?.value,document.getElementById('panelShopName')?.value]")
    ok('PROFILE: panel me naam + business name bhare hain',vals==['Ram','Test Dukan'],vals)
    await pg.fill('#panelProfileName','Ramesh Ji'); await pg.fill('#panelShopName','Naya Dukan')
    await pg.evaluate("saveSettingsPanel('profile')"); await pg.wait_for_timeout(1000)
    ud=await pg.evaluate("[userData.profileName||userData.ownerName,userData.shopName]")
    ok('PROFILE: naam/Business name save (userData)',ud==['Ramesh Ji','Naya Dukan'],ud)
    await close_panel()
    await panel('profile'); vals=await pg.evaluate("[document.getElementById('panelProfileName')?.value,document.getElementById('panelShopName')?.value]")
    ok('PROFILE: dobara kholne par naya naam dikhta',vals==['Ramesh Ji','Naya Dukan'],vals); await close_panel()
    # ---------- UPI
    await panel('upi'); ids=await pg.evaluate("[...document.getElementById('settingsPanelOverlay').querySelectorAll('input')].map(i=>i.id)")
    ok('UPI: input maujood',len(ids)>=1,ids)
    if ids:
        await pg.fill('#'+ids[0],'naya@upi'); await pg.evaluate("saveSettingsPanel('upi')"); await pg.wait_for_timeout(900)
        ok('UPI: id save hui',await pg.evaluate("userData.upiId")=='naya@upi',await pg.evaluate("userData.upiId"))
    await close_panel()
    # ---------- SECURITY: PIN
    await panel('security')
    await pg.evaluate("changePIN()"); await pg.wait_for_timeout(700)
    async def pin_state():
        return await pg.evaluate("[typeof pinMode!=='undefined'?pinMode:'', document.getElementById('pinTitle')?.textContent, document.getElementById('pinSubtitle')?.textContent, typeof currentScreen!=='undefined'?currentScreen:'']")
    async def type_pin(p):
        await pg.focus('#pinInput'); await pg.keyboard.type(p, delay=60); await pg.wait_for_timeout(900)
    steps=[]
    steps.append(await pin_state()); ok('PIN: PIN screen khulti hai',steps[0][3]=='pin',steps[0])
    await pg.screenshot(path='/tmp/s_pin.png')
    # jab tak 'change-new' na aaye purana PIN daalte jao (kuch builds me pehle verify phir change-old maangta hai)
    n=0
    while (await pin_state())[0] not in ('change-new',) and n<3:
        await type_pin('1234'); n+=1; steps.append(await pin_state())
    ok('PIN: sahi purana PIN accept hua -> naya PIN maangta hai',(await pin_state())[0]=='change-new',steps)
    ok('PIN: purana PIN sirf EK baar maanga (duplicate prompt nahi)',n==1,'prompts='+str(n))
    print('   PIN prompts for old PIN:',n)
    await type_pin('2580'); st=await pin_state(); ok('PIN: naya PIN daalne par confirm maangta hai',st[0]=='change-confirm',st)
    await type_pin('2580'); await pg.wait_for_timeout(900); t2=await toasts(); st=await pin_state()
    ok('PIN: naya PIN set hua + wapas settings',st[3]=='settings',(st,t2))
    ok('PIN: koi JS error nahi',not s.errors,s.errors[:3])
    if (await pin_state())[3]!='settings': await open_settings()
    # ---------- BIOMETRIC / LANGUAGE
    await panel('security')
    await pg.evaluate("toggleBiometricLock()"); await pg.wait_for_timeout(700); tb=await toasts(); ok('BIOMETRIC: web par crash nahi, message milta hai',len(tb)>=1 and not s.errors,(tb,s.errors[:2]))
    for lang in ['en','gu','mr','ne','te','hi']:
        await pg.evaluate(f"setLang('{lang}')"); await pg.wait_for_timeout(350)
        got=await pg.evaluate("[document.documentElement.lang, localStorage.getItem('bsp_lang')||localStorage.getItem('appLang')||localStorage.getItem('bsr_lang'), document.getElementById('langSelect').value, document.querySelector('.btab[data-view=settings] .btab-label').textContent]")
        ok(f'LANGUAGE {lang}: select + label badla',got[2]==lang and bool(got[3]),got)
    ok('LANGUAGE: koi error nahi',not s.errors,s.errors[:3])
    await close_panel()
    # ---------- SMS / PUSH
    await panel('sms')
    for key,idn in [('enabled','smsEnabledToggle'),('transactionSms','smsTxnToggle'),('reminderSms','smsReminderToggle')]:
        before=await pg.evaluate(f"document.getElementById('{idn}').classList.contains('on')||document.getElementById('{idn}').getAttribute('aria-pressed')")
        await pg.evaluate(f"toggleSmsSetting('{key}')"); await pg.wait_for_timeout(700)
        after=await pg.evaluate(f"document.getElementById('{idn}').classList.contains('on')||document.getElementById('{idn}').getAttribute('aria-pressed')")
        t=await toasts()
        ok(f'SMS {key}: toggle chala (state ya message mila)',before!=after or len(t)>=1,(before,after,t))
    st=await pg.evaluate("document.getElementById('smsPermissionState').textContent"); ok('SMS: state label dikhta hai',bool(st),st)
    await pg.evaluate("togglePushNotifications()"); await pg.wait_for_timeout(900); tp=await toasts()
    ps=await pg.evaluate("document.getElementById('pushNotificationState').textContent"); ok('PUSH: web par toggle crash nahi, message/state milta hai',(len(tp)>=1 or ps) and not s.errors,(tp,ps,s.errors[:2]))
    await pg.evaluate("sendTestPushNotification()"); await pg.wait_for_timeout(900); tp=await toasts(); ok('PUSH: test notification graceful',len(tp)>=1 and not s.errors,(tp,s.errors[:2]))
    await close_panel()
    # ---------- DATA & BACKUP
    await panel('data')
    await pg.evaluate("verifyDataIntegrity()"); await pg.wait_for_timeout(900); tv=await toasts()
    modal=await pg.evaluate("!!document.querySelector('.modal,.pm')"); ok('DATA: integrity check result dikhata hai',modal or len(tv)>=1,tv)
    await pg.evaluate("typeof closeModal==='function'&&closeModal()"); await pg.wait_for_timeout(300)
    for fn,label in [('exportData()','Full Backup JSON'),('exportExcelData()','Excel'),('exportCsvData()','CSV')]:
        n0=len(dl); await pg.evaluate(fn); await pg.wait_for_timeout(1500); t=await toasts()
        ok(f'EXPORT {label}: file download hui',len(dl)>n0,(dl[n0:],t))
    n0=len(popups); await pg.evaluate("exportBusinessPdf()"); await pg.wait_for_timeout(1200); t=await toasts(); ok('EXPORT PDF: print/preview khula ya message mila',len(popups)>n0 or len(t)>=1 or len(dl)>0,t)
    await pg.evaluate("openImportBackup()"); await pg.wait_for_timeout(700); ok('IMPORT: backup picker/modal khula',await pg.evaluate("!!document.querySelector('.modal,.pm,input[type=file]')"))
    await pg.evaluate("typeof closeModal==='function'&&closeModal()"); await pg.wait_for_timeout(300)
    ok('BACKUP: lastBackup timestamp save hua',await pg.evaluate("!!localStorage.getItem('bsp_lastBackup')"))
    await close_panel()
    # ---------- ADVANCED
    await panel('advanced')
    await pg.fill('#sDefaultRate','3'); await pg.evaluate("saveSettings()"); await pg.wait_for_timeout(800)
    ok('ADVANCED: default rate save',await pg.evaluate("String(userData.defaultRate)")=='3',await pg.evaluate("userData.defaultRate"))
    await pg.evaluate("fixAllBalances()"); await pg.wait_for_timeout(1000); t=await toasts(); await pg.evaluate("typeof closeModal==='function'&&closeModal()")
    ok('ADVANCED: Fix All Balances chalta hai',not real_errors(),(t,real_errors()[:2]))
    await pg.evaluate("backfillViewTokens()"); await pg.wait_for_timeout(1000); t=await toasts(); ok('ADVANCED: Portal links chalta hai',not real_errors(),(t,real_errors()[:2]))
    await close_panel()
    # ---------- ABOUT / LOGOUT
    await panel('about'); v=await pg.evaluate("document.getElementById('appVersionLabel').textContent"); ok('ABOUT: version dikhta hai',bool(v),v); await close_panel()
    print('failed requests:',failed[:6])
    await pg.evaluate("window.confirm=m=>{window.__dlg.push(String(m));return false}"); await pg.evaluate("showLogoutConfirm()"); await pg.wait_for_timeout(400)
    ok('LOGOUT: confirm poochta hai aur Cancel par login me nahi jaata',await pg.evaluate("window.__dlg.length>0 && location.pathname.endsWith('dashboard.html')"))
    print('\nTOTAL',sum(1 for r in R if r[1]),'/',len(R),'| js errors:',s.errors[:3])
    await s.stop()
asyncio.run(main())
