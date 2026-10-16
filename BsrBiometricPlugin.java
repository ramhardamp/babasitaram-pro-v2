package com.bsrpro.digitalkhata;

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
