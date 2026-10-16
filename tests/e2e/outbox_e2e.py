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
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':360,'height':740},color_scheme='dark'); pg=await ctx.new_page(); await pg.add_init_script(INIT)
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/dashboard.html'); await pg.wait_for_timeout(400)
        await pg.evaluate(SETUP)
        R={}
        # 1. OFFLINE save -> queued, nothing written
        await ctx.set_offline(True)
        await pg.evaluate("""()=>{showModal('<input id=mAmt><input id=mNote><input id=mDate>');
          document.getElementById('mAmt').value='250';document.getElementById('mNote').value='chai';document.getElementById('mDate').value='2026-10-10';saveTxn('udhaar')}""")
        R['offline_queue']=await pg.evaluate("()=>[Outbox.create(localStorage,'u1').count(),window.__store.writes,document.getElementById('outboxBanner').className,!!document.getElementById('activeModal')]")
        # 2. still offline: sync must not write
        await pg.evaluate("()=>syncOutbox(true)"); R['offline_sync']=await pg.evaluate("()=>[Outbox.create(localStorage,'u1').count(),window.__store.writes]")
        # 3. back online, first commit fails transiently -> entry kept
        await ctx.set_offline(False); await pg.evaluate("()=>{window.__failNext=true}")
        await pg.evaluate("()=>syncOutbox(true)"); R['transient_fail']=await pg.evaluate("()=>[Outbox.create(localStorage,'u1').count(),window.__store.writes,window.__store.party.c1.balance]")
        # 4. retry succeeds exactly once
        await pg.evaluate("()=>syncOutbox(true)"); R['synced']=await pg.evaluate("()=>[Outbox.create(localStorage,'u1').count(),window.__store.writes,window.__store.party.c1.balance]")
        # 5. second sync / duplicate trigger does nothing
        await pg.evaluate("()=>Promise.all([syncOutbox(true),syncOutbox(true)])"); R['no_duplicate']=await pg.evaluate("()=>[window.__store.writes,window.__store.party.c1.balance,Object.keys(window.__store.tx).length]")
        # 6. replay of an entry whose doc already exists on server -> dropped, no write
        await pg.evaluate("""()=>{const ob=Outbox.create(localStorage,'u1');const k=Object.keys(window.__store.tx)[0];ob.add({key:k,customerId:'c1',type:'udhaar',amount:250,note:'',date:'2026-10-10',time:'10:00',dateTime:'2026-10-10T10:00:00'})}""")
        await pg.evaluate("()=>syncOutbox(true)"); R['already_on_server']=await pg.evaluate("()=>[Outbox.create(localStorage,'u1').count(),window.__store.writes,window.__store.party.c1.balance]")
        # 7. online save path untouched: online -> no queue
        R['online_untouched']=await pg.evaluate("()=>[navigator.onLine, saveTxn.toString().includes('requireOnline()')]")
        await pg.evaluate("()=>{showModal('<input id=mAmt><input id=mNote><input id=mDate>');}")
        print(json.dumps(R,ensure_ascii=False)); print('errors',[e for e in errs if 'firebase' not in e.lower() and 'auth' not in e.lower()])
        await b.close()
asyncio.run(main())
