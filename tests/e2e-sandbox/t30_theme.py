import asyncio,sys,datetime
import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
today=datetime.date.today().isoformat()
parties=[{'id':f'p{i}','name':n,'phone':f'98765000{i:02d}','type':'customer','createdAt':i} for i,n in enumerate(['Davender Kumar','Ronald Stewart','George Roberts','Dennis Brooks'])]
txns=[{'id':f't{i}','partyId':f'p{i}','type':'udhaar','amount':500*(i+1),'note':'n','date':today,'dateTime':today+'T01:30:00.000Z','transactionAt':today+'T01:30:00.000Z'} for i in range(4)]
res=[]
def ok(name,cond,extra=''): res.append((name,bool(cond),extra)); print(('PASS' if cond else 'FAIL'),'::',name,extra)
async def main():
    # ---- dashboard, phone OS dark but user default light
    s=Session(); pg=await s.start(viewport=(360,780),seed=seed_script(parties=parties,txns=txns),logged_in=True,color_scheme='dark')
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(2500)
    th=lambda: pg.evaluate("document.documentElement.getAttribute('data-theme')")
    ls=lambda: pg.evaluate("localStorage.getItem('bsp_theme')")
    ok('OS dark + default => LIGHT (OS ab force nahi karta)', await th()=='light', await th())
    bg=await pg.evaluate("getComputedStyle(document.body).backgroundColor"); ok('body light bg',bg=='rgb(244, 247, 245)',bg)
    await pg.screenshot(path='/tmp/t_dash_light_osdark.png')
    await pg.click('.top-bar [data-theme-toggle]'); await pg.wait_for_timeout(100)
    ok('toggle: smooth class lagi',await pg.evaluate("document.documentElement.classList.contains('theme-anim')"))
    await pg.wait_for_timeout(600)
    ok('toggle: dark ho gaya',await th()=='dark'); ok('localStorage bsp_theme=dark',await ls()=='dark')
    ok('toggle: smooth class hat gayi',not await pg.evaluate("document.documentElement.classList.contains('theme-anim')"))
    bg=await pg.evaluate("getComputedStyle(document.body).backgroundColor"); ok('body dark bg',bg=='rgb(15, 21, 17)',bg)
    await pg.screenshot(path='/tmp/t_dash_dark.png')
    await pg.reload(); await pg.wait_for_timeout(2500)
    ok('reload ke baad dark yaad',await th()=='dark')
    await pg.click('.top-bar [data-theme-toggle]'); await pg.wait_for_timeout(500)
    ok('wapas light',await th()=='light' and await ls()=='light')
    # settings rows (Light/Dark/System)
    await pg.click('.btab[data-view="settings"]'); await pg.wait_for_timeout(700)
    await pg.evaluate("openSettingsPanel('ux')"); await pg.wait_for_timeout(400)
    await pg.click('[data-theme-set="dark"]'); await pg.wait_for_timeout(500)
    ok('settings: Dark row kaam karta',await th()=='dark' and await pg.evaluate("document.querySelector('[data-theme-set=dark]').classList.contains('on')"))
    await pg.click('[data-theme-set="system"]'); await pg.wait_for_timeout(500)
    ok('settings: System => OS dark follow',await th()=='dark' and await ls()=='system')
    await pg.click('[data-theme-set="light"]'); await pg.wait_for_timeout(500)
    ok('settings: Light row',await th()=='light')
    ok('purana Dark Mode row nahi',await pg.evaluate("!document.getElementById('darkModeState')"))
    ok('dashboard errors nahi',not s.errors,str(s.errors[:3]))
    await s.stop()
    # ---- har page
    for page in ['index.html','signup.html','forgot-password.html','customer-view.html']:
        s=Session(); pg=await s.start(viewport=(360,780),color_scheme='light')
        await pg.goto(BASE+page); await pg.wait_for_timeout(1200)
        n=await pg.locator('[data-theme-toggle]').count(); ok(f'{page}: toggle maujood',n==1,str(n))
        await pg.click('[data-theme-toggle]'); await pg.wait_for_timeout(500)
        d=await pg.evaluate("[document.documentElement.getAttribute('data-theme'),localStorage.getItem('bsp_theme'),getComputedStyle(document.body).backgroundColor]")
        ok(f'{page}: dark + saved',d[0]=='dark' and d[1]=='dark',str(d))
        await pg.screenshot(path=f'/tmp/t_{page.split(".")[0]}_dark.png')
        # doosre page par same choice
        await pg.goto(BASE+'forgot-password.html' if page!='forgot-password.html' else BASE+'signup.html'); await pg.wait_for_timeout(800)
        ok(f'{page}: choice dusre page par bhi',await pg.evaluate("document.documentElement.getAttribute('data-theme')")=='dark')
        await s.stop()
    print('TOTAL',sum(1 for r in res if r[1]),'/',len(res))
asyncio.run(main())
