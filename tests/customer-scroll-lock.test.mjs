// Regression: Customer/History se Home par wapas aane par Home ka scroll hang ho jata tha.
// Root cause: `#screenContainer:has(#customerDetail .txn-history-list){overflow:hidden!important}` customer-mode ke bina bhi match hota tha,
// kyunki #customerDetail ka purana HTML hidden screen me DOM me rehta hai. Rule sirf customer-mode me chalna chahiye.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
for (const file of ['dashboard.html','www/dashboard.html']) {
  test(`${file}: overflow-lock :has() rules customer-mode tak scoped hain`, () => {
    const src = readFileSync(new URL('../'+file, import.meta.url), 'utf8');
    assert.equal((src.match(/#screenContainer:has\(#customerDetail/g) || []).length, 0, 'unscoped :has rule mila - Home scroll hang hoga');
    assert.ok(src.includes('#screenContainer.customer-mode:has(#customerDetail .txn-history-list){overflow:hidden!important'));
  });
}
