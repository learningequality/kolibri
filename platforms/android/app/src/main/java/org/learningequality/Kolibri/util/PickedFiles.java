package org.learningequality.Kolibri.util;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Takes a copy of a file picked from another app.
 *
 * <p>A picked {@code content://} URI stays the picking app's to serve, and the WebView only reads
 * it at form submit. By then Google Drive has re-fetched the local cache behind the URI, so the
 * file no longer matches what the WebView saw and the upload fails before reaching the network.
 */
public final class PickedFiles {
  private static final String TAG = "PickedFiles";
  private static final String CACHE_DIR = "picked";
  private static final String FALLBACK_NAME = "upload";
  private static final String FILE_PROVIDER_SUFFIX = ".fileprovider";

  private PickedFiles() {}

  /**
   * Copies what {@code source} points at into app-private storage.
   *
   * @return a URI onto the copy, or {@code null} if the picked file could not be read — the WebView
   *     then reports no file chosen, rather than accepting one that cannot be uploaded.
   */
  public static Uri copyToPrivateCache(Context context, Uri source) {
    File directory = new File(context.getCacheDir(), CACHE_DIR);
    if (!directory.isDirectory() && !directory.mkdirs()) {
      Log.w(TAG, "Could not create " + directory);
      return null;
    }
    // Only ever one picked file in play.
    deleteContents(directory);
    File target = new File(directory, displayName(context, source));
    try (InputStream in = context.getContentResolver().openInputStream(source);
        OutputStream out = new FileOutputStream(target)) {
      if (in == null) {
        return null;
      }
      copy(in, out);
    } catch (IOException | RuntimeException e) {
      // A dead URI throws SecurityException or FileNotFoundException from openInputStream.
      Log.w(TAG, "Could not copy the picked file", e);
      target.delete();
      return null;
    }
    return FileProvider.getUriForFile(
        context, context.getPackageName() + FILE_PROVIDER_SUFFIX, target);
  }

  /** The name the picker shows, which is what the WebView then reports to the page. */
  private static String displayName(Context context, Uri source) {
    try (Cursor cursor =
        context
            .getContentResolver()
            .query(source, new String[] {OpenableColumns.DISPLAY_NAME}, null, null, null)) {
      if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) {
        // getName() drops any directory part, so a hostile name cannot escape the cache directory.
        String name = new File(cursor.getString(0)).getName();
        if (!name.isEmpty() && !name.equals(".") && !name.equals("..")) {
          return name;
        }
      }
    } catch (RuntimeException e) {
      Log.w(TAG, "Could not read the picked file's name", e);
    }
    return FALLBACK_NAME;
  }

  private static void copy(InputStream in, OutputStream out) throws IOException {
    byte[] buffer = new byte[8192];
    for (int read = in.read(buffer); read != -1; read = in.read(buffer)) {
      out.write(buffer, 0, read);
    }
  }

  private static void deleteContents(File directory) {
    File[] files = directory.listFiles();
    if (files == null) {
      return;
    }
    for (File file : files) {
      file.delete();
    }
  }
}
