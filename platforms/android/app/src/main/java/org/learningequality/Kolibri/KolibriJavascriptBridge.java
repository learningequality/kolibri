package org.learningequality.Kolibri;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.Keep;
import androidx.annotation.RequiresApi;
import androidx.core.content.FileProvider;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import org.learningequality.Kolibri.notification.NotificationRef;
import org.learningequality.Kolibri.notification.Notifier;

public class KolibriJavascriptBridge implements Notifier {
  private static final String TAG = "KolibriJSBridge";
  private static final long PENDING_DOWNLOAD_FILENAME_TTL_MS = 3000;

  private final Activity activity;
  private final WebView webView;
  private volatile PendingDownloadName pendingDownloadName;

  public KolibriJavascriptBridge(Activity activity, WebView webView) {
    this.activity = activity;
    this.webView = webView;
  }

  private static final class PendingDownloadName {
    final String filename;
    final long setAt;

    PendingDownloadName(String filename, long setAt) {
      this.filename = filename;
      this.setAt = setAt;
    }
  }

  /** Called from JS when a click on an {@code <a download>} element is observed. */
  @JavascriptInterface
  @Keep
  public void notePendingDownloadName(String filename) {
    pendingDownloadName = new PendingDownloadName(filename, System.currentTimeMillis());
  }

  /**
   * Consumes and clears the filename captured by {@link #notePendingDownloadName}, if any. Names
   * older than {@link #PENDING_DOWNLOAD_FILENAME_TTL_MS} are discarded.
   */
  String consumePendingDownloadFilename() {
    PendingDownloadName pending = pendingDownloadName;
    pendingDownloadName = null;
    if (pending == null
        || System.currentTimeMillis() - pending.setAt > PENDING_DOWNLOAD_FILENAME_TTL_MS) {
      return null;
    }
    return pending.filename;
  }

  @Override
  public Context getApplicationContext() {
    return activity.getApplicationContext();
  }

