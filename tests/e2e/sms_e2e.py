import asyncio, json
from playwright.async_api import async_playwright
INIT="""
window.__native=[];window.__listeners={};window.__updates=[];
window.Capacitor={nativePromise:(p,m,o)=>{__native.push(p+'.'+m);
   if(m==='checkPermission')return Promise.resolve({granted:!!window.__granted});
   if(m==='requestPermission'){window.__granted=true;return Promise.resolve({granted:true})}
   return Promise.resolve({ok:true,scheduled:true})},
 addListener:(p,e,cb)=>{__listeners[p+':'+e]=cb;return {remove(){}}}, nativeCallback:()=>0, isNativePlatform:()=>true, getPlatform:()=>'android'};
(function(){const S={};
 const col=()=>({doc:(id)=>({id,get:async()=>({exists:false,data:()=>({})}),set:async()=>{},update:async()=>{}}),onSnapshot:()=>()=>{},where:()=>col(),orderBy:()=>col()});
 const fdb={enablePersistence:()=>Promise.resolve(),batch:()=>({set(){},update(){},commit:async()=>{}}),
  collection:(n)=>({doc:(uid)=>({collection:()=>col(),get:async()=>({exists:false,data:()=>({})}),onSnapshot:()=>()=>{},update:async(d)=>{__updates.push(d)}})})};
 const fs=()=>fdb; fs.FieldValue={serverTimestamp:()=>'TS',increment:n=>n,delete:()=>null};
 const au=()=>({onAuthStateChanged:()=>{},currentUser:null,signOut:async()=>{}}); au.Auth={Persistence:{LOCAL:'local'}};
 window.firebase={initializeApp:()=>{},auth:au,firestore:fs};})();
"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':360,'height':740}); await pg.add_init_script(INIT)
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/dashboard.html'); await pg.wait_for_timeout(500)
        R={}
        R['shim_back_listener']=await pg.evaluate("()=>Object.keys(__listeners)")
        R['plugins']=await pg.evaluate("()=>[!!Capacitor.Plugins.App,!!Capacitor.Plugins.BsrSmsScheduler]")
        await pg.evaluate("()=>{currentUser={uid:'u1'};userData={shopName:'S',smsSettings:{}};dataReadyResolve();APP_CONFIG.directSms=true;customers=[];transactions=[];updateSmsSettingsUI()}")
        R['initial']=await pg.evaluate("()=>[smsEnabledToggle.classList.contains('on'),smsTxnToggle.classList.contains('on'),smsReminderToggle.classList.contains('on'),smsPermissionState.textContent]")
        await pg.evaluate("()=>toggleSmsSetting('enabled')"); await pg.wait_for_timeout(300)
        R['after_master_on']=await pg.evaluate("()=>[smsEnabledToggle.classList.contains('on'),smsTxnToggle.classList.contains('on'),smsReminderToggle.classList.contains('on'),smsPermissionState.textContent]")
        R['permission_flow']=await pg.evaluate("()=>__native.filter(x=>x.includes('Permission'))")
        R['saved']=await pg.evaluate("()=>__updates.length&&__updates[__updates.length-1].smsSettings")
        await pg.evaluate("()=>toggleSmsSetting('transactionSms')"); await pg.wait_for_timeout(200)
        R['txn_off']=await pg.evaluate("()=>[smsEnabledToggle.classList.contains('on'),smsTxnToggle.classList.contains('on'),smsReminderToggle.classList.contains('on')]")
        await pg.evaluate("()=>toggleSmsSetting('transactionSms')"); await pg.wait_for_timeout(200)
        R['txn_on_again']=await pg.evaluate("()=>[smsTxnToggle.classList.contains('on')]")
        # simulate app restart: settings come back from userData
        await pg.evaluate("()=>{userData.smsSettings=__updates[__updates.length-1].smsSettings;updateSmsSettingsUI()}")
        R['after_restart']=await pg.evaluate("()=>[smsEnabledToggle.classList.contains('on'),smsTxnToggle.classList.contains('on'),smsReminderToggle.classList.contains('on')]")
        # permission denied must NOT show ON
        await pg.evaluate("()=>{window.__granted=false;userData.smsSettings={};updateSmsSettingsUI();Capacitor.nativePromise=(p,m)=>Promise.resolve(m==='checkPermission'||m==='requestPermission'?{granted:false}:{})}")
        await pg.evaluate("()=>toggleSmsSetting('enabled')"); await pg.wait_for_timeout(300)
        R['denied_stays_off']=await pg.evaluate("()=>[smsEnabledToggle.classList.contains('on')]")
        print(json.dumps(R,ensure_ascii=False)); print('errors',[e for e in errs if 'emailjs' not in e.lower()])
        await b.close()
asyncio.run(main())
