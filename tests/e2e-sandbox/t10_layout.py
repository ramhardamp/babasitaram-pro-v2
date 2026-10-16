import asyncio,datetime,json
from lib import *
from t3_helpers import *
OVER="""()=>{const W=document.documentElement.clientWidth,H=innerHeight;const bad=[];
 const sc=el=>{for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p).overflowX;if((o==='auto'||o==='scroll'||o==='hidden')&&p.scrollWidth>=p.clientWidth&&p.clientWidth<W+2&&p.getBoundingClientRect().right<=W+1)return true}return false};
 document.querySelectorAll('body *').forEach(el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||el.closest('svg'))return;const r=el.getBoundingClientRect();if(r.width===0||r.height===0)return;
  if(r.right>W+1||r.left<-1){if(!sc(el)&&!el.closest('.hidden')&&el.offsetParent!==null)bad.push((el.id||el.className||el.tagName).toString().slice(0,40)+' '+Math.round(r.left)+'→'+Math.round(r.right))}});
 return {docOverflow:document.documentElement.scrollWidth>W+1,bad:[...new Set(bad)].slice(0,6)}}"""
async def main():
    today=datetime.date.today().isoformat()
    long='रामेश्वर प्रसाद विश्वकर्मा एंड संस जनरल स्टोर्स अत्यंत लंबा नाम ' *2
    parties=[{'id':'p1','name':long,'phone':'9000000001','email':'averyveryveryveryverylongemailaddress@subdomain.example-company.com','balance':123456789,'viewToken':'T'*32},
             {'id':'p2','name':'Short','phone':'','email':'','balance':0,'viewToken':'U'*32}]
    txns=[{'id':'t1','partyId':'p1','type':'udhaar','amount':123456789,'note':'बहुत लंबा नोट '*8,'date':today,'time':'10:00','dateTime':today+'T04:30:00.000Z'},
          {'id':'L1','partyId':'p1','type':'byaj_loan','principal':99999999,'rate':2,'startDate':'2025-01-01','date':'2025-01-01','time':'10:00','status':'active','interestPaid':0,'repayments':[],'note':'x'*40,'dateTime':'2025-01-01T04:30:00.000Z'}]
    results=[]
    import sys
    VPS=[(320,568),(360,640),(390,844),(768,1024),(740,360)]
    for vp in ([VPS[int(sys.argv[1])]] if len(sys.argv)>1 else VPS):   # no arg = every viewport
        for dark in (False,True):
            S=Session(); pg=await S.start(viewport=vp,seed=seed_script(parties=parties,txns=txns),logged_in=True)
            await pg.add_init_script(f"localStorage.setItem('bsp_dark_mode','{'1' if dark else '0'}')")
            await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1300)
            tag=f"{vp[0]}x{vp[1]}{'-dark' if dark else ''}"
            async def probe(name):
                r=await pg.evaluate(OVER); results.append((tag,name,r))
                if r['docOverflow'] or r['bad']: print('OVERFLOW',tag,name,r)
            await probe('dashboard')
            print('step customer',tag,flush=True); await pg.locator('.customer-card').first.click(timeout=8000); await pg.wait_for_timeout(500); await probe('customer')
            await pg.click('button.more-btn'); await pg.wait_for_timeout(300); await probe('more-menu'); await pg.evaluate("closeModal()")
            await pg.click('button.action-btn.udhaar'); await pg.wait_for_timeout(300); await probe('txn-modal'); await pg.evaluate("closeModal()")
            await pg.evaluate("showTxnMenu('t1')"); await pg.wait_for_timeout(300); await probe('txn-menu'); await pg.evaluate("closeModal()")
            await pg.evaluate("goBack()"); await pg.wait_for_timeout(300)
            await pg.click('.btab[data-view=reports]'); await pg.wait_for_timeout(500); await probe('reports')
            await pg.click('.btab[data-view=settings]'); await pg.wait_for_timeout(400); await probe('settings')
            for sec in ['profile','security','sms','upi','data','advanced','about']:
                await pg.evaluate(f"openSettingsPanel('{sec}')"); await pg.wait_for_timeout(250); await probe('settings-'+sec); await pg.evaluate("closeSettingsPanel()")
            if vp==(360,640) and not dark: await pg.screenshot(path='s_set360.png')
            # login-like pages
            for page in ['index.html','signup.html','forgot-password.html']:
                p2=await S.ctx.new_page(); S.hook(p2); await p2.goto(BASE+page); await p2.wait_for_timeout(500)
                r=await p2.evaluate(OVER); results.append((tag,page,r))
                if r['docOverflow'] or r['bad']: print('OVERFLOW',tag,page,r)
                await p2.close()
            if S.errors: print('ERR',tag,S.errors[:3])
            await S.stop()
    print('checked',len(results),'probes; overflow count',sum(1 for _,_,r in results if r['docOverflow'] or r['bad']))
if __name__=='__main__': asyncio.run(main())
