import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const android = path.join(root, 'android');
const app = path.join(android, 'app');
const src = path.join(app, 'src', 'main', 'java', 'com', 'bsrpro', 'digitalkhata');
fs.mkdirSync(src, {recursive:true});

const plugin = `package com.bsrpro.digitalkhata;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "BsrSmsScheduler", permissions = {
  @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS })
})
public class BsrSmsSchedulerPlugin extends Plugin {
  static final String PREFS = "bsr_sms_scheduler";
  static final String KEY_REMINDERS = "reminders";

  @PluginMethod public void checkPermission(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("granted", getContext().checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED);
    call.resolve(ret);
  }

  @PluginMethod public void requestPermission(PluginCall call) {
    if (getContext().checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
      JSObject ret = new JSObject(); ret.put("granted", true); call.resolve(ret); return;
    }
    requestPermissionForAlias("sms", call, "smsPermResult");
  }

  // Android 13+ "Restricted settings": side-load (APK file) se install hui app ka SMS permission block rehta hai.
  // User ko App info page kholna padta hai (⋮ -> Allow restricted settings). Ye method wahi page kholta hai.
  @PluginMethod public void openAppSettings(PluginCall call) {
    try {
      Intent i = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      i.setData(android.net.Uri.fromParts("package", getContext().getPackageName(), null));
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(i);
      call.resolve();
    } catch (Exception e) { call.reject("Cannot open app settings: " + e.getMessage(), e); }
  }

  @PluginMethod public void sendSms(PluginCall call) {
    String phone = call.getString("phone", "").trim();
    String message = call.getString("message", "").trim();
    if (phone.isEmpty() || message.isEmpty()) { call.reject("Mobile number and message are required"); return; }
    if (!hasSmsPermission()) { call.reject("SMS permission is not granted"); return; }
    try {
      SmsManager sms = SmsManager.getDefault();
      ArrayList<String> parts = sms.divideMessage(message);
      sms.sendMultipartTextMessage(phone, null, parts, null, null);
      JSObject ret = new JSObject(); ret.put("sent", true); call.resolve(ret);
    } catch (Exception e) { call.reject("SMS send failed: " + e.getMessage(), e); }
  }

  @PluginMethod public void scheduleReminder(PluginCall call) {
    String id = call.getString("id", "").trim();
    String phone = call.getString("phone", "").trim();
    String message = call.getString("message", "").trim();
    long at = call.getLong("triggerAt", 0L);
    if (id.isEmpty() || phone.isEmpty() || message.isEmpty() || at <= 0) { call.reject("Invalid reminder data"); return; }
    if (!hasSmsPermission()) { call.reject("SMS permission is not granted"); return; }
    try {
      cancelInternal(id);
      JSONObject data = new JSONObject();
      data.put("id", id); data.put("phone", phone); data.put("message", message); data.put("triggerAt", at);
      Set<String> set = new HashSet<>(prefs().getStringSet(KEY_REMINDERS, new HashSet<>()));
      set.add(encode(data.toString()));
      prefs().edit().putStringSet(KEY_REMINDERS, set).apply();
      scheduleStatic(getContext(), data);
      JSObject ret = new JSObject(); ret.put("scheduled", true); call.resolve(ret);
    } catch (Exception e) { call.reject("Schedule failed: " + e.getMessage(), e); }
  }

  @PluginMethod public void cancelReminder(PluginCall call) {
    String id = call.getString("id", "").trim();
    if (id.isEmpty()) { call.reject("id is required"); return; }
    cancelInternal(id); call.resolve();
  }

  @PluginMethod public void cancelCustomerReminders(PluginCall call) {
    String prefix = call.getString("prefix", "").trim();
    if (prefix.isEmpty()) { call.reject("prefix is required"); return; }
    Set<String> current = new HashSet<>(prefs().getStringSet(KEY_REMINDERS, new HashSet<>()));
    Set<String> keep = new HashSet<>();
    for (String encoded : current) {
      try {
        JSONObject data = new JSONObject(decode(encoded));
        String id = data.optString("id", "");
        if (id.startsWith(prefix)) cancelAlarm(id); else keep.add(encoded);
      } catch (Exception ignored) {}
    }
    prefs().edit().putStringSet(KEY_REMINDERS, keep).apply(); call.resolve();
  }

  @PermissionCallback
  void smsPermResult(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("granted", hasSmsPermission()); call.resolve(ret);
  }

  static void rescheduleAll(Context context) {
    Set<String> set = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getStringSet(KEY_REMINDERS, new HashSet<>());
    for (String encoded : new HashSet<>(set)) {
      try {
        JSONObject data = new JSONObject(decode(encoded));
        if (data.optLong("triggerAt", 0L) > System.currentTimeMillis()) scheduleStatic(context, data);
      } catch (Exception ignored) {}
    }
  }

  static void scheduleStatic(Context context, JSONObject data) {
    try {
      AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
      Intent intent = new Intent(context, BsrSmsAlarmReceiver.class);
      intent.putExtra("id", data.optString("id"));
      intent.putExtra("phone", data.optString("phone"));
      intent.putExtra("message", data.optString("message"));
      int requestCode = Math.abs(data.optString("id").hashCode());
      PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      long at = Math.max(data.optLong("triggerAt", 0L), System.currentTimeMillis() + 1000L);
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    } catch (Exception ignored) {}
  }

  private boolean hasSmsPermission() {
    return getContext().checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
  }
  private android.content.SharedPreferences prefs() {
    return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }
  private void scheduleInternal(JSONObject data) { scheduleStatic(getContext(), data); }

  private void cancelInternal(String id) {
    cancelAlarm(id);
    Set<String> current = new HashSet<>(prefs().getStringSet(KEY_REMINDERS, new HashSet<>()));
    Set<String> keep = new HashSet<>();
    for (String encoded : current) {
      try { if (!new JSONObject(decode(encoded)).optString("id").equals(id)) keep.add(encoded); } catch (Exception ignored) {}
    }
    prefs().edit().putStringSet(KEY_REMINDERS, keep).apply();
  }

  private void cancelAlarm(String id) {
    AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    Intent intent = new Intent(getContext(), BsrSmsAlarmReceiver.class);
    PendingIntent pi = PendingIntent.getBroadcast(getContext(), Math.abs(id.hashCode()), intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
    if (pi != null) { am.cancel(pi); pi.cancel(); }
  }

  static String encode(String value) { return Base64.encodeToString(value.getBytes(java.nio.charset.StandardCharsets.UTF_8), Base64.NO_WRAP); }
  static String decode(String value) { return new String(Base64.decode(value, Base64.NO_WRAP), java.nio.charset.StandardCharsets.UTF_8); }
}
`;


