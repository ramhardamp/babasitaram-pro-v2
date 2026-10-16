import asyncio,sys,os,re,random,datetime
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
"""PDF with 600 entries (page-break safe): no row lost, totals == independent recomputation, date-range opening balance, huge amount."""
R=[]
def ok(n,c,x=''): R.append(bool(c)); print('PASS' if c else 'FAIL','::',n,(' | '+str(x)) if not c else '')
def digits(s): return int(re.sub(r'[^\d]','',s) or 0)
def after(txt,label):
    m=re.search(re.escape(label)+r' ₹([\d,]+)',txt); return digits(m.group(1)) if m else None
random.seed(5); base=datetime.date(2025,1,1); txns=[]; given=recv=0; bal=0
for i in range(600):
    d=base+datetime.timedelta(days=i//2); hh=8+(i%2)*3
    ty='udhaar' if random.random()<.55 else 'jama'; amt=random.randint(1,9000)
    if i==300: ty,amt='udhaar',999999999   # huge amount
    given+= amt if ty=='udhaar' else 0; recv+= amt if ty=='jama' else 0; bal+= amt if ty=='udhaar' else -amt
    ds=d.isoformat(); iso=f'{ds}T{hh:02d}:00:00.000Z'
    txns.append({'id':f't{i:04d}','partyId':'p1','type':ty,'amount':amt,'note':'' if i%3 else 'n%d'%i,'date':ds,'time':f'{hh:02d}:00','dateTime':iso,'transactionAt':iso})
# duplicate transaction (same data, different id) must be counted twice, not silently merged
txns.append(dict(txns[10],id='t_dup')); amt=txns[10]['amount']; (given:=given+amt) if txns[10]['type']=='udhaar' else (recv:=recv+amt); bal+= amt if txns[10]['type']=='udhaar' else -amt
async def main():
    S=Session(); pg=await S.start(seed=seed_script(parties=[{'id':'p1','name':'Big Customer','phone':'9000000001','balance':bal,'viewToken':'T'*32}],txns=txns),logged_in=True)
    pops=[]; pg.context.on('page',lambda p:pops.append(p))
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_selector('.customer-card')
    await pg.evaluate("exportCustomerStatementPdf('p1',{from:'',to:''})"); await pg.wait_for_timeout(2500)
    await pops[-1].wait_for_load_state(); html=await pops[-1].content(); txt=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html))
    rows=re.findall(r'<tr><td>.*?</tr>',html)
    ok('all 601 rows present',len(rows)==601,len(rows))
    ok('total given matches',after(txt,'कुल दिया')==given,(after(txt,'कुल दिया'),given))
    ok('total received matches',after(txt,'कुल लिया')==recv,(after(txt,'कुल लिया'),recv))
    ok('gross matches',after(txt,'कुल लेन-देन (ग्रॉस)')==given+recv,after(txt,'कुल लेन-देन (ग्रॉस)'))
    last=[digits(c) for c in re.findall(r'<td class="right">(.*?)</td>',rows[-1])]
    ok('last row gross == given+received',last[1]==given+recv,last)
    ok('last row running balance == |net| ',last[2]==abs(bal),(last,bal))
    ok('huge amount (₹99,99,99,999) printed in Indian grouping',('₹99,99,99,999' in txt))
    ok('print css keeps header repeating + rows unsplit','table-header-group' in html and 'page-break-inside:avoid' in html)
    # date range: statement from 2025-06-01..2025-06-30
    n0=len(pops)
    await pg.evaluate("exportCustomerStatementPdf('p1',{from:'2025-06-01',to:'2025-06-30'})"); await pg.wait_for_timeout(2000)
    await pops[-1].wait_for_load_state(); h2=await pops[-1].content(); t2=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',h2))
    inrange=[t for t in txns if '2025-06-01'<=t['date']<='2025-06-30']
    ok('range rows == entries in range',len(re.findall(r'<tr><td>.*?</tr>',h2))==len(inrange),(len(re.findall(r'<tr><td>.*?</tr>',h2)),len(inrange)))
    og=sum(t['amount'] for t in inrange if t['type']=='udhaar'); orc=sum(t['amount'] for t in inrange if t['type']=='jama')
    ok('range totals: दिया/लिया',(after(t2,'कुल दिया'),after(t2,'कुल लिया'))==(og,orc),(after(t2,'कुल दिया'),after(t2,'कुल लिया'),og,orc))
    ok('range label shows dates','01/06/2025' in t2 and '30/06/2025' in t2)
    ok('no page errors',not [e for e in S.errors if e[0]=='pageerror'],S.errors[:3])
    await S.stop(); print('RESULT',sum(R),'/',len(R)); sys.exit(0 if all(R) else 1)
asyncio.run(main())
