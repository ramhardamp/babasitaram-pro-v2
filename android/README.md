# BSR Pro Android platform scaffold

This Android Gradle project is now present in the source archive. It expects `npm ci` to install the Capacitor packages, Android SDK platform 35, Android build-tools, and a Java 17+ JDK. The supplied environment could not download npm packages or provide an Android SDK, so this scaffold has not been compiled here.

## Push notification setup (required before runtime testing)
1. In Firebase Console, use the existing Firebase project `babasitaram-pro-digital-1e8d6` and Android app with package `com.bsrpro.digitalkhata`. The supplied configuration has been placed at `android/app/google-services.json`.
2. The supplied `google-services.json` is already at `android/app/google-services.json`; do not overwrite it unless Firebase Console confirms the app/project identity.
3. Deploy the callable Cloud Functions from `../functions` using an authorized Firebase CLI account.
4. To send notifications to another user, set the Firebase custom claim `admin: true` only for trusted admin accounts. `sendTestPush` sends only to the authenticated caller.
5. Run `npm ci`, `npm run android:sync`, then build with Android Studio or `npm run android:build` on a machine with Gradle/SDK available.

No production deployment was performed in this loop.
