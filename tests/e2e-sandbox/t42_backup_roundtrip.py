import asyncio,sys,os,json,datetime,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
"""Backup export -> import into an EMPTY app -> re-import (no-op) -> tampered / truncated / wrong files rejected. Mock data only."""
R=[]
def ok(n,c,x=''): R.append(bool(c)); print('PASS' if c else 'FAIL','::',n,(' | '+str(x)) if not c else '')
T='2026-09-01'
parties=[{'id':'a','name':'Ram','phone':'9876543210','balance':300,'viewToken':'A'*32},{'id':'b','name':'Shyam','phone':'9876500000','balance':0,'viewToken':'B'*32},{'id':'c','name':'Empty','phone':'','balance':0,'viewToken':'C'*32}]
txns=[{'id':'t1','partyId':'a','type':'udhaar','amount':500,'note':'x','date':T,'time':'10:00','dateTime':T+'T10:00:00.000Z'},
      {'id':'t2','partyId':'a','type':'jama','amount':200,'note':'','date':'2026-09-05','time':'11:00','dateTime':'2026-09-05T11:00:00.000Z'},
      {'id':'L1','partyId':'b','type':'byaj_loan','principal':10000,'amount':10000,'rate':2,'startDate':'2026-04-10','date':'2026-04-10','status':'active','repayments':[]},
      {'id':'t3','partyId':'b','type':'loan_repay','amount':1000,'loanId':'L1','date':'2026-06-10'},
      {'id':'t4','partyId':'b','type':'interest_paid','amount':200,'loanId':'L1','date':'2026-06-11'}]
async def snapshot(pg):
    return await pg.evaluate("""()=>{const s=JSON.parse(localStorage.getItem('__FS')||'{}');const P={},X=[];
      for(const k of Object.keys(s)){if(/\\/parties\\/[^/]+$/.test(k))P[k.split('/').pop()]=s[k];else if(/\\/transactions\\/[^/]+$/.test(k))X.push(s[k])}
      return {parties:Object.values(P).map(p=>[p.name,p.balance||0]).sort(),txns:X.map(t=>[t.type,t.amount||t.principal,t.partyId]).length,
              amounts:X.map(t=>t.type+':'+(t.amount||t.principal)).sort()}}""")
async def do_import(pg,path):
    await pg.evaluate("()=>openImportBackup()"); await pg.wait_for_selector('#importBackupFile',state='attached')
    await pg.set_input_files('#importBackupFile',path)
    for _ in range(60):
        await pg.wait_for_timeout(250)
        t=await pg.evaluate("()=>{const m=document.getElementById('activeModal');if(m)return 'MODAL '+m.innerText;const x=[...document.querySelectorAll('[class*=toast]')].map(e=>e.textContent.trim()).filter(Boolean).join(' | ');return x?'TOAST '+x:''}")
        if t: return re.sub(r'\s+',' ',t)
    return 'NOTHING'
async def main():
    os.makedirs('/tmp/bk',exist_ok=True)
    A=Session(); pa=await A.start(seed=seed_script(parties=parties,txns=txns),logged_in=True)
    await pa.goto(BASE+'dashboard.html'); await pa.wait_for_selector('.customer-card')
    payload=await pa.evaluate("async()=>{const d=await buildBackupPayload();await verifyBackupPayloadChecksum(d);return d}")
    ok('export builds and self-verifies checksum',bool(payload['integrity']['checksumSha256']) and payload['counts']=={'customers':3,'transactions':5},payload['counts'])
    s=json.dumps(payload); ok('export has no PIN data / public-link tokens',not any(b in s for b in ['pinHash','pinSalt','viewToken','AAAAAAAA']))
    json.dump(payload,open('/tmp/bk/good.json','w'))
    bad=json.loads(s); bad['data']['transactions'][0]['amount']=99999; json.dump(bad,open('/tmp/bk/tampered.json','w'))
    open('/tmp/bk/trunc.json','w').write(s[:len(s)//2]); open('/tmp/bk/notjson.json','w').write('hello')
    json.dump({'schemaVersion':1,'data':{}},open('/tmp/bk/oldschema.json','w'))
    await A.stop()
    B=Session(); pb=await B.start(seed=seed_script(parties=[],txns=[]),logged_in=True)
    await pb.goto(BASE+'dashboard.html'); await pb.wait_for_timeout(800)
    before=await snapshot(pb)
    for name,exp in [('tampered','Checksum'),('trunc','JSON'),('notjson','JSON'),('oldschema','schema')]:
        m=await do_import(pb,f'/tmp/bk/{name}.json'); ok(f'{name} file rejected with clear message, no data touched',exp.lower() in m.lower() and (await snapshot(pb))==before,m[:140]); await pb.evaluate("()=>closeModal()")
    m=await do_import(pb,'/tmp/bk/good.json'); ok('preview: 3 new customers, 5 transactions',('नए ग्राहक 3' in m) and ('जोड़े जाने वाले लेन-देन 5' in m),m[:260])
    await pb.click('#activeModal .btn-primary'); await pb.wait_for_function("()=>document.querySelector('#activeModal')&&document.querySelector('#activeModal').innerText.includes('Import पूरा')",timeout=20000)
    after=await snapshot(pb); print(after)
    ok('imported 3 customers',[p[0] for p in after['parties']]==['Empty','Ram','Shyam'],after['parties'])
    ok('imported 5 transactions with same amounts',after['amounts']==sorted(['udhaar:500','jama:200','byaj_loan:10000','loan_repay:1000','interest_paid:200']),after['amounts'])
    bal={p[0]:p[1] for p in after['parties']}; ok('Ram balance == 300 (500 given - 200 received)',bal['Ram']==300,bal)
    await pb.evaluate("()=>closeModal()")
    m=await do_import(pb,'/tmp/bk/good.json'); ok('re-import: nothing new, button disabled, no duplicates',('कुछ नया नहीं' in m) and (await snapshot(pb))==after,m[:200])
    ok('no page errors',not [e for e in (A.errors+B.errors) if e[0]=='pageerror'],(A.errors+B.errors)[:3])
    await B.stop(); print('RESULT',sum(R),'/',len(R)); sys.exit(0 if all(R) else 1)
asyncio.run(main())
