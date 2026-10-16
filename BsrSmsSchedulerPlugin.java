package com.bsrpro.digitalkhata;

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