const contacts = `package com.bsrpro.digitalkhata;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/* Privacy-first contacts: Android's system picker returns only the one user-selected phone contact. */
@CapacitorPlugin(name = "BsrContactsPicker")
public class BsrContactsPickerPlugin extends Plugin {
  @PluginMethod public void pickContact(PluginCall call) {
    Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
    startActivityForResult(call, intent, "contactPicked");
  }

  @ActivityCallback private void contactPicked(PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
      JSObject cancelled = new JSObject(); cancelled.put("cancelled", true); call.resolve(cancelled); return;
    }
    Uri uri = result.getData().getData();
    String name = "", phone = "";
    try (Cursor cursor = getContext().getContentResolver().query(uri,
        new String[] { ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER },
        null, null, null)) {
      if (cursor != null && cursor.moveToFirst()) {
        int nameIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
        int phoneIndex = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
        if (nameIndex >= 0) name = cursor.getString(nameIndex);
        if (phoneIndex >= 0) phone = cursor.getString(phoneIndex);
      }
    } catch (Exception e) { call.reject("Could not read selected contact", e); return; }
    JSObject ret = new JSObject(); ret.put("name", name); ret.put("tel", phone); call.resolve(ret);
  }
}
`;

const biometric = `package com.bsrpro.digitalkhata;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* Fingerprint / face unlock (BiometricPrompt). Registered BEFORE super.onCreate() in MainActivity. */
@CapacitorPlugin(name = "BsrBiometric")
public class BsrBiometricPlugin extends Plugin {
  private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK; // fingerprint, face (weak includes strong)

  @PluginMethod public void isAvailable(PluginCall call) {
    int code = BiometricManager.from(getContext()).canAuthenticate(AUTH);
    JSObject ret = new JSObject();
    ret.put("available", code == BiometricManager.BIOMETRIC_SUCCESS);
    ret.put("code", code);
    call.resolve(ret);
  }

  @PluginMethod public void authenticate(final PluginCall call) {
    final String title = call.getString("title", "Unlock");
    final String subtitle = call.getString("subtitle", "");
    final String negative = call.getString("negativeText", "Cancel");
    final FragmentActivity activity = getActivity();
    if (activity == null) { call.reject("No activity"); return; }
    activity.runOnUiThread(() -> {
      try {
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
          .setTitle(title).setSubtitle(subtitle).setNegativeButtonText(negative)
          .setAllowedAuthenticators(AUTH).setConfirmationRequired(false).build();
        BiometricPrompt prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(activity),
          new BiometricPrompt.AuthenticationCallback() {
            @Override public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
              JSObject ret = new JSObject(); ret.put("success", true); call.resolve(ret);
            }
            @Override public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
              call.reject(String.valueOf(errString), String.valueOf(errorCode));
            }
          });
        prompt.authenticate(info);
      } catch (Exception e) { call.reject("Biometric failed: " + e.getMessage(), e); }
    });
  }
}
`;

