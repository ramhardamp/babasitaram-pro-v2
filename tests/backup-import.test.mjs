import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const B = createRequire(import.meta.url)('../backup-import.js');

async function makeBackup(user, customers, transactions){
  const data={user:B.sanitizeUser(user),customers:customers.map(B.sanitizeCustomer),transactions};
  return {schemaVersion:2,appVersion:'6.9.0',exportedAt:'2026-10-10T00:00:00Z',
    counts:{customers:data.customers.length,transactions:data.transactions.length},
    integrity:{checksumSha256:await B.sha256Hex(JSON.stringify(data))},data};
}
const user={shopName:'S',pinHash:'h',pinSalt:'s',pinIter:1,pinVersion:2,pin:'1234',smsSettings:{enabled:false}};
const custs=[{id:'a',name:'Ram',phone:'9876543210',balance:300,viewToken:'TOKENTOKENTOKENTOKEN1234'},{id:'b',name:'Shyam',phone:'',balance:0}];
const txns=[
 {id:'t1',partyId:'a',type:'udhaar',amount:500,date:'2026-09-01',time:'10:00',note:'x',createdAt:{seconds:1}},
 {id:'t2',partyId:'a',type:'jama',amount:200,date:'2026-09-05',time:'11:00',note:''},
 {id:'L1',partyId:'b',type:'byaj_loan',principal:10000,rate:2,startDate:'2026-04-10',date:'2026-04-10',status:'active',repayments:[]},
 {id:'t3',partyId:'b',type:'loan_repay',amount:1000,loanId:'L1',date:'2026-06-10'},
 {id:'t4',partyId:'b',type:'interest_paid',amount:200,loanId:'L1',date:'2026-06-11'},
 {id:'t5',partyId:'a',type:'udhaar',amount:50,date:'2026-09-06',status:'deleted'},
 {id:'t6',partyId:'ghost',type:'udhaar',amount:50,date:'2026-09-06'},
 {id:'t7',partyId:'a',type:'udhaar',amount:-5,date:'2026-09-06'},
];
let n=0; const gen=()=>'new'+(++n);

test('backup never contains PIN data, passwords or public-link tokens',async()=>{
  const b=await makeBackup(user,custs,txns); const s=JSON.stringify(b);
  for(const bad of ['pinHash','pinSalt','"pin"','TOKENTOKEN','viewToken']) assert.ok(!s.includes(bad),bad+' leaked');
  assert.equal(b.data.user.shopName,'S');
});
test('valid backup passes; tampering is rejected',async()=>{
  const b=await makeBackup(user,custs,txns);
  assert.equal((await B.validateBackup(b)).ok,true);
  const t=JSON.parse(JSON.stringify(b)); t.data.transactions[0].amount=99999;
  const r=await B.validateBackup(t); assert.equal(r.ok,false); assert.match(r.errors[0],/Checksum/);
});
test('wrong file / truncated / wrong schema are rejected without throwing',async()=>{
  for(const bad of [null,[],{},{schemaVersion:1},{schemaVersion:2,data:{customers:[],transactions:[]}},'x']) assert.equal((await B.validateBackup(bad)).ok,false);
  const b=await makeBackup(user,custs,txns); b.counts.transactions=1; assert.equal((await B.validateBackup(b)).ok,false);
});
test('deleted, orphan and invalid-amount rows are skipped and reported',async()=>{
  const v=await B.validateBackup(await makeBackup(user,custs,txns));
  assert.equal(v.transactions.length,5); assert.deepEqual(v.skipped,{orphan:1,invalid:1,deleted:1});
});
test('plan into EMPTY account: all new, loan links remapped, balances = ordinary net',async()=>{
  const v=await B.validateBackup(await makeBackup(user,custs,txns)); n=0;
  const p=B.planImport(v,[],[],gen);
  assert.equal(p.newCustomers.length,2); assert.equal(p.mergedCustomers.length,0); assert.equal(p.txns.length,5);
  const loan=p.txns.find(r=>r.data.type==='byaj_loan'); const rep=p.txns.find(r=>r.data.type==='loan_repay');
  assert.equal(rep.data.loanId,loan.id,'repayment re-linked to NEW loan id');
  assert.equal(p.balanceDelta[p.partyMap.a.id],300); assert.equal(p.balanceDelta[p.partyMap.b.id],0);
  assert.ok(p.txns.every(r=>!('createdAt' in r.data)&&r.data.partyId===r.partyId));
});
test('IDEMPOTENT: importing the same backup twice creates nothing the 2nd time',async()=>{
  const v=await B.validateBackup(await makeBackup(user,custs,txns)); n=0;
  const p1=B.planImport(v,[],[],gen);
  // simulate Firestore state after the first import
  const exC=p1.newCustomers.map(c=>({id:c.id,name:c.name,phone:c.phone}));
  const exT=p1.txns.map(r=>({id:r.id,partyId:r.partyId,...r.data}));
  const p2=B.planImport(v,exC,exT,gen);
  assert.equal(p2.newCustomers.length,0); assert.equal(p2.txns.length,0); assert.equal(p2.isNoop,true);
  assert.equal(p2.duplicateTxns,5);
});
test('MERGE: existing customer + one extra old txn -> only the missing txn is added, no overwrite',async()=>{
  const v=await B.validateBackup(await makeBackup(user,custs,txns)); n=0;
  const exC=[{id:'E1',name:'ram',phone:'+91 98765 43210'}];
  const exT=[{id:'E-t1',partyId:'E1',type:'udhaar',amount:500,date:'2026-09-01',time:'10:00',note:'x'}];
  const p=B.planImport(v,exC,exT,gen);
  assert.equal(p.mergedCustomers.length,1); assert.equal(p.newCustomers.length,1); // Shyam new
  const forRam=p.txns.filter(r=>r.partyId==='E1'); assert.equal(forRam.length,1); assert.equal(forRam[0].data.type,'jama');
  assert.equal(p.balanceDelta.E1,-200);
});
test('a customer with too many transactions is flagged, not silently half-imported',async()=>{
  const many=Array.from({length:481},(_,i)=>({id:'m'+i,partyId:'a',type:'udhaar',amount:1,date:'2026-01-01',note:String(i)}));
  const v=await B.validateBackup(await makeBackup(user,[custs[0]],many)); n=0;
  const p=B.planImport(v,[],[],gen); assert.equal(p.tooLarge.length,1);
});
