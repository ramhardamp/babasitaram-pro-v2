import asyncio,datetime
from lib import *
from t3_helpers import *
from t7 import data
async def pin(pg,ms=1800):
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(ms)
async def main():
    S=Session(); parties,txns=data()
    pg=await S.start(seed=seed_script(parties=parties,txns=txns),logged_in=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1200)
    await pg.locator('.customer-card:has-text("Suresh")').click(); await pg.wait_for_timeout(400)
    await pg.click('button.action-btn.udhaar'); await pg.fill('#mAmt','100'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(900)
    pv=await fsall(pg,'publicViews/'); print('public views:',[(k[-6:],v.get('balance'),v.get('totalOutstanding')) for k,v in pv])
    tok='T'*32
    # portal page
    pg2=await S.ctx.new_page(); S.hook(pg2)
    await pg2.goto(BASE+'customer-view.html?token='+tok); await pg2.wait_for_timeout(1000)
    txt=await pg2.evaluate("document.getElementById('contentScreen').innerText"); print('portal:',txt.replace('\n',' | ')[:260])
    chk('portal shows shop+balance',('Test Dukan' in txt) and ('1,600' in txt),txt[:100])
    await pg2.screenshot(path='s_portal.png')
    for bad,label in [('','no token'),('short','malformed'),('Z'*32,'unknown')]:
        await pg2.goto(BASE+'customer-view.html'+('?token='+bad if bad else '')); await pg2.wait_for_timeout(600)
        vis=await pg2.evaluate("!document.getElementById('errorScreen').classList.contains('hidden')")
        chk('portal error for '+label,vis)
    # XSS in name
    await pg.evaluate("db.collection('users').doc('u_test').collection('parties').doc('p1').update({name:'<img src=x onerror=window.__xss=1>'})"); await pg.wait_for_timeout(600)
    chk('XSS escaped on dashboard',not await pg.evaluate("!!window.__xss"))
    await pg.evaluate("db.collection('users').doc('u_test').collection('parties').doc('p1').update({name:'Suresh'})")
    # revoke link
    await pg.click('button.more-btn'); await pg.wait_for_timeout(300)
    await pg.click('.more-row:has-text("पुराना लिंक")'); await pg.wait_for_timeout(300); 
    await pg.wait_for_timeout(1500)
    p1=await fsdoc(pg,'users/u_test/parties/p1'); print('token rotated:',p1['viewToken']!=tok, '| toast:',await toast(pg), '| modal:',await modal_open(pg))
    old=await fsdoc(pg,'publicViews/'+tok); print('old view:',{k:old.get(k) for k in ('revokedAt','expiresAt')} if old else None)
    await pg2.goto(BASE+'customer-view.html?token='+tok); await pg2.wait_for_timeout(700)
    chk('old link closed after revoke',await pg2.evaluate("!document.getElementById('errorScreen').classList.contains('hidden')"))
    await pg2.goto(BASE+'customer-view.html?token='+p1['viewToken']); await pg2.wait_for_timeout(700)
    chk('new link works',await pg2.evaluate("!document.getElementById('contentScreen').classList.contains('hidden')"))
    print('errors:',[e for e in S.errors]); print('external:',EXTERNAL[:5])
    await S.stop()
asyncio.run(main())
