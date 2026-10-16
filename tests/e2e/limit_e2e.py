import asyncio, json
from playwright.async_api import async_playwright
INIT="""
window.__store={tx:{},party:{c1:{balance:1000}},writes:0};
(function(){const S=window.__store;
 const col=(name)=>({doc:(id)=>{id=id||('auto'+Math.random().toString(36).slice(2,10));return {id,get:async()=>({exists:!!(name==='transactions'?S.tx[id]:S.party[id]),data:()=>name==='parties'?S.party[id]:S.tx[id]}),set:async()=>{},update:async()=>{}}},onSnapshot:()=>()=>{},where:()=>col(name),orderBy:()=>col(name)});
 const fdb={enablePersistence:()=>Promise.resolve(),collection:(n)=>({doc:(uid)=>({collection:(sub)=>col(sub),get:async()=>({exists:false,data:()=>({})}),onSnapshot:()=>()=>{}})}),
   batch:()=>{const ops=[];return {set:(ref,d)=>ops.push(['set',ref,d]),update:(ref,d)=>ops.push(['upd',ref,d]),commit:async()=>{
     if(window.__failNext){window.__failNext=false;const e=new Error('net');e.code='unavailable';throw e}
     for(const [k,ref,d] of ops){ if(k==='set'){S.tx[ref.id]=d;S.writes++} else {S.party[ref.id].balance+=d.balance.__inc} } }}}};
 const fs=()=>fdb; fs.FieldValue={serverTimestamp:()=>'TS',increment:n=>({__inc:n,isEqual(){}}),delete:()=>null};
 const au=()=>({onAuthStateChanged:()=>{},currentUser:null,signOut:async()=>{}}); au.Auth={Persistence:{LOCAL:'local'}};
 window.firebase={initializeApp:()=>{},auth:au,firestore:fs};
})();
"""
SETUP="""()=>{
 currentUser={uid:'u1'}; dataReadyResolve();
 customers=[{id:'c1',name:'Ram',phone:'9876543210',balance:1000}]; transactions=[]; currentCustomerId='c1';
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
 document.getElementById('screen-dashboard').classList.add('active');
 document.getElementById('loadingScreen').style.display='none';
 localStorage.clear();
}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':360,'height':740}); pg=await ctx.new_page(); await pg.add_init_script(INIT)
        await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/dashboard.html'); await pg.wait_for_timeout(400)
        await pg.evaluate(SETUP)
        R={}
        prep="""(args)=>{window.__confirms=[];window.confirm=(m)=>{window.__confirms.push(m);return args.answer};
          customers=[{id:'c1',name:'Ram',phone:'9876543210',balance:1000,creditLimit:args.limit}];
          transactions=[{id:'t0',partyId:'c1',type:'udhaar',amount:1000,date:'2026-10-01'}]; rebuildTxnIndex&&rebuildTxnIndex();
          currentCustomerId='c1';window.__store.writes=0;localStorage.clear();
          showModal('<input id=mAmt><input id=mNote><input id=mDate>');
          document.getElementById('mAmt').value='250';document.getElementById('mDate').value='2026-10-10';saveTxn('udhaar');
          return new Promise(r=>setTimeout(()=>r([window.__confirms.length,window.__store.writes,Outbox.create(localStorage,'u1').count()]),600))}"""
        await ctx.set_offline(True)   # offline so we observe queue instead of the (faked) online commit
        R['limit1000_cancel']=await pg.evaluate(prep,{'limit':1000,'answer':False})   # warn, user cancels -> nothing queued
        R['limit1000_accept']=await pg.evaluate(prep,{'limit':1000,'answer':True})    # warn, user accepts -> queued
        R['limit5000_no_warn']=await pg.evaluate(prep,{'limit':5000,'answer':False})  # under limit -> no confirm, queued
        R['no_limit_no_warn']=await pg.evaluate(prep,{'limit':None,'answer':False})   # no limit -> no confirm, queued
        print(R)
        await b.close()
asyncio.run(main())