  @JavascriptInterface
  @Keep
  public void print() {
    activity.runOnUiThread(
        () -> {
          PrintManager printManager =
              (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
          if (printManager == null) {
            Log.w(TAG, "PrintManager unavailable");
            return;
          }
          String title = webView.getTitle();
          String jobName = title != null ? title : "Kolibri";
          PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
          printManager.print(jobName, adapter, null);
        });
  }

  /**
   * Save a blob/data URL download fetched and base64-encoded on the JS side (DownloadManager can't
   * reach blob: URLs — they only exist in the renderer's memory).
   */
  @JavascriptInterface
  @Keep
  public void saveBlob(String base64Data, String filename, String mimeType) {
    byte[] bytes;
    try {
      bytes = Base64.decode(base64Data, Base64.DEFAULT);
    } catch (IllegalArgumentException e) {
      Log.w(TAG, "Failed to decode blob data for " + filename, e);
      notifyDownloadFailed(filename);
      return;
    }
    saveAndNotify(new ByteArrayInputStream(bytes), filename, mimeType);
  }

  /**
   * Called from JS when the fetch()/FileReader step of a blob:/data: download fails (e.g. the blob
   * URL was revoked before the fetch completed) — {@link #saveBlob} is never reached in that case,
   * so nothing else surfaces the failure.
   */
  @JavascriptInterface
  @Keep
  public void notifyBlobDownloadFailed(String filename) {
    notifyDownloadFailed(filename);
  }

  /** Fetch an http(s) download on a background thread and save it via the same path as a blob. */
  void downloadHttp(String url, String userAgent, String cookie, String filename, String mimeType) {
    HttpURLConnection connection = null;
    try {
      connection = (HttpURLConnection) new URL(url).openConnection();
      connection.setRequestProperty("User-Agent", userAgent);
      if (cookie != null) {
        connection.setRequestProperty("Cookie", cookie);
      }
      int status = connection.getResponseCode();
      if (status != HttpURLConnection.HTTP_OK) {
        Log.w(TAG, "Download failed (" + status + "): " + url);
        notifyDownloadFailed(filename);
        return;
      }
      try (InputStream in = connection.getInputStream()) {
        saveAndNotify(in, filename, mimeType);
      }
    } catch (IOException e) {
      Log.w(TAG, "Failed to download " + url, e);
      notifyDownloadFailed(filename);
    } finally {
      if (connection != null) {
        connection.disconnect();
      }
    }
  }

  /**
   * Writes a download to the device's Downloads collection and posts a tap-to-open notification.
   * Forks the sink by API level: MediaStore on 29+, a direct file write under the public Downloads
   * directory below that (MediaStore.Downloads didn't exist yet).
   */
  private void saveAndNotify(InputStream input, String filename, String mimeType) {
    filename = sanitizeFilename(filename);
    Uri item;
    OutputStream out;
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        item = insertMediaStoreDownload(filename, mimeType);
        out = item != null ? activity.getContentResolver().openOutputStream(item) : null;
      } else {
        File file = uniqueLegacyDownloadFile(filename);
        if (file != null) {
          item = legacyFileUri(file);
          out = new FileOutputStream(file);
        } else {
          item = null;
          out = null;
        }
      }
    } catch (IOException e) {
      Log.w(TAG, "Failed to open destination for " + filename, e);
      notifyDownloadFailed(filename);
      return;
    }
    if (item == null || out == null) {
      Log.w(TAG, "Failed to create destination for " + filename);
      notifyDownloadFailed(filename);
      return;
    }
    try (OutputStream os = out) {
      byte[] buffer = new byte[8192];
      int read;
      while ((read = input.read(buffer)) != -1) {
        os.write(buffer, 0, read);
      }
    } catch (IOException e) {
      Log.w(TAG, "Failed to write download: " + filename, e);
      notifyDownloadFailed(filename);
      return;
    }
    notifyDownloadComplete(filename, item, mimeType);
  }

  /**
   * Strips any directory components from a filename sourced from page/user content (the {@code
   * download} attribute or a guessed URL segment) before it's used as a filesystem path component —
   * otherwise a {@code "../"}-laden name could write outside the Downloads directory on the legacy
   * (API 24-28) file-write path.
   */
  private static String sanitizeFilename(String filename) {
    String name = new File(filename).getName();
    return name.isEmpty() ? "download" : name;
  }

  @RequiresApi(Build.VERSION_CODES.Q)
  private Uri insertMediaStoreDownload(String filename, String mimeType) {
    ContentResolver resolver = activity.getContentResolver();
    ContentValues values = new ContentValues();
    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
    return resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
  }

  /** Picks a non-colliding destination file under the public Downloads directory (API 24-28). */
  private File uniqueLegacyDownloadFile(String filename) {
    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
    if (!dir.exists() && !dir.mkdirs()) {
      return null;
    }
    String base = filename;
    String ext = "";
    int dot = filename.lastIndexOf('.');
    if (dot > 0) {
      base = filename.substring(0, dot);
      ext = filename.substring(dot);
    }
    File file = new File(dir, filename);
    for (int suffix = 1; file.exists(); suffix++) {
      file = new File(dir, base + " (" + suffix + ")" + ext);
    }
    return file;
  }

  private Uri legacyFileUri(File file) {
    return FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", file);
  }

  private void notifyDownloadComplete(String filename, Uri contentUri, String mimeType) {
    Intent viewIntent = new Intent(Intent.ACTION_VIEW);
    viewIntent.setDataAndType(contentUri, mimeType);
    viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    // Fall back to "show in folder" when no app handles the file's MIME (e.g. a bare image with
    // no viewer installed) — otherwise the notification tap would resolve to nothing.
    Intent tapIntent =
        viewIntent.resolveActivity(activity.getPackageManager()) != null
            ? viewIntent
            : new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS);
    PendingIntent contentIntent =
        PendingIntent.getActivity(
            activity,
            contentUri.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    notifyDownload(
        activity.getString(R.string.notification_download_complete_title), filename, contentIntent);
  }

  private void notifyDownloadFailed(String filename) {
    notifyDownload(activity.getString(R.string.notification_download_failed_title), filename, null);
  }

  private void notifyDownload(String title, String filename, PendingIntent contentIntent) {
    NotificationRef ref =
        new NotificationRef(NotificationRef.REF_CHANNEL_DEFAULT, filename.hashCode());
    getNotificationManager(ref).send(title, filename, -1, -1, contentIntent);
  }
}
