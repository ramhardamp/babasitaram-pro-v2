import asyncio,sys,os,re,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
"""Giving/Receiving maths, gross running total, history == PDF, edit/delete recalculation, no +/- signs."""
R=[]
def ok(n,c,x=''): R.append(bool(c)); print('PASS' if c else 'FAIL','::',n,(' | '+str(x)) if not c else '')
async def fs(pg,prefix): return await pg.evaluate("p=>{const s=JSON.parse(localStorage.getItem('__FS'));return Object.keys(s).filter(k=>k.startsWith(p)).map(k=>[k,s[k]])}",prefix)
def digits(s): return int(re.sub(r'[^\d]','',s) or 0)
async def txn(pg,kind,amt):
    await pg.evaluate(f"openTxnModal('{kind}')"); await pg.wait_for_timeout(300)
    await pg.fill('#mAmt',str(amt)); await pg.click('#activeModal .txn-save'); await pg.wait_for_timeout(800)
async def main():
    S=Session(); pg=await S.start(seed=seed_script(parties=[{'id':'p1','name':'Suresh Test','phone':'9000000001','balance':0,'viewToken':'T'*32}]),logged_in=True)
    popups=[]
    pg.context.on('page',lambda p:popups.append(p))
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_selector('.customer-card'); 
    await pg.click('.customer-card'); await pg.wait_for_selector('#screen-customer.active')
    await txn(pg,'udhaar',5000)
    bal=await pg.inner_text('.single-balance-summary strong'); ok('after Giving 5000: balance 5000',digits(bal)==5000,bal)
    ok('balance shows no +/- sign',not re.search(r'[+\-−]',bal),bal)
    await txn(pg,'jama',2000)
    bal=await pg.inner_text('.single-balance-summary strong'); ok('after Receiving 2000: balance 3000',digits(bal)==3000,bal)
    tot=await pg.eval_on_selector_all('.history-totals b','e=>e.map(x=>x.textContent)')
    ok('history totals: given 5000 / received 2000 / gross 7000',[digits(x) for x in tot]==[5000,2000,7000],tot)
    rows=await pg.eval_on_selector_all('.txn-item','e=>e.map(x=>({amt:x.querySelector(".txn-amt").textContent,bal:x.querySelector(".txn-running-balance").textContent,gross:x.querySelector(".txn-running-gross").textContent}))')
    ok('newest row: amount 2000, balance 3000, gross 7000',(digits(rows[0]['amt']),digits(rows[0]['bal']),digits(rows[0]['gross']))==(2000,3000,7000),rows[0])
    ok('older row: amount 5000, balance 5000, gross 5000',(digits(rows[1]['amt']),digits(rows[1]['bal']),digits(rows[1]['gross']))==(5000,5000,5000),rows[1])
    ok('no +/- in any history amount',not any(re.search(r'[+\-−]',r['amt']+r['bal']+r['gross']) for r in rows),rows)
    # PDF (statement window)
    await pg.evaluate("exportCustomerStatementPdf('p1',{from:'',to:''})"); await pg.wait_for_timeout(1500)
    html=''
    if popups:
        await popups[-1].wait_for_load_state(); html=await popups[-1].content()
    ok('PDF window opened with content',len(html)>500,len(html))
    txt=re.sub(r'<[^>]+>',' ',html); txt=re.sub(r'\s+',' ',txt)
    ok('PDF customer name',('Suresh Test' in txt))
    ok('PDF totals: कुल दिया 5,000 / कुल लिया 2,000 / ग्रॉस 7,000',all(x in txt for x in ['कुल दिया ₹5,000','कुल लिया ₹2,000','कुल लेन-देन (ग्रॉस) ₹7,000']),txt[txt.find('कुल दिया')-20:txt.find('कुल दिया')+160])
    trs=re.findall(r'<tr><td>.*?</tr>',html)
    cells=[[digits(c) for c in re.findall(r'<td class="right">(.*?)</td>',tr)] for tr in trs]
    ok('PDF has 2 entry rows',len(cells)==2,len(cells))
    ok('PDF row1: amount 5000, gross 5000, balance 5000',cells[0][:3]==[5000,5000,5000],cells[0])
    ok('PDF row2: amount 2000, gross 7000, balance 3000',cells[1][:3]==[2000,7000,3000],cells[1])
    ok('PDF current balance 3000',('कुल वर्तमान बाकी ₹3,000' in txt),'')
    m=re.search(r'.{30}(?:[+−]\s?₹|-\s?₹).{20}',txt); ok('PDF amounts have no +/- signs',not m,m.group(0) if m else '')
    # edit: change the 2000 receipt to 500 ; then delete the 5000 giving
    p=(await fs(pg,'users/u_test/transactions/'))
    jama=[k for k,v in p if v['type']=='jama'][0]; udh=[k for k,v in p if v['type']=='udhaar'][0]
    await pg.evaluate("""([k,a])=>{const f=JSON.parse(localStorage.getItem('__FS'));f[k].amount=a;localStorage.setItem('__FS',JSON.stringify(f))}""",[jama,500])
    await pg.reload(); await pg.wait_for_selector('.customer-card'); await pg.click('.customer-card'); await pg.wait_for_selector('#screen-customer.active')
    bal=await pg.inner_text('.single-balance-summary strong'); tot=await pg.eval_on_selector_all('.history-totals b','e=>e.map(x=>x.textContent)')
    ok('after edit receipt->500: balance 4500, totals 5000/500/5500',digits(bal)==4500 and [digits(x) for x in tot]==[5000,500,5500],(bal,tot))
    await pg.evaluate("""k=>{const f=JSON.parse(localStorage.getItem('__FS'));f[k].status='deleted';f[k].deletedAt='2026-01-01T00:00:00.000Z';localStorage.setItem('__FS',JSON.stringify(f))}""",udh)
    await pg.reload(); await pg.wait_for_selector('.customer-card'); await pg.click('.customer-card'); await pg.wait_for_selector('#screen-customer.active')
    bal=await pg.inner_text('.single-balance-summary strong'); tot=await pg.eval_on_selector_all('.history-totals b','e=>e.map(x=>x.textContent)')
    cls=await pg.get_attribute('.single-balance-summary','class')
    ok('after deleting the 5000 giving: only 500 received -> advance 500, totals 0/500/500',digits(bal)==500 and [digits(x) for x in tot]==[0,500,500] and 'received' in cls,(bal,tot,cls))
    ok('no page errors',not [e for e in S.errors if e[0]=='pageerror'],S.errors[:3])
    await S.stop(); print('RESULT',sum(R),'/',len(R)); sys.exit(0 if all(R) else 1)
asyncio.run(main())
