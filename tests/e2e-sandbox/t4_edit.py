import asyncio,json,datetime
from lib import *
from t3_helpers import *
async def main():
    S=Session()
    today=datetime.date.today().isoformat()
    parties=[{'id':'p1','name':'Suresh','phone':'9000000001','email':'','balance':1500,'viewToken':'T'*32}]
    txns=[{'id':'t1','partyId':'p1','type':'udhaar','amount':2000,'note':'a','date':today,'time':'10:00','dateTime':today+'T04:30:00.000Z','transactionAt':today+'T04:30:00.000Z'},
          {'id':'t2','partyId':'p1','type':'jama','amount':500,'note':'b','date':today,'time':'11:00','dateTime':today+'T05:30:00.000Z','transactionAt':today+'T05:30:00.000Z'}]
    pg=await S.start(seed=seed_script(parties=parties,txns=txns),logged_in=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1200)
    await pg.click('.customer-card'); await pg.wait_for_timeout(500)
    print('items:',await pg.locator('.txn-item').count())
    # open txn menu for udhaar
    await pg.locator('.txn-item:has-text("दिया")').first.click(); await pg.wait_for_timeout(400)
    print('txn menu buttons:',await modal_buttons(pg))
    await pg.click('#activeModal button:has-text("एडिट")'); await pg.wait_for_timeout(400)
    await pg.wait_for_timeout(300); print('screen:',await active(pg))
    await pg.keyboard.type('9999',delay=60); await pg.wait_for_timeout(700)
    chk('wrong PIN rejected',await active(pg)=='screen-pin')
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(1000)
    print('screen after PIN:',await active(pg))
    if await pg.query_selector('#mAmt'):
        await pg.fill('#mAmt','2500'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(900)
    print('modal open:',await modal_open(pg),'toast:',await toast(pg))
    b=(await fsdoc(pg,'users/u_test/parties/p1'))['balance']; chk('edit udhaar 2000->2500 => balance 2000',b==2000,str(b))
    # delete jama (confirm+prompt auto accepted; prompt returns default '')
    await pg.locator('.txn-item:has-text("मिला")').first.click(); await pg.wait_for_timeout(400)
    print('menu2:',await modal_buttons(pg))
    await pg.click('#activeModal button:has-text("डिलीट"), #activeModal button:has-text("हटाएं"), #activeModal button:has-text("हटाएँ")'); await pg.wait_for_timeout(300)
    await pg.wait_for_timeout(300)
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(1800)
    b=(await fsdoc(pg,'users/u_test/parties/p1'))['balance']; chk('delete jama 500 => balance 2500',b==2500,str(b))
    t2=await fsdoc(pg,'users/u_test/transactions/t2'); chk('soft delete keeps record',t2 and t2.get('status')=='deleted')
    chk('deleted item shows in history',await pg.locator('.txn-item-deleted').count()==1)
    pv=(await fsall(pg,'publicViews/'))
    print('publicViews:',[(k,v.get('balance')) for k,v in pv])
    await pg.screenshot(path='s_hist.png')
    print('errors:',S.errors); print('external:',EXTERNAL)
    await S.stop()
asyncio.run(main())
