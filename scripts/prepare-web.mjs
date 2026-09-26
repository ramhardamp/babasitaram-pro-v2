import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('www/assets',{recursive:true});
for(const file of ['index.html','dashboard.html','customer-view.html','signup.html','forgot-password.html','auth.js','firebase-config.js','assets/guru-shree-logo.svg','assets/guru-shree-logo.jpg','assets/babasitaram-pro-logo.svg']) await copyFile(file,'www/'+file);
console.log('Web assets prepared');