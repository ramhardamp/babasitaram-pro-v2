name: Build Digital Khata APK 

# Repo ke root me "" naam se zip upload karo (har baar yahi naam). Baaki sab automatic.
on:
  push:
    paths:
      - ''
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: build-from-zip
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    env:
      ENABLE_DIRECT_SMS: 'true'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Extract ZIP
        run: |
          
          test -f "$ZIP" || { echo "::error::Repo root mein  nahi mila"; exit 1; }
          echo "Using $ZIP"
          rm -rf extracted && mkdir -p extracted
          unzip -oq "$ZIP" -d extracted

      - name: Find project root (package.json + capacitor.config.json)
        id: findroot
        run: |
          CAP=$(find extracted -name capacitor.config.json -not -path '*/node_modules/*' | head -1)
          test -n "$CAP" || { echo "::error::capacitor.config.json nahi mila - ye Digital Khata zip nahi hai"; exit 1; }
          ROOT=$(dirname "$CAP")
          echo "root=$ROOT" >> "$GITHUB_OUTPUT"
          echo "Project root: $ROOT"
          ls -la "$ROOT"

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Java 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: gradle

      - name: Verify Java version
        run: |
          java -version
          echo "JAVA_HOME=$JAVA_HOME"

      - name: Install dependencies
        working-directory: ${{ steps.findroot.outputs.root }}
        run: npm install --no-audit --no-fund

      - name: Tests + web contract + version sync
        working-directory: ${{ steps.findroot.outputs.root }}
        run: |
          npm test
          npm run verify:web
          node scripts/sync-version.mjs --check

      - name: Build Android project (Capacitor)
        working-directory: ${{ steps.findroot.outputs.root }}
        run: |
          npm run prepare:web
          GS=android/app/google-services.json
          if [ -f "$GS" ]; then cp "$GS" "$RUNNER_TEMP/google-services.json"; fi
          rm -rf android
          npx cap add android
          if [ -f "$RUNNER_TEMP/google-services.json" ]; then cp "$RUNNER_TEMP/google-services.json" android/app/google-services.json; fi
          node scripts/set-android-version.mjs
          node scripts/prepare-android.mjs
          npx @capacitor/assets generate --android --assetPath assets --iconBackgroundColor '#1e1b4b' --iconBackgroundColorDark '#111827' --splashBackgroundColor '#1e1b4b' --splashBackgroundColorDark '#0f172a'
          npx cap sync android

      # SAME key har build me => naya APK purani app ke upar update hota hai ("App not installed" nahi aata)
      - name: Sign with the SAME persistent key
        working-directory: ${{ steps.findroot.outputs.root }}
        env:
          KEYSTORE_B64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          for v in KEYSTORE_B64 KEYSTORE_PASSWORD KEY_ALIAS KEY_PASSWORD; do
            if [ -z "${!v}" ]; then echo "::error::GitHub secret missing for $v"; exit 1; fi
          done
          echo "$KEYSTORE_B64" | base64 -d > "$RUNNER_TEMP/release.keystore"
          KEYSTORE_PATH="$RUNNER_TEMP/release.keystore" node scripts/configure-android-signing.mjs --debug
          echo "KEYSTORE_PATH=$RUNNER_TEMP/release.keystore" >> "$GITHUB_ENV"

      - name: Build debug APK
        working-directory: ${{ steps.findroot.outputs.root }}/android
        env:
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          chmod +x ./gradlew
          ./gradlew assembleDebug --stacktrace

      - name: Verify APK (signature digest, package, SMS permission)
        working-directory: ${{ steps.findroot.outputs.root }}
        run: |
          APK=android/app/build/outputs/apk/debug/app-debug.apk
          test -f "$APK"
          SDK="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
          BT=$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)
          "$BT/apksigner" verify --verbose --print-certs "$APK" | tee apk-certs.txt
          grep -i "SHA-256 digest" apk-certs.txt
          "$BT/aapt" dump badging "$APK" | grep -q "package: name='com.bsrpro.digitalkhata'"
          "$BT/aapt" dump permissions "$APK" | grep -q "android.permission.SEND_SMS"
          mkdir -p "$GITHUB_WORKSPACE/dist" && cp "$APK" "$GITHUB_WORKSPACE/dist/BSRPRO-DigitalKhata.apk"

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: digital-khata-debug-apk
          path: dist/BSRPRO-DigitalKhata.apk
          if-no-files-found: error
          retention-days: 30

      - name: Publish APK in Releases (phone se seedha download)
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release create "zip-build-${GITHUB_RUN_NUMBER}" dist/BSRPRO-DigitalKhata.apk --repo "${{ github.repository }}" --target "${{ github.sha }}" --prerelease --title "APK build #${GITHUB_RUN_NUMBER} (from uploaded zip)" --notes "Same signing key as every build, so it updates the installed app."