const pushPlugin = `package com.bsrpro.digitalkhata;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "BsrPushNotifications", permissions = {
  @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class BsrPushNotificationsPlugin extends Plugin {
  @PluginMethod public void register(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 33 && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      requestPermissionForAlias("notifications", call, "notificationPermissionResult");
      return;
    }
    returnToken(call);
  }

  @PermissionCallback private void notificationPermissionResult(PluginCall call) {
    if (Build.VERSION.SDK_INT >= 33 && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      call.reject("Notification permission was not granted"); return;
    }
    returnToken(call);
  }

  private void returnToken(PluginCall call) {
    if (FirebaseApp.getApps(getContext()).isEmpty()) {
      call.reject("Push is not configured: add the Android app's google-services.json from Firebase Console"); return;
    }
    FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
      if (!task.isSuccessful() || task.getResult() == null || task.getResult().isEmpty()) {
        call.reject("Could not obtain an FCM token", task.getException()); return;
      }
      JSObject ret = new JSObject(); ret.put("token", task.getResult()); ret.put("platform", "android"); call.resolve(ret);
    });
  }

  @PluginMethod public void unregister(PluginCall call) {
    if (FirebaseApp.getApps(getContext()).isEmpty()) { call.resolve(); return; }
    FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task -> {
      if (task.isSuccessful()) call.resolve(); else call.reject("Could not unregister push token", task.getException());
    });
  }
}
`;

const pushService = `package com.bsrpro.digitalkhata;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class BsrFirebaseMessagingService extends FirebaseMessagingService {
  private static final String CHANNEL = "bsrpro_updates";
  public static void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationManager manager = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
      manager.createNotificationChannel(new NotificationChannel(CHANNEL, "BSR Pro updates", NotificationManager.IMPORTANCE_DEFAULT));
    }
  }
  @Override public void onNewToken(String token) {
    getSharedPreferences("bsr_push", MODE_PRIVATE).edit().putString("token", token).apply();
  }
  @Override public void onMessageReceived(RemoteMessage message) {
    String title = message.getNotification() != null && message.getNotification().getTitle() != null ? message.getNotification().getTitle() : message.getData().getOrDefault("title", "BSR Pro");
    String body = message.getNotification() != null && message.getNotification().getBody() != null ? message.getNotification().getBody() : message.getData().getOrDefault("body", "You have a new update");
    NotificationManager manager = (NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
    ensureChannel(this);
    Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent pending = launch == null ? null : PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_DEFAULT);
    if (pending != null) b.setContentIntent(pending);
    manager.notify((int)(System.currentTimeMillis() & 0x7fffffff), b.build());
  }
}
`;

