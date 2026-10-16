import asyncio
from lib import *
from t3_helpers import *
BIO="""window.__bioCalls=[];window.__bioAvail=true;window.__bioMode='ok';
window.Capacitor={Plugins:{BsrBiometric:{
 isAvailable:async()=>({available:window.__bioAvail===true,code:window.__bioAvail?0:11}),
 authenticate:async o=>{window.__bioCalls.push(o.title);await new Promise(r=>setTimeout(r,80));if(window.__bioMode==='ok')return{success:true};throw new Error('cancelled')}}}};"""
PARTY=[{'id':'p1','name':'Suresh','phone':'','email':'','balance':0,'viewToken':'T'*32}]
async def new(bio=False,delay=0,hint=True,logged=True,skip_lock=False,bio_on=False):
    S=Session(); pg=await S.start(seed=seed_script(parties=PARTY),logged_in=logged,service_workers='block')
    init=f"localStorage.setItem('__AUTH_DELAY','{delay}');"
    if hint: init+="localStorage.setItem('bsp_userId','u_test');"
    if bio: init+=BIO
    if bio_on: init+="localStorage.setItem('bsp_bio_u_test','1');"
    if skip_lock: init+="sessionStorage.setItem('bsp_skip_lock','1');"
    await S.ctx.add_init_script(init)
    return S,pg
