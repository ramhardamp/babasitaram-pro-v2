import asyncio
from lib import *
from t3_helpers import *
async def type_pin(pg,p,ms=1700):
    await pg.keyboard.type(p,delay=70); await pg.wait_for_timeout(ms)
async def pintxt(pg): return (await pg.evaluate("document.getElementById('screen-pin').innerText")).replace('\n',' | ')[:60]
async def go():
    S=Session(); pg=await S.start(seed=seed_script(parties=[{'id':'p1','name':'Suresh','phone':'','email':'','balance':0,'viewToken':'T'*32}]),logged_in=True)
    # forgot password
    pf=await S.ctx.new_page(); S.hook(pf); await pf.goto(BASE+'forgot-password.html'); await pf.wait_for_timeout(500)
    await pf.fill('#resetEmail','nobody@x.com'); await pf.click('#resetBtn'); await pf.wait_for_timeout(500)
    chk('forgot: unknown email error',(await pf.evaluate("document.getElementById('resetError').textContent")).strip()!='')
    await pf.fill('#resetEmail','shop@test.com'); await pf.click('#resetBtn'); await pf.wait_for_timeout(500)
    chk('forgot: sent msg',await pf.evaluate("!document.getElementById('resetSent').classList.contains('hidden')"))
    await pf.close()
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1300)
    # change PIN
    await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(300)
    await pg.evaluate("changePIN()"); await pg.wait_for_timeout(400)
    await type_pin(pg,'1234',1500); print('step2 (new PIN):',await pintxt(pg))     # 1) verify OLD pin
    await type_pin(pg,'5678',1500); print('step3 (confirm):',await pintxt(pg))     # 2) enter NEW pin
    await type_pin(pg,'5678',2500)                                                  # 3) confirm NEW pin
    print('after change screen:',await active(pg))
    chk('returned to settings after PIN change',await active(pg)=='screen-settings',await active(pg))
    u=await fsdoc(pg,'users/u_test'); chk('pin hash changed',u['pinHash']!=PIN['pinHash'])
    # lock & unlock with old/new
    await pg.evaluate("lockApp()"); await pg.wait_for_timeout(400)
    await type_pin(pg,'1234',1500); chk('old PIN rejected',await active(pg)=='screen-pin')
    await type_pin(pg,'5678',1800); chk('new PIN unlocks',await active(pg)=='screen-dashboard',await active(pg))
    # offline write blocked
    await pg.locator('.customer-card').click(); await pg.wait_for_timeout(400)
    await S.ctx.set_offline(True); await pg.evaluate("window.dispatchEvent(new Event('offline'))"); await pg.wait_for_timeout(400)
    await pg.click('button.action-btn.udhaar'); await pg.wait_for_timeout(300)
    await pg.fill('#mAmt','50'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(700)
    n=len([1 for k,v in await fsall(pg,'users/u_test/transactions/')])
    print('offline: txns stored',n,'| toast:',await toast(pg),'| status:',await pg.evaluate("(document.getElementById('onlineStatus')||document.querySelector('.status-pill,.online-status')||{}).textContent"))
    print('outbox:',await pg.evaluate("Object.keys(localStorage).filter(k=>/outbox|queue|pending/i.test(k)).map(k=>k+'='+localStorage.getItem(k).slice(0,120))"))
    print('modal open offline:',await modal_open(pg))
    await S.ctx.set_offline(False); await pg.evaluate("window.dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(4000)
    ts=await fsall(pg,'users/u_test/transactions/'); chk('queued txn synced after reconnect',len(ts)==1 and ts[0][1]['amount']==50,str(ts))
    b=(await fsdoc(pg,'users/u_test/parties/p1'))['balance']; chk('balance 50 after sync',b==50,str(b))
    if await modal_open(pg): await pg.evaluate("closeModal()")
    # logout
    await pg.evaluate("goBack()"); await pg.wait_for_timeout(300)
    await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(300)
    await pg.evaluate("()=>{showLogoutConfirm()}"); await pg.wait_for_timeout(2000)   # confirm() is auto-accepted by the harness
    chk('logout -> login page',pg.url.endswith('index.html'),pg.url)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1200)
    chk('dashboard blocked when logged out',pg.url.endswith('index.html') or 'index' in pg.url,pg.url)
    print('errors:',S.errors)
    await S.stop()
asyncio.run(go())
