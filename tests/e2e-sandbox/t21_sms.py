import asyncio
from lib import *
from t3_helpers import *
PLUGIN="""window.__smsCalls=[];window.Capacitor={Plugins:{BsrSmsScheduler:{
 checkPermission:async()=>({granted:window.__grant===true}),requestPermission:async()=>({granted:window.__grant===true}),
 sendSms:async o=>{window.__smsCalls.push(['send',o.phone]);return{sent:true}},
 scheduleReminder:async o=>{window.__smsCalls.push(['sched',o.id]);return{scheduled:true}},
 cancelReminder:async()=>{},cancelCustomerReminders:async o=>{window.__smsCalls.push(['cancel',o.prefix])}}}};"""
async def scenario(name,direct,plugin,grant):
    S=Session(); pg=await S.start(seed=seed_script(parties=[{'id':'p1','name':'Suresh','phone':'9000000001','email':'','balance':0,'viewToken':'T'*32}]),logged_in=True,service_workers='block')
    async def cfg(route):
        r=await route.fetch(); b=(await r.text()).replace('directSms: true','directSms: '+('true' if direct else 'false'))
        await route.fulfill(response=r,body=b)
    await S.ctx.route('**/app-config.js',cfg)
    if plugin: await S.ctx.add_init_script(PLUGIN+f"window.__grant={'true' if grant else 'false'};")
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1300)
    await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(300)
    await pg.evaluate("openSettingsPanel('sms')"); await pg.wait_for_timeout(300)
    st=lambda: pg.evaluate("document.getElementById('smsPermissionState').textContent")
    on=lambda: pg.evaluate("['smsEnabledToggle','smsTxnToggle','smsReminderToggle'].map(i=>document.getElementById(i).classList.contains('on'))")
    print(f'--- {name}: state label =',await st())
    await pg.click('#smsEnabledToggle'); await pg.wait_for_timeout(700)
    print('   toast:',await toast(pg)); print('   toggles after click:',await on())
    return S,pg,on
async def main():
    global st
    S,pg,on=await scenario('A: web build (directSms=false)',False,False,False); chk('A: stays OFF',await on()==[False]*3); await S.stop()
    S,pg,on=await scenario('B: direct-SMS build in browser (no plugin)',True,False,False); chk('B: stays OFF with clear msg','Android APK' in await toast(pg)); await S.stop()
    S,pg,on=await scenario('C: APK, permission DENIED',True,True,False); chk('C: stays OFF, permission msg','permission' in (await toast(pg)).lower()); await S.stop()
    S,pg,on=await scenario('D: APK, permission GRANTED',True,True,True)
    chk('D: Automatic SMS ON (all 3 show on)',await on()==[True,True,True],str(await on()))
    global st
    st=lambda: pg.evaluate("document.getElementById('smsPermissionState').textContent")
    await pg.click('#smsTxnToggle'); await pg.wait_for_timeout(500); chk('D: txn SMS toggles OFF',(await on())[1]==False)
    await pg.click('#smsTxnToggle'); await pg.wait_for_timeout(500); chk('D: txn SMS toggles ON again',(await on())[1]==True)
    await pg.click('#smsReminderToggle'); await pg.wait_for_timeout(500); chk('D: reminder toggles OFF',(await on())[2]==False)
    await pg.click('#smsReminderToggle'); await pg.wait_for_timeout(500); chk('D: reminder toggles ON',(await on())[2]==True)
    sm=(await fsdoc(pg,'users/u_test'))['smsSettings']; chk('D: persisted in Firestore',sm['enabled'] and sm['transactionSms'] and sm['reminderSms'],str(sm))
    # real udhaar -> automatic SMS sent through plugin
    await pg.evaluate("closeSettingsPanel()"); await pg.click('.btab[data-view=dashboard]'); await pg.wait_for_timeout(300)
    await pg.locator('.customer-card').click(); await pg.wait_for_timeout(400)
    await pg.click('button.action-btn.udhaar'); await pg.fill('#mAmt','500'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(1500)
    calls=await pg.evaluate("window.__smsCalls"); print('   plugin calls:',calls)
    chk('D: txn SMS sent via native plugin',any(c[0]=='send' and c[1]=='9000000001' for c in calls))
    chk('D: 7-day reminder scheduled',any(c[0]=='sched' for c in calls))
    # reload app: saved state must still show ON
    await pg.reload(); await pg.wait_for_timeout(1500)
    await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(300); await pg.evaluate("openSettingsPanel('sms')"); await pg.wait_for_timeout(300)
    chk('D: after app restart toggles still show ON',await on()==[True]*3,str(await on()))
    chk('D: state label ON after restart',(await st())=='ON',await st())
    # turn master OFF -> others show off and reminders cancelled
    await pg.click('#smsEnabledToggle'); await pg.wait_for_timeout(700); chk('D: master OFF -> all off',await on()==[False]*3)
    print('errors:',S.errors); await S.stop()
asyncio.run(main())
