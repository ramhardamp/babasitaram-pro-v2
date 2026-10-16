import asyncio,sys,datetime
import os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
"""HOME v3 layout: 320/360/412 px par overlap nahi, sideways scroll nahi, page-scroll chalta, sticky search, FAB tabs ke upar, light+dark."""
today=datetime.date.today().isoformat()
names=['Davender Kumar','Ronald Stewart','George Roberts','Dennis Brooks','Vikram Singh Rajput','Anita Sharma','Mohammad Irfan Qureshi Sahab','Pooja Verma']
parties=[{'id':f'p{i}','name':n,'phone':f'98765000{i:02d}','type':'customer','createdAt':i} for i,n in enumerate(names)]
txns=[{'id':f't{i}','partyId':f'p{i}','type':'udhaar','amount':500*(i+1),'note':'n','date':today,'dateTime':today+'T01:30:00.000Z','transactionAt':today+'T01:30:00.000Z'} for i in range(len(names))]
R=[]
def ok(n,c,x=''): R.append(bool(c)); print('PASS' if c else 'FAIL','::',n,(' | '+str(x)) if not c else '')
JS="""(()=>{const R=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right}};const q=s=>document.querySelector(s);
 const blocks=['.top-bar','.dash-hero','.customer-search-wrap','.tabs','.customer-card'].map(s=>[s,R(q(s))]);
 const sc=q('#screenContainer');
 return {blocks,fab:R(q('#fab')),tabs:R(q('#bottomTabs')),hscroll:document.documentElement.scrollWidth>innerWidth||sc.scrollWidth>sc.clientWidth,
  clipped:[...document.querySelectorAll('.dash-split-value,.cc-box-value,.cc-name')].filter(e=>e.scrollWidth>e.clientWidth+1).length,
  scrollable:sc.scrollHeight>sc.clientHeight}})()"""
async def run(w,h,theme):
    s=Session(); seed=seed_script(parties=parties,txns=txns)+f"\ntry{{localStorage.setItem('bsp_theme','{theme}')}}catch(e){{}}"
    pg=await s.start(viewport=(w,h),seed=seed,logged_in=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(2500)
    i=await pg.evaluate(JS); tag=f'{w}x{h} {theme}'
    tops=[b[1] for b in i['blocks'] if b[1]]
    # upar se neeche: top-bar -> hero -> search -> tabs -> card, ek doosre par chadhte nahi (search/tabs sticky hain, isliye next ka top >= pichhla bottom-1)
    seq=[b for b in i['blocks'] if b[1]]
    over=[(a[0],b[0]) for a,b in zip(seq,seq[1:]) if b[1]['t']<a[1]['b']-1]
    ok(f'{tag}: blocks overlap nahi',not over,over)
    ok(f'{tag}: sideways scroll nahi',not i['hscroll']); ok(f'{tag}: text kata nahi',i['clipped']==0,i['clipped'])
    ok(f'{tag}: FAB bottom-tabs ke upar (overlap nahi)',i['fab']['b']<=i['tabs']['t']+0.5,(i['fab'],i['tabs']))
    ok(f'{tag}: page scroll hota hai',i['scrollable'])
    await pg.evaluate("document.getElementById('screenContainer').scrollTo(0,99999)"); await pg.wait_for_timeout(300)
    st=await pg.evaluate("(()=>{const r=document.querySelector('.customer-search-wrap').getBoundingClientRect();return [r.top,document.getElementById('screenContainer').scrollTop]})()")
    ok(f'{tag}: scroll ke baad search upar chipka',abs(st[0]-(await pg.evaluate("document.querySelector('.top-bar').getBoundingClientRect().bottom")))<2 and st[1]>0,st)
    ok(f'{tag}: JS error nahi',not s.errors,s.errors[:2]); await s.stop()
async def main():
    for w,h in [(320,640),(360,780),(412,915)]:
        for th in ['light','dark']: await run(w,h,th)
    print('TOTAL',sum(R),'/',len(R))
asyncio.run(main())