const receiver = `package com.bsrpro.digitalkhata;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

public class BsrSmsAlarmReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context context, Intent intent) {
    String id = intent.getStringExtra("id");
    String phone = intent.getStringExtra("phone");
    String message = intent.getStringExtra("message");
    if (id == null || phone == null || message == null) return;
    try {
      if (context.checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) return;
      SmsManager sms = SmsManager.getDefault();
      ArrayList<String> parts = sms.divideMessage(message);
      sms.sendMultipartTextMessage(phone, null, parts, null, null);
      Set<String> current = new HashSet<>(context.getSharedPreferences(BsrSmsSchedulerPlugin.PREFS, Context.MODE_PRIVATE).getStringSet(BsrSmsSchedulerPlugin.KEY_REMINDERS, new HashSet<>()));
      Set<String> keep = new HashSet<>();
      for (String encoded : current) {
        try { if (!new JSONObject(BsrSmsSchedulerPlugin.decode(encoded)).optString("id").equals(id)) keep.add(encoded); } catch (Exception ignored) {}
      }
      context.getSharedPreferences(BsrSmsSchedulerPlugin.PREFS, Context.MODE_PRIVATE).edit().putStringSet(BsrSmsSchedulerPlugin.KEY_REMINDERS, keep).apply();
    } catch (Exception ignored) {}
  }
}
`;

const boot = `package com.bsrpro.digitalkhata;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BsrSmsBootReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context context, Intent intent) {
    String action = intent.getAction();
    if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
      BsrSmsSchedulerPlugin.rescheduleAll(context);
    }
  }
}
`;

fs.writeFileSync(path.join(src, 'BsrSmsSchedulerPlugin.java'), plugin);
fs.writeFileSync(path.join(src, 'BsrContactsPickerPlugin.java'), contacts);
fs.writeFileSync(path.join(src, 'BsrPushNotificationsPlugin.java'), pushPlugin);
fs.writeFileSync(path.join(src, 'BsrFirebaseMessagingService.java'), pushService);
fs.writeFileSync(path.join(src, 'BsrBiometricPlugin.java'), biometric);
fs.writeFileSync(path.join(src, 'BsrSmsAlarmReceiver.java'), receiver);
fs.writeFileSync(path.join(src, 'BsrSmsBootReceiver.java'), boot);

const main = path.join(src, 'MainActivity.java');
let mainText = fs.readFileSync(main, 'utf8');
// IMPORTANT (Capacitor 3+): custom plugins MUST be registered BEFORE super.onCreate(), because
// super.onCreate() builds the Bridge from the plugins registered so far. Registering afterwards
// leaves the plugin "not implemented" -> SMS permission/send/schedule always fail.
const OLD_ORDER = 'super.onCreate(savedInstanceState); registerPlugin(BsrSmsSchedulerPlugin.class);';          // very old (broken) order
const SMS_ONLY_ORDER = 'registerPlugin(BsrSmsSchedulerPlugin.class); super.onCreate(savedInstanceState);';     // previous version
const NEW_ORDER = 'registerPlugin(BsrSmsSchedulerPlugin.class); registerPlugin(BsrBiometricPlugin.class); registerPlugin(BsrContactsPickerPlugin.class); registerPlugin(BsrPushNotificationsPlugin.class); super.onCreate(savedInstanceState);';
if (!mainText.includes('BsrSmsSchedulerPlugin')) {
  const marker = 'public class MainActivity extends BridgeActivity {';
  if (!mainText.includes(marker)) throw new Error('MainActivity marker not found');
  mainText = mainText.replace(marker, marker + '\n  @Override public void onCreate(android.os.Bundle savedInstanceState) { ' + NEW_ORDER + ' }');
  fs.writeFileSync(main, mainText);
} else {
  // migrate an Android project prepared by an older version of this script
  if (mainText.includes(OLD_ORDER)) mainText = mainText.replace(OLD_ORDER, NEW_ORDER);
  else if (mainText.includes(SMS_ONLY_ORDER) && !mainText.includes('BsrBiometricPlugin')) mainText = mainText.replace(SMS_ONLY_ORDER, NEW_ORDER);
  fs.writeFileSync(main, mainText);
}
// Upgrade an already-prepared MainActivity without duplicating plugin registration.
mainText = fs.readFileSync(main, 'utf8');
if (!mainText.includes('registerPlugin(BsrContactsPickerPlugin.class)')) {
  const superCall = 'super.onCreate(savedInstanceState);';
  if (!mainText.includes(superCall)) throw new Error('MainActivity onCreate marker not found for contacts plugin');
  mainText = mainText.replace(superCall, 'registerPlugin(BsrContactsPickerPlugin.class); ' + superCall);
  fs.writeFileSync(main, mainText);
}
mainText = fs.readFileSync(main, 'utf8');
if (!mainText.includes('registerPlugin(BsrPushNotificationsPlugin.class)')) {
  const superCall = 'super.onCreate(savedInstanceState);';
  if (!mainText.includes(superCall)) throw new Error('MainActivity onCreate marker not found for push plugin');
  mainText = mainText.replace(superCall, 'registerPlugin(BsrPushNotificationsPlugin.class); ' + superCall);
  fs.writeFileSync(main, mainText);
}
mainText = fs.readFileSync(main, 'utf8');
if (!mainText.includes('BsrFirebaseMessagingService.ensureChannel(this)')) {
  const superCall = 'super.onCreate(savedInstanceState);';
  if (!mainText.includes(superCall)) throw new Error('MainActivity onCreate marker not found for push channel setup');
  mainText = mainText.replace(superCall, superCall + ' BsrFirebaseMessagingService.ensureChannel(this);');
  fs.writeFileSync(main, mainText);
}

