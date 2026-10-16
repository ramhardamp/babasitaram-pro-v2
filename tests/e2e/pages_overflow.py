import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); R={}
        for page in ['index','signup','forgot-password','dashboard']:
            for scheme in ['light','dark']:
                pg=await b.new_page(viewport={'width':320,'height':568},color_scheme=scheme); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
                await pg.goto(f'file:///home/claude/proj/babasitaram-pro-v2-main/{page}.html'); await pg.wait_for_timeout(500)
                R[f'{page}/{scheme}']=await pg.evaluate("()=>({hOverflow:document.documentElement.scrollWidth>innerWidth+1})")|{'errs':[e for e in errs if 'firebase' not in e.lower() and 'auth' not in e.lower() and 'emailjs' not in e.lower()]}
                if scheme=='light' and page in('signup','forgot-password'): await pg.screenshot(path=f'pg_{page}.png')
                await pg.close()
        print(json.dumps(R)); await b.close()
asyncio.run(main())
