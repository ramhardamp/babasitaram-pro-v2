import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('www',{recursive:true});
for(const file of ['index.html','dashboard.html','customer-view.html','signup.html','forgot-password.html','auth.js','firebase-config.js']) await copyFile(file,'www/'+file);
console.log('Web assets prepared');