/* Android system Back must reach the web app before the Activity exits.
   This is intentionally native as a fallback to @capacitor/app, so it also
   works if the JS bridge/plugin has not registered yet. */
mainText = fs.readFileSync(main, 'utf8');
if (!mainText.includes('bsrSetupAndroidBack')) {
  if (!mainText.includes('import androidx.activity.OnBackPressedCallback;')) {
    mainText = mainText.replace(
      'import com.getcapacitor.BridgeActivity;',
      'import com.getcapacitor.BridgeActivity;\nimport androidx.activity.OnBackPressedCallback;'
    );
  }
  const setupMethod = `
  private void bsrSetupAndroidBack() {
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override public void handleOnBackPressed() {
        try {
          android.webkit.WebView webView = getBridge().getWebView();
          if (webView == null) { finish(); return; }
          webView.evaluateJavascript(
            "(function(){try{if(window.__nativeAndroidBack){return window.__nativeAndroidBack()?'consumed':'exit';}return 'nobridge';}catch(e){return 'exit';}})()",
            value -> {
              // evaluateJavascript returns a JSON value: a JS string arrives WITH quotes ("consumed").
              String v = value == null ? "" : value.replace("\\"", "");
              if ("consumed".equals(v)) return;
              if ("nobridge".equals(v) && webView.canGoBack()) { webView.goBack(); return; }
              finish();
            }
          );
        } catch (Exception e) {
          finish();
        }
      }
    });
  }
`;
  const createCall='bsrSetupAndroidBack();';
  if (mainText.includes(NEW_ORDER)) {
    mainText = mainText.replace(NEW_ORDER, NEW_ORDER + ' ' + createCall);
  } else if (mainText.includes('super.onCreate(savedInstanceState);')) {
    mainText = mainText.replace('super.onCreate(savedInstanceState);', 'super.onCreate(savedInstanceState); '+createCall);
  } else {
    const classMarker='public class MainActivity extends BridgeActivity {';
    if (!mainText.includes(classMarker)) throw new Error('MainActivity class marker not found for back setup');
    mainText=mainText.replace(classMarker,classMarker+'\n  @Override public void onCreate(android.os.Bundle savedInstanceState) { super.onCreate(savedInstanceState); '+createCall+' }');
  }
  const classEnd = mainText.lastIndexOf('}');
  if (classEnd < 0) throw new Error('MainActivity class closing brace not found');
  mainText = mainText.slice(0, classEnd) + '\n' + setupMethod.trim() + mainText.slice(classEnd);
  fs.writeFileSync(main, mainText);
}

