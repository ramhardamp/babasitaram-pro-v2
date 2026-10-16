import asyncio
from playwright.async_api import async_playwright
JS="""()=>{
 customers=[{id:'c1',name:'Gajendra Patel Jio',phone:'7071722777',balance:5000}];
 transactions=[
  {id:'t1',partyId:'c1',type:'udhaar',amount:5000,note:'Jio',date:'2026-10-09',time:'17:58',dateTime:'2026-10-09T17:58:00'},
  {id:'t2',partyId:'c1',type:'jama',amount:5000,note:'qr 005597689645',date:'2026-10-05',time:'17:35',dateTime:'2026-10-05T17:35:00'},
  {id:'t3',partyId:'c1',type:'udhaar',amount:1200,note:'',date:'2026-10-01',time:'10:00',dateTime:'2026-10-01T10:00:00'}];
 currentCustomerId='c1'; currentScreen='customer';
 document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
 document.getElementById('screen-customer').classList.add('active');
 document.getElementById('loadingScreen').style.display='none';
 renderCustomerDetail();
}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,vp,scheme in [('dark',{'width':360,'height':740},'dark'),('light',{'width':360,'height':740},'light'),('land',{'width':740,'height':360},'dark')]:
            pg=await b.new_page(viewport=vp,color_scheme=scheme); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/dashboard.html'); await pg.wait_for_timeout(400)
            await pg.evaluate(JS); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/home/claude/cust_{name}.png')
            print(name,[e for e in errs if 'firebase' not in e and 'auth' not in e])
            await pg.close()
        await b.close()
asyncio.run(main())
