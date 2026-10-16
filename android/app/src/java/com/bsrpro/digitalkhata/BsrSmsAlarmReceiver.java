package com.bsrpro.digitalkhata;

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
