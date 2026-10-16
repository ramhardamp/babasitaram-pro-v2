package com.bsrpro.digitalkhata;

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
