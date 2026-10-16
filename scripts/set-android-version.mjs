// cap add android ke baad android/app/build.gradle mein versionName/versionCode package.json se set karta hai.
import { readFile, writeFile } from 'node:fs/promises';
import { versionCodeOf } from './sync-version.mjs';

export function patchGradle(text, version) {
  const code = versionCodeOf(version);
  if (!/versionCode\s+\d+/.test(text) || !/versionName\s+"[^"]*"/.test(text)) throw new Error('versionCode/versionName not found in build.gradle');
  return text.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const version = JSON.parse(await readFile('package.json', 'utf8')).version;
  const f = 'android/app/build.gradle';
  await writeFile(f, patchGradle(await readFile(f, 'utf8'), version));
  console.log('Android versionName ' + version + ' versionCode ' + versionCodeOf(version));
}
