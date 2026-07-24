package org.learningequality.Kolibri;

import android.content.Context;
import android.provider.Settings;
import android.util.Log;
import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import java.io.File;
import java.util.TimeZone;
import org.learningequality.Kolibri.util.ContextUtil;

/**
 * Sets up the Kolibri environment: Python startup, environment variables, and Kolibri
 * initialization. Run via {@link KolibriEnvironmentManager#initializeAsync}, which guarantees this
 * executes at most once at a time per process.
 */
public class KolibriEnvironmentInitializer {
  private static final String TAG = "KolibriEnvInitializer";

  private final Context context;
  private final boolean skipUpdate;

  /**
   * @param context Android context
   * @param skipUpdate if true, skips database migrations (use in worker processes where the main
   *     process handles migrations)
   */
  public KolibriEnvironmentInitializer(Context context, boolean skipUpdate) {
    this.context = context.getApplicationContext();
    this.skipUpdate = skipUpdate;
  }

  public void initialize() {
    ContextUtil.init(context);

    // Start Python if not already started
    if (!Python.isStarted()) {
      Log.d(TAG, "Starting Python");
      Python.start(new AndroidPlatform(context));
    }

    // Set environment variables through Python (Chaquopy-compatible approach)
    // This ensures Python's os.environ sees the variables
    setPythonEnvironmentVariables();

    // Initialize Kolibri Python modules
    initializeKolibri();

    Log.i(TAG, "Kolibri environment initialized successfully");
  }

  /**
   * Set environment variables through Python's os.environ This is the Chaquopy-compatible approach
   * that ensures Python can see the variables
   */
  private void setPythonEnvironmentVariables() {
    try {
      Python py = Python.getInstance();
      PyObject osModule = py.getModule("os");
      PyObject environ = osModule.get("environ");

      // KOLIBRI_HOME - where Kolibri stores its data
      File externalFilesDir = context.getExternalFilesDir(null);
      if (externalFilesDir == null) {
        // Fallback to internal storage if external storage is unavailable
        externalFilesDir = context.getFilesDir();
        Log.w(TAG, "External storage unavailable, using internal storage");
      }
      File kolibriHome = new File(externalFilesDir, "KOLIBRI_DATA");
      if (!kolibriHome.exists()) {
        if (!kolibriHome.mkdirs()) {
          throw new RuntimeException("Failed to create KOLIBRI_HOME directory");
        }
      }
      // Pre-create logs dir: kolibri.utils.conf's exists()/mkdir() races between processes
      File logsDir = new File(kolibriHome, "logs");
      if (!logsDir.exists() && !logsDir.mkdirs()) {
        Log.w(TAG, "Failed to pre-create Kolibri logs directory");
      }
      environ.callAttr("__setitem__", "KOLIBRI_HOME", kolibriHome.getAbsolutePath());

      // Version information
      String versionName = BuildConfig.VERSION_NAME;
      environ.callAttr("__setitem__", "KOLIBRI_APK_VERSION_NAME", versionName);

      // Disable restart hooks (not needed on Android)
      environ.callAttr("__setitem__", "KOLIBRI_RESTART_HOOKS", "");

      // Single-user embedded app: keep the session alive indefinitely
      environ.callAttr("__setitem__", "KOLIBRI_AUTO_LOGOUT_TIME", "0");

      // Timezone
      TimeZone tz = TimeZone.getDefault();
      environ.callAttr("__setitem__", "TZ", tz.getID());

      // Locale
      environ.callAttr("__setitem__", "LC_CTYPE", "en_US.UTF-8");

      // Android language
      String language = context.getResources().getConfiguration().getLocales().get(0).getLanguage();
      environ.callAttr("__setitem__", "ANDROID_LANG", language);

      // CherryPy thread pool size (keep it small for mobile)
      environ.callAttr("__setitem__", "KOLIBRI_CHERRYPY_THREAD_POOL", "2");

      // Run mode (debug vs release)
      if (BuildConfig.DEBUG) {
        environ.callAttr("__setitem__", "KOLIBRI_RUN_MODE", "android-debug");
      } else {
        environ.callAttr("__setitem__", "KOLIBRI_RUN_MODE", "");
      }

      // Auth token
      String authToken = org.learningequality.Kolibri.util.AuthUtils.getOrCreateAuthToken();
      environ.callAttr("__setitem__", "KOLIBRI_AUTH_TOKEN", authToken);

      // Morango node ID (from Android ID)
      String androidId =
          Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
      if (isValidAndroidId(androidId)) {
        environ.callAttr("__setitem__", "MORANGO_NODE_ID", androidId);
      }

      Log.d(TAG, "Python environment variables set successfully");

    } catch (Exception e) {
      Log.e(TAG, "Error setting Python environment variables", e);
      throw new RuntimeException("Failed to set Python environment variables", e);
    }
  }

  private static boolean isValidAndroidId(String androidId) {
    if (androidId == null || androidId.length() < 16) {
      return false;
    }
    // Known bad Android ID on some emulators
    if ("9774d56d682e549c".equals(androidId)) {
      return false;
    }
    return true;
  }

  private void initializeKolibri() {
    try {
      Python py = Python.getInstance();

      // Patch zeroconf BEFORE kolibri.main, which binds the unpatched
      // get_all_addresses at import time (see monkey_patch_zeroconf.py)
      py.getModule("monkey_patch_zeroconf");

      // Import Kolibri main module
      PyObject kolibriMain = py.getModule("kolibri.main");

      // Enable required plugins BEFORE initialize()
      // Plugins must be enabled before the registry is initialized
      kolibriMain.callAttr("enable_plugin", "android_app_plugin");

      // Call initialize. skip_update=True skips database migrations, which should
      // only be run by the main process to avoid concurrent migration races.
      kolibriMain.callAttr("initialize", skipUpdate);

      Log.d(TAG, "Kolibri Python modules initialized");

    } catch (Exception e) {
      Log.e(TAG, "Error initializing Kolibri Python modules", e);
      throw new RuntimeException("Failed to initialize Kolibri", e);
    }
  }
}
