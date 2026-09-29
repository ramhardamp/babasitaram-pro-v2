const CACHE='guru-shree-shell-v20260929-2';
const SHELL=['./','./index.html','./dashboard.html','./customer-view.html','./signup.html','./forgot-password.html','./auth.js','./firebase-config.js','./manifest.json','./assets/guru-shree-logo.svg','./assets/guru-shree-logo.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==self.location.origin)return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{caches.open(CACHE).then(c=>c.put(r,x.clone()));return x;}).catch(()=>caches.match(r).then(x=>x||caches.match('./index.html'))));return;}
  e.respondWith(caches.match(r).then(x=>x||fetch(r).then(y=>{caches.open(CACHE).then(c=>c.put(r,y.clone()));return y;})));
});