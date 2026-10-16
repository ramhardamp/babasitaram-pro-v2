import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
function fn(name){
  const i = src.indexOf((src.includes('async function '+name+'(')?'async function ':'function ')+name+'(');
  assert.ok(i>=0, name+' missing');
  let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){ if(src[k]==='{')d++; else if(src[k]==='}'){d--; if(d===0)return src.slice(i,k+1);} }
}
function sandbox({directSms=true,enabled=true,reminderSms=true,txns=[],granted=true}={}){
  const calls=[];
  const ctx={
    calls, transactions:txns, userData:{smsSettings:{enabled,reminderSms,transactionSms:true}},
    APP_CONFIG:{directSms}, Date, Number, String, Promise, console,
    window:{Capacitor:{Plugins:{BsrSmsScheduler:{
      checkPermission:async()=>({granted}), requestPermission:async()=>({granted}),
      scheduleReminder:async o=>{calls.push(['schedule',o.id,o.message]);return{scheduled:true}},
      cancelCustomerReminders:async o=>{calls.push(['cancel',o.prefix])},
    }}}},
  };
  vm.createContext(ctx);
  ['getSmsPlugin','getSmsSettings','ensureSmsPermission','cancelCustomerSmsReminders','scheduleUdhaarReminder','refreshCustomerSmsReminders']
    .forEach(n=>vm.runInContext(fn(n),ctx));
  return ctx;
}
const future=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
const c={id:'c1',name:'A',phone:'9999999999'};

test('SMS: build with directSms=false never reports enabled (no false ON)',()=>{
  const x=sandbox({directSms:false,enabled:true});
  assert.equal(vm.runInContext('getSmsSettings().enabled',x),false);
});
test('SMS: full payment (balance 0) cancels reminders and schedules none',async()=>{
  const x=sandbox({txns:[{id:'t1',type:'udhaar',partyId:'c1',date:future}]});
  await vm.runInContext('refreshCustomerSmsReminders',x)(c,0);
  assert.deepEqual(x.calls.map(a=>a[0]),['cancel']);
});
test('SMS: partial payment re-schedules with the NEW balance, not the stale one',async()=>{
  const x=sandbox({txns:[{id:'t1',type:'udhaar',partyId:'c1',date:future},{id:'t2',type:'udhaar',partyId:'c1',date:future,status:'deleted'}]});
  await vm.runInContext('refreshCustomerSmsReminders',x)(c,300);
  const sch=x.calls.filter(a=>a[0]==='schedule');
  assert.equal(sch.length,1,'deleted udhaar must not be rescheduled');
  assert.equal(sch[0][1],'udhaar7:c1:t1');
  assert.ok(sch[0][2].includes('300'),'message carries new balance');
});
test('SMS: permission denied -> nothing scheduled',async()=>{
  const x=sandbox({granted:false,txns:[{id:'t1',type:'udhaar',partyId:'c1',date:future}]});
  await vm.runInContext('refreshCustomerSmsReminders',x)(c,300);
  assert.equal(x.calls.filter(a=>a[0]==='schedule').length,0);
});
test('SMS: reminder switch OFF -> nothing scheduled after partial payment',async()=>{
  const x=sandbox({reminderSms:false,txns:[{id:'t1',type:'udhaar',partyId:'c1',date:future}]});
  await vm.runInContext('refreshCustomerSmsReminders',x)(c,300);
  assert.equal(x.calls.filter(a=>a[0]==='schedule').length,0);
});

test('SMS: permission denied par Restricted-settings guide + App info open hota hai',()=>{
  assert.ok(src.includes('async function showSmsRestrictedGuide('));
  assert.ok(src.includes("plugin.openAppSettings()"));
  assert.ok(src.includes('await showSmsRestrictedGuide();'));
});

test('SMS: Settings se wapas aane par permission mili ho to Automatic SMS khud ON (loop nahi)',()=>{
  assert.ok(src.includes('function armSmsResumeCheck('));
  assert.ok(src.includes("plugin.openAppSettings();armSmsResumeCheck()"));
  assert.ok(src.includes("document.removeEventListener('visibilitychange',onVis)"));
});

test('UI: keyboard khulne par sheet neeche hi rehti hai aur keyboard ke upar uthti hai (--kb) - Save/rakam nahi chhupti',()=>{
  assert.ok(src.includes('.modal-overlay{padding-bottom:var(--kb,0px)'));
  assert.ok(src.includes('max-height:calc(100dvh - var(--kb,0px)'));
  assert.ok(!src.includes('.modal-overlay.kb-open{align-items:flex-start'), 'sheet ab top par nahi jaati');
  assert.ok(src.includes("root.style.setProperty('--kb'"));
  assert.ok(src.includes("ov.classList.add('kb-open')"));
  assert.ok(src.includes("classList.remove('kb-open')"));
});

test('UI: udhaar/jama sheet professional (.txn-sheet) - IDs/handlers same (mAmt, mNote, mDate, saveTxn, closeModal)',()=>{
  const f=fn('openTxnModal');
  for(const k of ['txn-sheet','id="mAmt"','id="mNote"','id="mDate"',"saveTxn('${type}')",'closeModal()','txn-save'])assert.ok(f.includes(k),k);
});
