package org.learningequality.Kolibri;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.File;
import org.learningequality.Kolibri.discovery.DiscoveredServer;

final class ServerSelection {
  static final String LOCAL = "LOCAL";

  private static final String PREFS_NAME = "kolibri_server";
  private static final String PREF_SELECTION = "selection";
  private static final String PREF_REMOTE_NAME = "remote_name";
  private static final String PREF_ADOPTION_CHECKED = "adoption_checked";

  private ServerSelection() {}

  /** {@link #LOCAL}, a remote server's {@code instance_id}, or {@code null} when none is chosen. */
  static String get(Context context) {
    return prefs(context).getString(PREF_SELECTION, null);
  }

  static void selectLocal(Context context) {
    prefs(context).edit().putString(PREF_SELECTION, LOCAL).remove(PREF_REMOTE_NAME).apply();
  }

  static void selectRemote(Context context, DiscoveredServer server) {
    prefs(context)
        .edit()
        .putString(PREF_SELECTION, server.getInstanceId())
        .putString(PREF_REMOTE_NAME, server.getDeviceName())
        .apply();
  }

  /** The selected remote server's {@code device_name}, or {@code null} when none is selected. */
  static String getRemoteName(Context context) {
    return prefs(context).getString(PREF_REMOTE_NAME, null);
  }

  static void adoptExistingInstall(Context context) {
    SharedPreferences prefs = prefs(context);
    if (prefs.contains(PREF_ADOPTION_CHECKED)) {
      return;
    }
    SharedPreferences.Editor editor = prefs.edit().putBoolean(PREF_ADOPTION_CHECKED, true);
    File database = new File(KolibriEnvironmentInitializer.kolibriHome(context), "db.sqlite3");
    if (!prefs.contains(PREF_SELECTION) && database.exists()) {
      editor.putString(PREF_SELECTION, LOCAL);
    }
    editor.apply();
  }

  private static SharedPreferences prefs(Context context) {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }
}
