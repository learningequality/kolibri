package org.learningequality.Kolibri.util;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import androidx.core.content.FileProvider;
import java.io.File;

/**
 * Utility for sharing content via Android's share intent system. Called from Python via Chaquopy.
 */
public class ShareUtils {
  private static final String TAG = "ShareUtils";

  /**
   * Share content via Android intent system.
   *
   * @param path File path to share (optional)
   * @param message Text message to share (optional)
   * @param app Target app package name (optional, null for chooser)
   * @param mimetype MIME type (optional, defaults based on content)
   */
  public static void shareByIntent(String path, String message, String app, String mimetype) {
    Context context = ContextUtil.getApplicationContext();

    Intent sendIntent = new Intent();
    sendIntent.setAction(Intent.ACTION_SEND);

    if (path != null && !path.isEmpty()) {
      // Share file
      String authority = context.getPackageName() + ".fileprovider";
      Uri uri = FileProvider.getUriForFile(context, authority, new File(path));

      sendIntent.putExtra(Intent.EXTRA_STREAM, uri);
      sendIntent.setType(mimetype != null ? mimetype : "*/*");
      sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    }

    if (message != null && !message.isEmpty()) {
      if (path == null || path.isEmpty()) {
        sendIntent.setType(mimetype != null ? mimetype : "text/plain");
      }
      sendIntent.putExtra(Intent.EXTRA_TEXT, message);
    }

    if (app != null && !app.isEmpty()) {
      sendIntent.setPackage(app);
    }

    sendIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    try {
      context.startActivity(sendIntent);
    } catch (ActivityNotFoundException e) {
      Log.e(TAG, "No activity found to handle share intent", e);
    }
  }
}
