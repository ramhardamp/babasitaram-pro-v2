# Firestore Rules — Design Notes

File: `firestore.rules`. Tests: `tests/rules/firestore.rules.test.mjs` (Firestore Emulator, `npm run test:rules`, CI `web-ci.yml` → `rules` job).

## Principles
- [x] Backward compatible: sirf zaroori fields validate hote hain (`hasOnly` nahi), taaki purane documents lockout na hon
- [x] Update par: field "unchanged ya valid" (legacy string rate/principal wale loans block nahi hote)
- [x] Default deny: `match /{document=**}` band

## Collections
- [x] `users/{uid}` — owner read/create/update; `uid` immutable; account delete band
- [x] `parties` — owner; `name` 1–200 chars, `balance` number, `viewToken` well-formed (20–64 alnum)
- [x] `transactions` — create: type whitelist, amount/principal 0 < x ≤ 1e9, `createdAt == request.time`, party maujood; loan_repay/interest_paid ko `loanId`
- [x] `transactions` update — `partyId/type/loanId/createdAt` immutable; deleted record wapas nahi khulta; soft delete mein `deletedBy == uid`
- [x] `transactions` **hard delete band** (financial history soft-delete se hi hatti hai)
- [x] `publicViews/{token}` — `get` public (well-formed token + revoked/expired nahi), **`list` band** (enumeration nahi); revoked/expired sirf owner ko dikhta hai
- [x] publicViews create — `businessUid == auth.uid` + party owner ki; update/delete sirf owner; `partyId`, `createdAt` immutable

## Limits (honest)
- [ ] **Emulator tests is environment mein chalaye nahi gaye** (no network/emulator) — pehli CI run par `rules` job dekhein
- [ ] Rules "party mein history nahi hai" delete-check enforce nahi kar sakte (app transaction mein karta hai)
- [ ] Public portal `get` token-secrecy par depend karta hai; token revoke/rotate customer detail mein "पोर्टल लिंक बदलें" se
