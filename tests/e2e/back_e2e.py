import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':360,'height':740})
        await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/dashboard.html'); await pg.wait_for_timeout(500)
        R={}
        async def st(): return await pg.evaluate("()=>[currentScreen,!!document.getElementById('activeModal'),document.querySelector('#activeModal .modal-title')?.textContent||'']")
        # 1 startup PIN lock must NOT be bypassed
        await pg.evaluate("()=>{closeModal();screenHistory=[];pinReturnScreen=null;pinOriginScreen=null;currentScreen='pin';}")
        r=await pg.evaluate("()=>window.__nativeAndroidBack()"); R['pin_lock']=[r]+await st()
        # 2 PIN prompt opened from customer screen -> back returns to customer
        await pg.evaluate("()=>{customers=[{id:'c1',name:'A'}];currentCustomerId='c1';closeModal();currentScreen='customer';showPinScreen('verify','PIN','x',()=>{});}")
        await pg.evaluate("()=>window.__nativeAndroidBack()"); R['pin_from_customer']=await st()
        # 3 customer -> dashboard
        await pg.evaluate("()=>{closeModal();screenHistory=['dashboard'];currentScreen='customer';}")
        await pg.evaluate("()=>window.__nativeAndroidBack()"); R['customer_back']=await st()
        # 4 dashboard root -> exit confirm, 2nd back closes the dialog (app stays)
        await pg.evaluate("()=>{closeModal();screenHistory=[];currentScreen='dashboard';}")
        r1=await pg.evaluate("()=>window.__nativeAndroidBack()"); R['dashboard_back_1']=[r1]+await st()
        r2=await pg.evaluate("()=>window.__nativeAndroidBack()"); R['dashboard_back_2']=[r2]+await st()
        # 5 open modal closes first
        await pg.evaluate("()=>{currentScreen='customer';screenHistory=['dashboard'];showModal('<div>x</div>')}")
        await pg.evaluate("()=>window.__nativeAndroidBack()"); R['modal_first']=await st()
        # 6 More sheet then back
        await pg.evaluate("()=>{customers=[{id:'c1',name:'A'}];currentCustomerId='c1';openMoreMenu()}")
        await pg.evaluate("()=>window.__nativeAndroidBack()"); R['more_sheet_back']=await st()
        print(json.dumps(R,ensure_ascii=False,indent=1)); await b.close()
asyncio.run(main())
