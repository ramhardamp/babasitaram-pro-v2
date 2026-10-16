package com.bsrpro.digitalkhata;

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