async def main():
    # ---------- login page: no flash on app restart ----------
    S,pg=await new(delay=1500)
    await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(500)
    vis=await pg.evaluate("()=>({login:getComputedStyle(document.getElementById('screen-login')).visibility,splash:getComputedStyle(document.getElementById('bootSplash')).display})")
    chk('restart (session exists): login form hidden, splash shown while Firebase restores',vis['login']=='hidden' and vis['splash']=='flex',str(vis))
    await pg.wait_for_url('**/dashboard.html',timeout=6000); chk('then goes straight to dashboard',pg.url.endswith('dashboard.html'))
    await S.stop()
    S,pg=await new(hint=False,logged=False)
    await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(400)
    vis=await pg.evaluate("()=>({login:getComputedStyle(document.getElementById('screen-login')).visibility,splash:getComputedStyle(document.getElementById('bootSplash')).display})")
    chk('first launch (no session): login shown immediately, no splash',vis['login']=='visible' and vis['splash']=='none',str(vis)); await S.stop()
    S,pg=await new(delay=900,hint=True,logged=False)
    await pg.evaluate("1"); await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(300)
    await pg.evaluate("localStorage.removeItem('__AUTHCUR')") if False else None
    await pg.wait_for_timeout(1500)
    vis=await pg.evaluate("()=>({login:getComputedStyle(document.getElementById('screen-login')).visibility,booting:document.documentElement.classList.contains('booting')})")
    chk('stale hint but logged out: splash ends, login form appears',vis['login']=='visible' and not vis['booting'],str(vis)); await S.stop()
    # ---------- biometric ----------
    S,pg=await new(bio=False)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1300)
    await pg.click('.btab[data-view=settings]'); await pg.evaluate("openSettingsPanel('security')"); await pg.wait_for_timeout(300)
    print('browser label:',await pg.evaluate("document.getElementById('bioState').textContent"))
    await pg.click('#bioToggle'); await pg.wait_for_timeout(400)
    chk('browser: clear message, stays OFF',('Android APK' in await toast(pg)) and not await pg.evaluate("document.getElementById('bioToggle').classList.contains('on')")); await S.stop()
    S,pg=await new(bio=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1300)
    chk('APK, first open, biometric not enabled -> no lock',await active(pg)=='screen-dashboard')
    await pg.click('.btab[data-view=settings]'); await pg.evaluate("openSettingsPanel('security')"); await pg.wait_for_timeout(300)
    await pg.evaluate("window.__bioAvail=false"); await pg.click('#bioToggle'); await pg.wait_for_timeout(400)
    chk('no fingerprint enrolled -> message, stays OFF',('फ़ोन' in await toast(pg)) and not await pg.evaluate("document.getElementById('bioToggle').classList.contains('on')"))
    await pg.evaluate("window.__bioAvail=true;window.__bioMode='cancel'"); await pg.click('#bioToggle'); await pg.wait_for_timeout(500)
    chk('prompt cancelled -> stays OFF',not await pg.evaluate("document.getElementById('bioToggle').classList.contains('on')"))
    await pg.evaluate("window.__bioMode='ok'"); await pg.click('#bioToggle'); await pg.wait_for_timeout(600)
    chk('enable biometric lock -> ON',await pg.evaluate("document.getElementById('bioToggle').classList.contains('on')"))
    chk('flag saved on device',await pg.evaluate("localStorage.getItem('bsp_bio_u_test')")=='1')
    # restart -> locked, auto biometric prompt, unlock
    await pg.evaluate("window.__bioCalls.length=0"); await pg.reload(); await pg.wait_for_timeout(1800)
    chk('app restart -> unlocked automatically by biometric (dashboard)',await active(pg)=='screen-dashboard',await active(pg))
    print('   prompts:',await pg.evaluate("window.__bioCalls"))
    await S.stop()
    # restart with cancel -> PIN fallback; back button cannot bypass
    S,pg=await new(bio=True,bio_on=True)
    await pg.add_init_script("window.__bioMode='cancel'")
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1500)
    chk('startup locked when biometric cancelled',await active(pg)=='screen-pin',await active(pg))
    chk('lock subtitle shown',('लॉक' in await pg.evaluate("document.getElementById('pinSubtitle').textContent")))
    chk('biometric button visible',await pg.evaluate("!document.getElementById('pinBioBtn').classList.contains('hidden')"))
    await pg.evaluate("handleAppBack()"); await pg.wait_for_timeout(300)
    chk('Back does NOT bypass the lock',await active(pg)=='screen-pin',await active(pg))
    chk('Back asks to exit the app instead',await modal_open(pg)); await pg.evaluate("closeModal()")
    await pg.evaluate("showScreen('dashboard',true)"); chk('showScreen cannot paint over the lock',await active(pg)=='screen-pin')
    await pg.keyboard.type('9999',delay=60); await pg.wait_for_timeout(900); chk('wrong PIN keeps lock',await active(pg)=='screen-pin')
    await pg.evaluate("window.__bioMode='ok'"); await pg.click('#pinBioBtn'); await pg.wait_for_timeout(700)
    chk('button -> biometric unlocks',await active(pg)=='screen-dashboard',await active(pg))
    await S.stop()
    S,pg=await new(bio=True,bio_on=True); await pg.add_init_script("window.__bioMode='cancel'")
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1500)
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(2000)
    chk('PIN fallback unlocks',await active(pg)=='screen-dashboard',await active(pg)); await S.stop()
    # relock after background; origin restored; short background no lock; skip after password login
    S,pg=await new(bio=True,bio_on=True,skip_lock=True)
    await pg.goto(BASE+'dashboard.html'); await pg.wait_for_timeout(1500)
    chk('right after password login -> no lock',await active(pg)=='screen-dashboard',await active(pg))
    await pg.locator('.customer-card').click(); await pg.wait_for_timeout(400)
    async def bg(sec):
        await pg.evaluate("""s=>{window.__realNow=window.__realNow||Date.now;Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));
          Date.now=()=>window.__realNow()+s*1000;Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))}""",sec)
        await pg.wait_for_timeout(1200)
    await bg(10); chk('10s in background -> no lock',await active(pg)=='screen-customer',await active(pg))
    await pg.evaluate("window.__bioMode='cancel'"); await bg(45); chk('45s in background -> locked',await active(pg)=='screen-pin',await active(pg))
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(2000)
    chk('after unlock returns to the customer screen',await active(pg)=='screen-customer',await active(pg))
    # disable needs PIN
    await pg.evaluate("goBack()"); await pg.wait_for_timeout(300)
    await pg.evaluate("window.__bioMode='cancel'")
    await pg.click('.btab[data-view=settings]'); await pg.evaluate("openSettingsPanel('security')"); await pg.wait_for_timeout(300)
    await pg.click('#bioToggle'); await pg.wait_for_timeout(500)
    chk('turning OFF asks for PIN',await active(pg)=='screen-pin',await active(pg))
    await pg.keyboard.type('1234',delay=60); await pg.wait_for_timeout(2000)
    chk('biometric lock OFF after PIN',await pg.evaluate("localStorage.getItem('bsp_bio_u_test')")is None)
    print('errors:',[e for e in S.errors if 'cancelled' not in e[2]]); await S.stop()
if __name__=='__main__': asyncio.run(main())
