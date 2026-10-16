// Release signing: secrets file mein NAHI likhe jaate. build.gradle sirf environment variable ke naam padhta hai
// (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD) jo CI secrets se aate hain.
import { readFile, writeFile } from 'node:fs/promises';

export function patchSigning(text) {
  if (text.includes('signingConfigs.release')) return text; // idempotent
  if (!/buildTypes\s*\{/.test(text) || !/release\s*\{/.test(text)) throw new Error('buildTypes/release block not found in build.gradle');
  const block = `    signingConfigs {
        release {
            storeFile file(System.getenv('KEYSTORE_PATH') ?: 'missing.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }
`;
  let out = text.replace(/(\n\s*)buildTypes\s*\{/, (m, ws) => '\n' + block.replace(/\n$/, '') + ws + 'buildTypes {');
  out = out.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{)/, '$1\n            signingConfig signingConfigs.release');
  return out;
}
// Debug APK (CI) bhi SAME release key se sign hota hai. Warna GitHub ka fresh runner har build par naya random
// debug.keystore banata hai -> har APK ka signature alag -> phone par purani app ke upar "update" fail (App not installed).
export function patchDebugSigning(text) {
  if (!text.includes('signingConfigs.release')) throw new Error('patchSigning must run first (signingConfigs.release missing)');
  if (/\bdebug\s*\{\s*signingConfig signingConfigs\.release/.test(text)) return text; // idempotent
  if (/buildTypes\s*\{[\s\S]*?\bdebug\s*\{/.test(text)) return text.replace(/(buildTypes\s*\{[\s\S]*?\bdebug\s*\{)/, '$1\n            signingConfig signingConfigs.release');
  return text.replace(/(buildTypes\s*\{)/, '$1\n        debug {\n            signingConfig signingConfigs.release\n        }');
}
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const v of ['KEYSTORE_PATH', 'KEYSTORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']) if (!process.env[v]) throw new Error('Missing env ' + v);
  const f = 'android/app/build.gradle';
  let out = patchSigning(await readFile(f, 'utf8'));
  const withDebug = process.argv.includes('--debug');
  if (withDebug) out = patchDebugSigning(out);
  await writeFile(f, out);
  console.log('Release signing configured (from environment)' + (withDebug ? ' + debug build uses the same key.' : '.'));
}
