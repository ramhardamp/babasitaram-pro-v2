import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('www/assets',{recursive:true});
await mkdir('www/assets/i18n',{recursive:true});
for(const file of ['index.html','dashboard.html','customer-view.html','signup.html','forgot-password.html','firebase-config.js','push-notifications.js','app-config.js','v18-i18n.js','localize-pages.js','ledger.js','theme.js','theme.css','interest-calc.js','interest-calc-ui.js','backup-import.js','recovery.js','outbox.js','native-shim.js','pin-security.js','errlog.js','ux-pro.js','ux-pro.css','manifest.json','service-worker.js','assets/guru-shree-logo.svg','assets/guru-shree-logo.jpg','assets/i18n/en.json','assets/i18n/hi.json','assets/i18n/gu.json','assets/i18n/mr.json','assets/i18n/ne.json','assets/i18n/te.json']) await copyFile(file,'www/'+file);
{
  // Direct (automatic) SMS is ON by default. ENABLE_DIRECT_SMS=false => Play-Store-safe build.
  const { readFile, writeFile } = await import('node:fs/promises');
  const want = process.env.ENABLE_DIRECT_SMS === 'false' ? 'false' : 'true';
  const cfg=await readFile('www/app-config.js','utf8');
  if(!/directSms:\s*(true|false)/.test(cfg))throw new Error('directSms flag not found in app-config.js');
  await writeFile('www/app-config.js',cfg.replace(/directSms:\s*(true|false)/,'directSms: '+want));
  console.log('www/app-config.js directSms='+want);
}
console.log('Web assets prepared');