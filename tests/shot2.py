import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w,h,name in [(360,640,'small'),(412,860,'big')]:
            pg=await b.new_page(viewport={'width':w,'height':h},color_scheme='dark')
            errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/dashboard.html')
            await pg.wait_for_timeout(500)
            await pg.evaluate("""()=>{
              document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
              document.getElementById('screen-dashboard').classList.add('active');
              document.getElementById('dUdhaar').textContent='₹6,072';
              document.getElementById('dByaj').textContent='₹12,34,567';
              document.getElementById('dIncome').textContent='₹0';
              document.getElementById('dPaid').textContent='₹1,43,89,000';
              ['dUdhaar','dByaj','dIncome','dPaid'].forEach(id=>{const el=document.getElementById(id);const n=el.textContent.length;el.classList.toggle('sm',n>=9&&n<12);el.classList.toggle('xs',n>=12)});
              document.getElementById('dByajSub').textContent='मूलधन ₹10,00,000 · ब्याज ₹2,34,567';
              document.getElementById('topTitle').textContent='Rajput Mobile and photocopy';
            }""")
            await pg.screenshot(path=f'/home/claude/out_dash_{name}.png')
            # customer more sheet
            await pg.evaluate("""()=>{customers=[{id:'c1',name:'Gajendra Patel Jio'}];currentCustomerId='c1';openMoreMenu()}""")
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'/home/claude/out_more_{name}.png')
            sc=await pg.evaluate("()=>{const e=document.querySelector('.more-sheet');return [e.scrollHeight,e.clientHeight,document.querySelectorAll('.more-row').length]}")
            print(name,'more-sheet scrollH/clientH/rows',sc,'errors',errs)
            await pg.close()
        await b.close()
asyncio.run(main())
