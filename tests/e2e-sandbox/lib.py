import asyncio, json, os, re
from playwright.async_api import async_playwright
BASE='http://localhost:8765/'
MOCK=open('/home/claude/harness/mock-firebase.js').read()
PIN=json.load(open('/home/claude/harness/pinrec.json'))
FIREBASE_RE=re.compile(r'https://www\.gstatic\.com/firebasejs/.*|https://cdn\.jsdelivr\.net/npm/@emailjs/.*')
async def route_handler(route):
    u=route.request.url
    if u.startswith('https://www.gstatic.com/firebasejs/'):
        # first script defines everything; others empty
        body = MOCK if u.endswith('firebase-app-compat.js') else '/* noop */'
        return await route.fulfill(status=200,content_type='application/javascript',body=body)
    if 'emailjs' in u:
        return await route.fulfill(status=200,content_type='application/javascript',body='/*noop*/')
    if u.startswith('http://localhost') or u.startswith('data:') or u.startswith('blob:'):
        return await route.continue_()
    # any other external (fonts, quickchart, cdn libs) -> fail fast, record
    EXTERNAL.append(u)
    return await route.abort()
EXTERNAL=[]
def seed_script(uid='u_test',email='shop@test.com',pw='Test@1234',profile=None,parties=None,txns=None):
    prof={'shopName':'Test Dukan','ownerName':'Ram','phone':'9876543210','upiId':'test@upi','defaultRate':2,'emailVerified':True,**PIN}
    if profile: prof.update(profile)
    fs={'users/'+uid:prof}
    for p in (parties or []): fs[f'users/{uid}/parties/{p["id"]}']={k:v for k,v in p.items() if k!='id'}
    for t in (txns or []): fs[f'users/{uid}/transactions/{t["id"]}']={k:v for k,v in t.items() if k!='id'}
    return f"""
    if(!localStorage.getItem('__SEEDED')){{
      localStorage.setItem('__FS',{json.dumps(json.dumps(fs))});
      localStorage.setItem('__AUTHUSERS',{json.dumps(json.dumps({email:{'uid':uid,'p':pw}}))});
      localStorage.setItem('__SEEDED','1');
    }}"""
class Session:
    def __init__(self): self.errors=[]; self.logs=[]
    async def start(self,viewport=(390,844),seed=None,logged_in=False,**kw):
        self.pw=await async_playwright().start()
        self.browser=await self.pw.chromium.launch()
        self.ctx=await self.browser.new_context(viewport={'width':viewport[0],'height':viewport[1]},**kw)
        await self.ctx.route('**/*',route_handler)
        if seed: await self.ctx.add_init_script(seed)
        if logged_in:
            await self.ctx.add_init_script("if(!localStorage.getItem('__LOGGED_ONCE')){localStorage.setItem('__AUTHCUR',JSON.stringify({uid:'u_test',email:'shop@test.com'}));localStorage.setItem('__LOGGED_ONCE','1')}")
        self.page=await self.ctx.new_page()
        self.hook(self.page)
        return self.page
    def hook(self,pg):
        pg.on('pageerror',lambda e:self.errors.append(('pageerror',pg.url.split('/')[-1],str(e)[:300])))
        pg.on('console',lambda m:(self.errors.append(('console.error',pg.url.split('/')[-1],m.text[:300])) if m.type=='error' else None))
        pg.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    async def stop(self):
        await self.browser.close(); await self.pw.stop()
