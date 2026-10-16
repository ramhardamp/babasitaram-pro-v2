import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); R={}
        for name,w,h in [('normal',360,640),('keyboard_open',360,330),('tiny',320,480),('landscape',740,360)]:
            pg=await b.new_page(viewport={'width':w,'height':h})
            await pg.goto('file:///home/claude/proj/babasitaram-pro-v2-main/index.html'); await pg.wait_for_timeout(500)
            # focus the password field like a user would; browser scrolls it into view
            await pg.evaluate("()=>{const i=[...document.querySelectorAll('input')].find(x=>x.offsetParent&&x.type==='password');i&&i.focus()}")
            await pg.wait_for_timeout(300)
            r=await pg.evaluate("""()=>{const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('लॉगिन करें')&&b.offsetParent);
              const c=document.querySelector('.screen-container');
              if(c)c.scrollTop=c.scrollHeight;
              const br=btn.getBoundingClientRect();
              return {winH:innerHeight,headerH:Math.round(document.querySelector('.brand-header').getBoundingClientRect().height),
                      btnTop:Math.round(br.top),btnBottom:Math.round(br.bottom),reachable:br.top>=0&&br.bottom<=innerHeight+1,
                      scrolls:c.scrollHeight>c.clientHeight+1}}""")
            R[name]=r
            if name=='normal': await pg.screenshot(path='login_new.png')
            await pg.close()
        print(json.dumps(R)); await b.close()
asyncio.run(main())
