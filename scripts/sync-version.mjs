// Single version source: package.json -> app-config.js + service-worker.js cache name.
// Use: node scripts/sync-version.mjs            (files likhta hai)
//      node scripts/sync-version.mjs --check    (drift ho to exit 1, kuch likhta nahi)
// Optional env: PRODUCTION_WEB_URL (https://.../ trailing slash ke saath) -> fallback URL override.
import { readFile, writeFile } from 'node:fs/promises';

export function versionCodeOf(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error('package.json version must be MAJOR.MINOR.PATCH, got: ' + version);
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (min > 99 || pat > 99) throw new Error('minor/patch must be <= 99 for versionCode formula');
  return maj * 10000 + min * 100 + pat;
}
export function normalizeWebUrl(u) {
  const url = new URL(u);
  if (url.protocol !== 'https:') throw new Error('PRODUCTION_WEB_URL must be https');
  return url.origin + url.pathname.replace(/\/?$/, '/');
}
export function applySync(cfgText, swText, version, webUrl) {
  let cfg = cfgText.replace(/(appVersion:\s*')[^']*(')/, `$1${version}$2`);
  if (webUrl) cfg = cfg.replace(/(productionWebUrl:\s*')[^']*(')/, `$1${webUrl}$2`);
  const sw = swText.replace(/const CACHE='guru-shree-shell-v[^']*';/, `const CACHE='guru-shree-shell-v${version}';`);
  if (cfg === cfgText && !cfgText.includes(`appVersion: '${version}'`)) throw new Error('appVersion pattern not found in app-config.js');
  if (!sw.includes(`guru-shree-shell-v${version}`)) throw new Error('CACHE pattern not found in service-worker.js');
  return { cfg, sw };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const version = JSON.parse(await readFile('package.json', 'utf8')).version;
  versionCodeOf(version);
  const webUrl = process.env.PRODUCTION_WEB_URL ? normalizeWebUrl(process.env.PRODUCTION_WEB_URL) : '';
  const cfgOld = await readFile('app-config.js', 'utf8');
  const swOld = await readFile('service-worker.js', 'utf8');
  const { cfg, sw } = applySync(cfgOld, swOld, version, webUrl);
  if (check) {
    if (cfg !== cfgOld || sw !== swOld) { console.error('Version drift: run node scripts/sync-version.mjs'); process.exit(1); }
    console.log('Version in sync: ' + version);
  } else {
    await writeFile('app-config.js', cfg); await writeFile('service-worker.js', sw);
    console.log('Synced version ' + version + ' (versionCode ' + versionCodeOf(version) + ')');
  }
}
