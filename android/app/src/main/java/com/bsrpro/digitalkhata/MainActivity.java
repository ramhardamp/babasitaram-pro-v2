package com.bsrpro.digitalkhata;

import com.getcapacitor.BridgeActivity;
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle savedInstanceState) { registerPlugin(BsrSmsSchedulerPlugin.class); registerPlugin(BsrBiometricPlugin.class); registerPlugin(BsrContactsPickerPlugin.class); registerPlugin(BsrPushNotificationsPlugin.class); super.onCreate(savedInstanceState); BsrFirebaseMessagingService.ensureChannel(this); bsrSetupAndroidBack(); } 
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
              String v = value == null ? "" : value.replace("\"", "");
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
  }}
