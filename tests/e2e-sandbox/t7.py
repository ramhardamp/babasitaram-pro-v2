import asyncio,datetime,json
from lib import *
from t3_helpers import *
async def pin(pg,p='1234',ms=1800):
    await pg.keyboard.type(p,delay=60); await pg.wait_for_timeout(ms)
def data():
    today=datetime.date.today().isoformat()
    parties=[{'id':'p1','name':'Suresh','phone':'9000000001','email':'','balance':1500,'viewToken':'T'*32},
             {'id':'p2','name':'Mahesh','phone':'9000000002','email':'','balance':0,'viewToken':'U'*32}]
    txns=[{'id':'t1','partyId':'p1','type':'udhaar','amount':2000,'note':'a','date':today,'time':'10:00','dateTime':today+'T04:30:00.000Z','transactionAt':today+'T04:30:00.000Z'},
          {'id':'t2','partyId':'p1','type':'jama','amount':500,'note':'b','date':today,'time':'11:00','dateTime':today+'T05:30:00.000Z','transactionAt':today+'T05:30:00.000Z'},
          {'id':'L1','partyId':'p2','type':'byaj_loan','principal':5000,'rate':2,'startDate':today,'date':today,'time':'10:00','status':'active','interestPaid':0,'repayments':[],'note':'x','dateTime':today+'T04:30:00.000Z'}]
    return parties,txns
async def main():
    S=Session(); parties,txns=data()
    pg=await S.start(seed=seed_script(parties=parties,txns=txns),logged_in=True,accept_downloads=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1200)
    # reports
    await pg.click('.btab[data-view=reports]'); await pg.wait_for_timeout(500)
    print('reports text:',(await pg.evaluate("document.getElementById('screen-reports').innerText")).replace('\n',' | ')[:300])
    # language
    await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(400)
    await pg.evaluate("setLang('en')"); await pg.wait_for_timeout(300)
    chk('English applied',await pg.evaluate("document.querySelector('.btab[data-view=reports]').innerText.toLowerCase().includes('report')"))
    await pg.evaluate("setLang('hi')"); await pg.wait_for_timeout(300)
    # dark mode
    await pg.evaluate("BspTheme.toggle()"); chk('dark on',await pg.evaluate("document.documentElement.getAttribute('data-theme')==='dark'"))
    await pg.screenshot(path='s_dark_settings.png',full_page=False)
    await pg.evaluate("BspTheme.toggle()")
    # integrity
    await pg.evaluate("verifyDataIntegrity()"); await pg.wait_for_timeout(500); print('integrity toast:',await toast(pg))
    # backup export
    await pg.click('.btab[data-view=dashboard]'); await pg.wait_for_timeout(300)
    await pg.locator('.customer-card:has-text("Suresh")').click(); await pg.wait_for_timeout(400)
    async with pg.expect_download() as d:
        await pg.evaluate("()=>{exportData()}")   # Backup/CSV/Import moved to Settings
    dl=await d.value; path='/tmp/backup.json'; await dl.save_as(path)
    b=json.load(open(path)); chk('backup counts',b['counts']=={'customers':2,'transactions':3},str(b['counts']))
    chk('backup checksum hex',len(b['integrity']['checksumSha256'])==64)
    # CSV
    async with pg.expect_download() as d2:
        await pg.evaluate("()=>{exportCsvData()}")
    dl2=await d2.value; await dl2.save_as('/tmp/c1.csv'); print('csv head:',open('/tmp/c1.csv',encoding='utf-8-sig').read()[:120].replace('\r\n',' / '))
    await S.stop()
    # ---- fresh account import ----
    S2=Session(); pg=await S2.start(seed=seed_script(),logged_in=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1200)
    await pg.locator('#fab').click() if False else await pg.evaluate("openAddCustomer()")
    await pg.fill('#mName','Temp'); await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(800)
    await pg.locator('.customer-card:has-text("Temp")').click(); await pg.wait_for_timeout(400)
    await pg.evaluate("()=>{openImportBackup()}"); await pg.wait_for_selector('#importBackupFile',state='attached')
    await pg.set_input_files('#importBackupFile',path); await pg.wait_for_timeout(1500)
    print('preview:',(await pg.evaluate("document.getElementById('activeModal')?.innerText||''")).replace('\n',' | ')[:300])
    await pg.click('#activeModal :is(.modal-actions,.txn-actions) > button:last-child'); await pg.wait_for_timeout(2500)
    print('result:',(await pg.evaluate("document.getElementById('activeModal')?.innerText||''")).replace('\n',' | ')[:200])
    await pg.evaluate("closeModal()")
    ps=await fsall(pg,'users/u_test/parties/'); ts=await fsall(pg,'users/u_test/transactions/')
    chk('imported 2 new + Temp = 3 customers',len(ps)==3,str(len(ps)))
    chk('imported 3 txns',len(ts)==3,str(len(ts)))
    bal=sorted(p['balance'] for k,p in ps); chk('balances preserved',bal==[0,0,1500],str(bal))
    # re-import same file => duplicates skipped
    await pg.click('button.more-btn') if False else None
    await pg.evaluate("goBack()"); await pg.wait_for_timeout(400)
    print('errors:',S2.errors, S.errors); 
    await S2.stop()
if __name__=="__main__": asyncio.run(main())
