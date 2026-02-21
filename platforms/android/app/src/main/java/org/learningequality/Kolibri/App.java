package org.learningequality.Kolibri;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Configuration;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.learningequality.Kolibri.notification.NotificationRef;

public class App extends Application implements Configuration.Provider {
  protected final AtomicInteger activeActivities = new AtomicInteger(0);

  @Override
  public void onCreate() {
    super.onCreate();

    // Set up notification channels and lifecycle callbacks before Kolibri init so
    // they're ready for anything triggered by Kolibri.
    createNotificationChannels();
    registerActivityLifecycleCallbacks(new KolibriActivityLifecycleCallbacks());

    // Start Python runtime — must happen on main thread before any Python API usage,
    // and BEFORE waking the work controller: wake() spawns the task_worker process,
    // whose own Python.start would race this one's asset extraction on first launch.
    // This is fast on subsequent launches (assets already extracted).
    if (!Python.isStarted()) {
      Python.start(new AndroidPlatform(this));
    }

    // Wake the work controller before kicking off Kolibri init so it's ready for any
    // tasks the initialization triggers.
    WorkController.getInstance(this).wake();

    // Initialize Kolibri environment (env vars, migrations) on a background thread to avoid ANR.
    // Only run database migrations in the main process to avoid concurrent migration races
    // on the shared SQLite database from multiple processes.
    boolean skipMigrations = !isMainProcess();
    KolibriEnvironmentManager.getInstance()
        .initializeAsync(new KolibriEnvironmentInitializer(this, skipMigrations));
  }

  @NonNull
  @Override
  public Configuration getWorkManagerConfiguration() {
    String processName = getApplicationContext().getPackageName();
    processName += getApplicationContext().getString(R.string.task_worker_process);

    // Using the same quantity of worker threads as Kolibri's python side:
    // https://github.com/learningequality/kolibri/blob/release-v0.16.x/kolibri/utils/options.py#L683
    return new Configuration.Builder()
        .setDefaultProcessName(processName)
        .setMinimumLoggingLevel(android.util.Log.DEBUG)
        .setExecutor(Executors.newFixedThreadPool(6))
        .build();
  }

  private void createNotificationChannels() {
    // Create the NotificationChannel, but only on API 26+ because
    // the NotificationChannel class is not in the Support Library.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Context context = getApplicationContext();
      NotificationChannelCompat serviceChannel =
          new NotificationChannelCompat.Builder(
                  NotificationRef.ID_CHANNEL_SERVICE, NotificationManagerCompat.IMPORTANCE_MIN)
              .setName(context.getString(R.string.notification_service_channel_title))
              .setShowBadge(false)
              .build();
      NotificationChannelCompat taskChannel =
          new NotificationChannelCompat.Builder(
                  NotificationRef.ID_CHANNEL_DEFAULT, NotificationManagerCompat.IMPORTANCE_DEFAULT)
              .setName(context.getString(R.string.notification_default_channel_title))
              .build();

      // Register the channel with the system. You can't change the importance
      // or other notification behaviors after this.
      NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
      notificationManager.createNotificationChannel(serviceChannel);
      notificationManager.createNotificationChannel(taskChannel);
    }
  }

  private boolean isMainProcess() {
    String processName;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      processName = Application.getProcessName();
    } else {
      android.app.ActivityManager am =
          (android.app.ActivityManager) getSystemService(ACTIVITY_SERVICE);
      processName = null;
      if (am != null) {
        int pid = android.os.Process.myPid();
        for (android.app.ActivityManager.RunningAppProcessInfo info : am.getRunningAppProcesses()) {
          if (info.pid == pid) {
            processName = info.processName;
            break;
          }
        }
      }
    }
    return processName != null && processName.equals(getPackageName());
  }

  protected int incrementActiveActivities() {
    synchronized (activeActivities) {
      return activeActivities.incrementAndGet();
    }
  }

  protected int decrementActiveActivities() {
    synchronized (activeActivities) {
      // Prevent decrementing below 0
      if (activeActivities.get() == 0) {
        return 0;
      }
      return activeActivities.decrementAndGet();
    }
  }

  public class KolibriActivityLifecycleCallbacks implements ActivityLifecycleCallbacks {
    @Override
    public void onActivityCreated(@NonNull Activity activity, Bundle savedInstanceState) {}

    @Override
    public void onActivityStarted(@NonNull Activity activity) {
      incrementActiveActivities();
      WorkController.getInstance(getApplicationContext()).wake();
    }

    @Override
    public void onActivityResumed(@NonNull Activity activity) {
      // Don't increment - already done in onActivityStarted
      WorkController.getInstance(getApplicationContext()).wake();
    }

    @Override
    public void onActivityPaused(@NonNull Activity activity) {
      // Don't decrement - wait for onActivityStopped
    }

    @Override
    public void onActivityStopped(@NonNull Activity activity) {
      if (decrementActiveActivities() == 0) {
        WorkController.getInstance(getApplicationContext()).sleep();
      }
    }

    @Override
    public void onActivityPostStopped(@NonNull Activity activity) {}

    @Override
    public void onActivitySaveInstanceState(@NonNull Activity activity, @NonNull Bundle outState) {}

    @Override
    public void onActivityDestroyed(@NonNull Activity activity) {}
  }
}
