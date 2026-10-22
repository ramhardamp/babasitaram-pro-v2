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

/* Fingerprint / face / phone PIN-pattern-password unlock (BiometricPrompt). Registered BEFORE super.onCreate() in MainActivity. */
@CapacitorPlugin(name = "BsrBiometric")
public class BsrBiometricPlugin extends Plugin {
  /* Fingerprint / face YA phone ka PIN / pattern / password: jis phone me biometric nahi hai wo bhi unlock kar sake.
     DEVICE_CREDENTIAL ke saath negative button set karna allowed nahi (crash) — system prompt khud "Use PIN/pattern" deta hai. */
  private static final int AUTH = BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

  @PluginMethod public void isAvailable(PluginCall call) {
    BiometricManager bm = BiometricManager.from(getContext());
    int code = bm.canAuthenticate(AUTH);
    boolean bio = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS;
    JSObject ret = new JSObject();
    ret.put("available", code == BiometricManager.BIOMETRIC_SUCCESS);            // biometric YA phone PIN/pattern
    ret.put("biometric", bio);                                                    // fingerprint / face hai
    ret.put("credential", code == BiometricManager.BIOMETRIC_SUCCESS && !bio);   // sirf phone PIN/pattern/password
    ret.put("code", code);
    call.resolve(ret);
  }

  @PluginMethod public void authenticate(final PluginCall call) {
    final String title = call.getString("title", "Unlock");
    final String subtitle = call.getString("subtitle", "");
    final FragmentActivity activity = getActivity();
    if (activity == null) { call.reject("No activity"); return; }
    activity.runOnUiThread(() -> {
      try {
        BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
          .setTitle(title).setSubtitle(subtitle)
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
