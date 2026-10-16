package com.bsrpro.digitalkhata;

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
