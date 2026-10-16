/* In-memory Firebase compat mock for offline E2E testing (not part of the app) */
(function(){
  const STORE = (window.__FS = window.__FS || JSON.parse(localStorage.getItem('__FS')||'{}'));
  const persist=()=>{try{localStorage.setItem('__FS',JSON.stringify(STORE))}catch(e){}};
  class TS{constructor(ms){this.seconds=Math.floor(ms/1000);this.nanoseconds=(ms%1000)*1e6}toDate(){return new Date(this.seconds*1000+this.nanoseconds/1e6)}toMillis(){return this.seconds*1000+this.nanoseconds/1e6}}
  const SV={__t:'server'},DEL={__t:'delete'};
  const inc=n=>({__t:'inc',n});
  const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o,(k,v)=>v));
  function apply(prev,data,merge){
    const out=merge?clone(prev||{}):{};
    for(const k of Object.keys(data)){
      const v=data[k];
      if(v&&v.__t==='server')out[k]={__ts:Date.now()};
      else if(v&&v.__t==='delete')delete out[k];
      else if(v&&v.__t==='inc')out[k]=(Number(out[k])||0)+v.n;
      else out[k]=clone(v);
    }
    return out;
  }
  function rev(v){ if(v&&typeof v==='object'){ if(v.__ts)return new TS(v.__ts); if(Array.isArray(v))return v.map(rev); const o={};for(const k in v)o[k]=rev(v[k]);return o;} return v;}
  const listeners=[];
  const notify=()=>{persist();listeners.slice().forEach(l=>l())};
  class DocSnap{constructor(path,d){this.ref=new DocRef(path);this.id=path.split('/').pop();this._d=d;this.exists=d!==undefined;this.metadata={fromCache:false,hasPendingWrites:false}}data(){return this._d===undefined?undefined:rev(clone(this._d))}get(f){const d=this.data();return d?d[f]:undefined}}
  class QSnap{constructor(docs){this.docs=docs;this.size=docs.length;this.empty=!docs.length;this.metadata={fromCache:false,hasPendingWrites:false}}forEach(f){this.docs.forEach(f)}docChanges(){return []}}
  class DocRef{
    constructor(path){this.path=path;this.id=path.split('/').pop();this.parent=null}
    collection(n){return new ColRef(this.path+'/'+n)}
    async get(opts){if(opts&&opts.source==='cache'&&!STORE[this.path])throw new Error('cache miss');return new DocSnap(this.path,STORE[this.path])}
    async set(d,o){STORE[this.path]=apply(STORE[this.path],d,o&&o.merge);notify()}
    async update(d){if(!STORE[this.path]){const e=new Error('No document to update');e.code='not-found';throw e}STORE[this.path]=apply(STORE[this.path],d,true);notify()}
    async delete(){delete STORE[this.path];notify()}
    onSnapshot(a,b,c){const cb=typeof a==='function'?a:b;const eb=typeof a==='function'?b:c;const f=()=>cb(new DocSnap(this.path,STORE[this.path]));setTimeout(f,0);listeners.push(f);return()=>{const i=listeners.indexOf(f);if(i>=0)listeners.splice(i,1)}}
  }
  class ColRef{
    constructor(path,filters,order,lim){this.path=path;this.filters=filters||[];this.order=order;this.lim=lim}
    doc(id){return new DocRef(this.path+'/'+(id||('auto'+Math.random().toString(36).slice(2,12))))}
    async add(d){const r=this.doc();await r.set(d);return r}
    where(f,op,v){return new ColRef(this.path,[...this.filters,[f,op,v]],this.order,this.lim)}
    orderBy(f,dir){return new ColRef(this.path,this.filters,[f,dir||'asc'],this.lim)}
    limit(n){return new ColRef(this.path,this.filters,this.order,n)}
    _run(){
      const pre=this.path+'/';let docs=Object.keys(STORE).filter(p=>p.startsWith(pre)&&!p.slice(pre.length).includes('/')).map(p=>new DocSnap(p,STORE[p]));
      for(const [f,op,v] of this.filters)docs=docs.filter(d=>{const x=d._d[f];return op==='=='?x===v:op==='!='?x!==v:true});
      if(this.order){const [f,dir]=this.order;const val=d=>{const x=d._d[f];return x&&x.__ts?x.__ts:x};docs.sort((a,b)=>{const A=val(a),B=val(b);return (A>B?1:A<B?-1:0)*(dir==='desc'?-1:1)})}
      if(this.lim)docs=docs.slice(0,this.lim);
      return new QSnap(docs);
    }
    async get(){return this._run()}
    onSnapshot(a,b,c){const cb=typeof a==='function'?a:b;const f=()=>cb(this._run());setTimeout(f,0);listeners.push(f);return()=>{const i=listeners.indexOf(f);if(i>=0)listeners.splice(i,1)}}
  }
  const fs={
    collection:p=>new ColRef(p),
    doc:p=>new DocRef(p),
    enablePersistence:()=>Promise.resolve(),
    batch(){const ops=[];const b={set(r,d,o){ops.push(()=>{STORE[r.path]=apply(STORE[r.path],d,o&&o.merge)});return b},update(r,d){ops.push(()=>{if(!STORE[r.path])throw new Error('No document to update: '+r.path);STORE[r.path]=apply(STORE[r.path],d,true)});return b},delete(r){ops.push(()=>{delete STORE[r.path]});return b},async commit(){const snap=clone(STORE);try{ops.forEach(o=>o())}catch(e){for(const k of Object.keys(STORE))delete STORE[k];Object.assign(STORE,snap);throw e}notify()}};return b},
    async runTransaction(fn){
      const snap=clone(STORE);const writes=[];
      const tx={async get(r){return r instanceof ColRef?r._run():new DocSnap(r.path,STORE[r.path])},set(r,d,o){writes.push(()=>{STORE[r.path]=apply(STORE[r.path],d,o&&o.merge)});return tx},update(r,d){writes.push(()=>{if(!STORE[r.path])throw new Error('No document to update: '+r.path);STORE[r.path]=apply(STORE[r.path],d,true)});return tx},delete(r){writes.push(()=>{delete STORE[r.path]});return tx}};
      const res=await fn(tx);
      try{writes.forEach(w=>w())}catch(e){for(const k of Object.keys(STORE))delete STORE[k];Object.assign(STORE,snap);throw e}
      notify();return res;
    }
  };
  fs.FieldValue={serverTimestamp:()=>SV,delete:()=>DEL,increment:inc};
  const fsFn=()=>fs; fsFn.FieldValue=fs.FieldValue; fsFn.Timestamp=TS; fsFn.CACHE_SIZE_UNLIMITED=-1;
  // ---- Auth ----
  const USERS=JSON.parse(localStorage.getItem('__AUTHUSERS')||'{}');
  let cur=JSON.parse(localStorage.getItem('__AUTHCUR')||'null');const aL=[];
  const fire=()=>aL.slice().forEach(f=>f(cur));
  const mkErr=(code,msg)=>{const e=new Error(msg||code);e.code=code;return e};
  const mkUser=(uid,email,v)=>({uid,email,emailVerified:v,getIdToken:async()=>'t',updateProfile:async()=>{},sendEmailVerification:async()=>{window.__VSENT=(window.__VSENT||0)+1},reload:async()=>{if(localStorage.getItem('__VERIFY')==='1')cur.emailVerified=true},updatePassword:async()=>{},reauthenticateWithCredential:async()=>{}});
  const auth={
    get currentUser(){return cur},
    onAuthStateChanged(cb){aL.push(cb);setTimeout(()=>cb(cur),Number(localStorage.getItem('__AUTH_DELAY')||0));return()=>{}},
    async signInWithEmailAndPassword(e,p){const u=USERS[e.toLowerCase()];if(!u)throw mkErr('auth/user-not-found');if(u.p!==p)throw mkErr('auth/wrong-password');cur=mkUser(u.uid,e,true);localStorage.setItem('__AUTHCUR',JSON.stringify({uid:u.uid,email:e}));fire();return{user:cur}},
    async createUserWithEmailAndPassword(e,p){if(USERS[e.toLowerCase()])throw mkErr('auth/email-already-in-use');const uid='u'+Math.random().toString(36).slice(2,10);USERS[e.toLowerCase()]={uid,p};localStorage.setItem('__AUTHUSERS',JSON.stringify(USERS));cur=mkUser(uid,e,false);localStorage.setItem('__AUTHCUR',JSON.stringify({uid,email:e}));fire();return{user:cur}},
    async signOut(){cur=null;localStorage.removeItem('__AUTHCUR');fire()},
    async sendPasswordResetEmail(e){if(!USERS[e.toLowerCase()])throw mkErr('auth/user-not-found');window.__RESET_SENT=e},
    setPersistence(){return Promise.resolve()}
  };
  if(cur){cur=mkUser(cur.uid,cur.email,true)}
  const authFn=()=>auth; authFn.Auth={Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'}};
  window.firebase={initializeApp(){return{}},apps:[{}],auth:authFn,firestore:fsFn};
  window.emailjs={init(){},send:async()=>({status:200})};
  console.log('[mock] firebase ready');
})();
