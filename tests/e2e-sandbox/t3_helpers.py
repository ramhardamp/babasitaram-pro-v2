import json
RES=[]
def chk(name,cond,extra=''):
    RES.append((name,bool(cond),extra)); print(('PASS' if cond else 'FAIL'),'::',name,(extra if not cond else ''))
async def fsdoc(pg,path): return await pg.evaluate("p=>JSON.parse(localStorage.getItem('__FS'))[p]",path)
async def fsall(pg,prefix): return await pg.evaluate("p=>{const s=JSON.parse(localStorage.getItem('__FS'));return Object.keys(s).filter(k=>k.startsWith(p)).map(k=>[k,s[k]])}",prefix)
async def toast(pg): return await pg.evaluate("()=>[...document.querySelectorAll('.toast,#toast,[class*=toast]')].map(e=>e.textContent.trim()).filter(Boolean).join('|')")
async def modal_open(pg): return await pg.evaluate("()=>!!document.getElementById('activeModal')")
async def active(pg): return await pg.evaluate("()=>[...document.querySelectorAll('.screen.active')].map(e=>e.id).join(',')")
async def modal_buttons(pg): return await pg.evaluate("()=>[...document.querySelectorAll('#activeModal button')].map(b=>b.textContent.trim().replace(/\\s+/g,' '))")
