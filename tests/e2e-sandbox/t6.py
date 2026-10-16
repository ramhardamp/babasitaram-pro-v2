import asyncio,datetime
from lib import *
from t3_helpers import *
async def pin(pg,ms=1800):
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(ms)
async def main():
    S=Session(); today=datetime.date.today().isoformat()
    parties=[{'id':'p1','name':'Suresh','phone':'9000000001','email':'','balance':0,'viewToken':'T'*32},
             {'id':'p2','name':'Empty','phone':'','email':'','balance':0,'viewToken':'U'*32}]
    txns=[{'id':'L1','partyId':'p1','type':'byaj_loan','principal':5000,'rate':2,'startDate':today,'date':today,'time':'10:00','status':'active','interestPaid':0,'repayments':[],'note':'x','dateTime':today+'T04:30:00.000Z'},
          {'id':'L2','partyId':'p1','type':'byaj_loan','principal':3000,'rate':3,'startDate':today,'date':today,'time':'10:00','status':'active','interestPaid':0,'repayments':[{'amount':500,'date':today}],'note':'y','dateTime':today+'T04:30:00.000Z'}]
    pg=await S.start(seed=seed_script(parties=parties,txns=txns),logged_in=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1200)
    await pg.locator('.customer-card:has-text("Suresh")').click(); await pg.wait_for_timeout(500)
    chk('2 loan cards',await pg.locator('.loan-card').count()==2)
    # edit loan 1 rate
    await pg.locator('.loan-menu-btn').first.click(); await pg.wait_for_timeout(300)
    await pg.click('#activeModal [aria-label=Menu]'); await pg.wait_for_timeout(200)   # loan menu items now live in a drop-down
    await pg.click('#activeModal button:has-text("लोन एडिट")'); await pg.wait_for_timeout(300); await pin(pg)
    chk('back on customer after PIN',await active(pg)=='screen-customer',await active(pg))
    await pg.fill('#mRate','4'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(900)
    L=[await fsdoc(pg,'users/u_test/transactions/L1'),await fsdoc(pg,'users/u_test/transactions/L2')]
    chk('a loan rate became 4',any(l['rate']==4 for l in L))
    await pg.evaluate("()=>{if(document.getElementById('activeModal'))closeModal()}"); await pg.wait_for_timeout(300)   # loan profile page stays open after a save
    # loan with repayments: delete must be blocked, principal change blocked
    cards=await pg.locator('.loan-card').count()
    idx=[i for i in range(cards) if '3,000' in await pg.locator('.loan-card').nth(i).inner_text()]
    chk('found loan w/ repayments card',len(idx)==1)
    await pg.locator('.loan-menu-btn').nth(idx[0]).click(); await pg.wait_for_timeout(300)
    await pg.click('#activeModal [aria-label=Menu]'); await pg.wait_for_timeout(200)   # loan menu items now live in a drop-down
    await pg.click('#activeModal button:has-text("लोन डिलीट")'); await pg.wait_for_timeout(300); await pin(pg,2200)
    chk('loan with payments NOT deleted',(await fsdoc(pg,'users/u_test/transactions/L2')).get('status')=='active')
    await pg.evaluate("()=>{if(document.getElementById('activeModal'))closeModal()}"); await pg.wait_for_timeout(300)
    # delete loan without payments
    i2=1-idx[0]
    await pg.locator('.loan-menu-btn').nth(i2).click(); await pg.wait_for_timeout(300)
    await pg.click('#activeModal [aria-label=Menu]'); await pg.wait_for_timeout(200)   # loan menu items now live in a drop-down
    await pg.click('#activeModal button:has-text("लोन डिलीट")'); await pg.wait_for_timeout(300); await pin(pg,2200)
    chk('clean loan soft-deleted',(await fsdoc(pg,'users/u_test/transactions/L1')).get('status')=='deleted')
    # customer with history cannot be deleted
    await pg.click('button.more-btn'); await pg.wait_for_timeout(300)
    await pg.click('.more-row:has-text("ग्राहक एडिट")'); await pg.wait_for_timeout(300); await pin(pg,1500)
    chk('edit customer modal open',await pg.query_selector('#mName') is not None)
    chk('balance field readonly',await pg.evaluate("document.getElementById('mBal').disabled"))
    await pg.fill('#mEmail','bad'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(300)
    chk('edit: bad email blocked',await modal_open(pg))
    await pg.fill('#mEmail','a@b.co')
    await pg.evaluate("()=>{const e=document.getElementById('mPhone');e.value='98765 43210';e.dispatchEvent(new Event('input',{bubbles:true}))}")
    chk('paste formatted phone keeps 10 digits',await pg.input_value('#mPhone')=='9876543210',await pg.input_value('#mPhone'))
    await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(800)
    p1=await fsdoc(pg,'users/u_test/parties/p1'); chk('customer updated',p1['phone']=='9876543210' and p1['email']=='a@b.co',str(p1))
    await pg.click('button.more-btn'); await pg.click('.more-row:has-text("ग्राहक एडिट")'); await pg.wait_for_timeout(300); await pin(pg,1500)
    await pg.click('#activeModal .btn-danger'); await pg.wait_for_timeout(900)
    chk('delete blocked when history',await fsdoc(pg,'users/u_test/parties/p1') is not None)
    await pg.evaluate("closeModal()")
    # delete empty customer
    await pg.evaluate("goBack()"); await pg.wait_for_timeout(500)
    chk('back to dashboard',await active(pg)=='screen-dashboard',await active(pg))
    await pg.locator('.customer-card:has-text("Empty")').click(); await pg.wait_for_timeout(400)
    await pg.click('button.more-btn'); await pg.click('.more-row:has-text("ग्राहक एडिट")'); await pg.wait_for_timeout(300); await pin(pg,1500)
    await pg.click('#activeModal .btn-danger'); await pg.wait_for_timeout(1000)
    chk('empty customer deleted',await fsdoc(pg,'users/u_test/parties/p2') is None)
    chk('its public view deleted',await fsdoc(pg,'publicViews/'+'U'*32) is None)
    chk('landed on dashboard',await active(pg)=='screen-dashboard',await active(pg))
    # settings rate validation
    await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(400)
    await pg.evaluate("openSettingsPanel('advanced')"); await pg.wait_for_timeout(300)
    await pg.fill('#sDefaultRate','-3'); await pg.click('.settings-panel-save'); await pg.wait_for_timeout(500)
    chk('negative rate rejected (panel stays)',await pg.query_selector('#settingsPanelOverlay') is not None)
    await pg.fill('#sDefaultRate','2.5'); await pg.click('.settings-panel-save'); await pg.wait_for_timeout(600)
    chk('rate 2.5 saved',(await fsdoc(pg,'users/u_test'))['defaultRate']==2.5)
    chk('panel closed',await pg.query_selector('#settingsPanelOverlay') is None)
    print('errors:',[e for e in S.errors if 'already' not in e[2]]); print('external:',EXTERNAL)
    await S.stop()
asyncio.run(main())