const manifest = path.join(app, 'src', 'main', 'AndroidManifest.xml');
let manifestText = fs.readFileSync(manifest, 'utf8');
const directSms = process.env.ENABLE_DIRECT_SMS !== 'false'; // default ON (APK auto-SMS). Set ENABLE_DIRECT_SMS=false for a Play-Store-safe build (no SEND_SMS)
if (directSms && !manifestText.includes('android.permission.SEND_SMS')) {
  manifestText = manifestText.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.SEND_SMS" />\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />');
}
if (directSms && !manifestText.includes('.BsrSmsAlarmReceiver')) {
  manifestText = manifestText.replace('</application>', '        <receiver android:name=".BsrSmsAlarmReceiver" android:exported="false" />\n        <receiver android:name=".BsrSmsBootReceiver" android:enabled="true" android:exported="false">\n            <intent-filter>\n                <action android:name="android.intent.action.BOOT_COMPLETED" />\n                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />\n            </intent-filter>\n        </receiver>\n    </application>');
}
if (!manifestText.includes('android.permission.USE_BIOMETRIC')) {
  manifestText = manifestText.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.USE_BIOMETRIC" />');
}
if (!manifestText.includes('android.permission.POST_NOTIFICATIONS')) {
  manifestText = manifestText.replace(/(<manifest[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
}
if (!manifestText.includes('.BsrFirebaseMessagingService')) {
  manifestText = manifestText.replace('</application>', '        <service android:name=".BsrFirebaseMessagingService" android:exported="false"><intent-filter><action android:name="com.google.firebase.MESSAGING_EVENT" /></intent-filter></service>\n    </application>');
}
fs.writeFileSync(manifest, manifestText);

// BiometricPrompt library (AndroidX). Idempotent.
const gradleFile = path.join(app, 'build.gradle');
if (!fs.existsSync(gradleFile)) throw new Error('android/app/build.gradle not found');
let gradleText = fs.readFileSync(gradleFile, 'utf8');
if (!gradleText.includes('androidx.biometric:biometric')) {
  if (!/^dependencies\s*\{/m.test(gradleText)) throw new Error('android/app/build.gradle dependencies block not found');
  gradleText = gradleText.replace(/^dependencies\s*\{/m, (m) => m + '\n    implementation "androidx.biometric:biometric:1.1.0"\n    implementation "com.google.firebase:firebase-messaging:24.1.0"');
  fs.writeFileSync(gradleFile, gradleText);
}
if (!gradleText.includes('com.google.firebase:firebase-messaging')) {
  gradleText = gradleText.replace(/^dependencies\s*\{/m, (m) => m + '\n    implementation "com.google.firebase:firebase-messaging:24.1.0"');
  fs.writeFileSync(gradleFile, gradleText);
}
console.log('Android SMS native layer prepared (direct SMS ' + (directSms ? 'ENABLED' : 'disabled (ENABLE_DIRECT_SMS=false, Play-safe)') + ').');

// Theme: with edge-to-edge (targetSdk 35) the system bars are drawn over the app. The WebView now gets
// margins (capacitor.config.json android.adjustMarginsForEdgeToEdge=force), so the strip behind the bars
// must match the app header (navy) and the status-bar icons must stay light (readable on navy).
const stylesPath = path.join(app, 'src', 'main', 'res', 'values', 'styles.xml');
if (fs.existsSync(stylesPath)) {
  let st = fs.readFileSync(stylesPath, 'utf8');
  if (!st.includes('bsrBarTheme')) {
    st = st.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/,
      '$1\n        <!-- bsrBarTheme -->\n        <item name="android:windowBackground">#1E1B4B</item>\n        <item name="android:statusBarColor">#1E1B4B</item>\n        <item name="android:navigationBarColor">#111827</item>\n        <item name="android:windowLightStatusBar">false</item>');
    fs.writeFileSync(stylesPath, st);
  }
  console.log('Android theme: navy system-bar strip + light status-bar icons.');
}

// Keyboard: resize the WebView when the keyboard opens so inputs and the Login/Save buttons stay visible.
{
  let mf = fs.readFileSync(manifest, 'utf8');
  if (!mf.includes('android:windowSoftInputMode')) {
    mf = mf.replace(/<activity(\s)/, '<activity android:windowSoftInputMode="adjustResize"$1');
    fs.writeFileSync(manifest, mf);
  }
  console.log('Android keyboard mode: adjustResize.');
}
