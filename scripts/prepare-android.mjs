import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const android = path.join(root, 'android');
const app = path.join(android, 'app');
const src = path.join(app, 'src', 'main', 'java', 'com', 'babasitaram', 'pro');
fs.mkdirSync(src, {recursive:true});

const plugin = `package com.babasitaram.pro;

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
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
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

const receiver = `package com.babasitaram.pro;

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

const boot = `package com.babasitaram.pro;

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
fs.writeFileSync(path.join(src, 'BsrSmsAlarmReceiver.java'), receiver);
fs.writeFileSync(path.join(src, 'BsrSmsBootReceiver.java'), boot);

const main = path.join(src, 'MainActivity.java');
let mainText = fs.readFileSync(main, 'utf8');
if (!mainText.includes('BsrSmsSchedulerPlugin')) {
  mainText = mainText.replace(/(public class MainActivity extends BridgeActivity\\s*\\{)/, '$1\\n  @Override public void onCreate(android.os.Bundle savedInstanceState) { super.onCreate(savedInstanceState); registerPlugin(BsrSmsSchedulerPlugin.class); }');
  fs.writeFileSync(main, mainText);
}

const manifest = path.join(app, 'src', 'main', 'AndroidManifest.xml');
let manifestText = fs.readFileSync(manifest, 'utf8');
if (!manifestText.includes('android.permission.SEND_SMS')) {
  manifestText = manifestText.replace(/(<manifest[^>]*>)/, '$1\\n    <uses-permission android:name="android.permission.SEND_SMS" />\\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />');
}
if (!manifestText.includes('.BsrSmsAlarmReceiver')) {
  manifestText = manifestText.replace('</application>', '        <receiver android:name=".BsrSmsAlarmReceiver" android:exported="false" />\\n        <receiver android:name=".BsrSmsBootReceiver" android:enabled="true" android:exported="false">\\n            <intent-filter>\\n                <action android:name="android.intent.action.BOOT_COMPLETED" />\\n                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />\\n            </intent-filter>\\n        </receiver>\\n    </application>');
}
fs.writeFileSync(manifest, manifestText);
console.log('Android SMS native layer prepared.');
