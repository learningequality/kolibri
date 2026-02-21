package org.learningequality.Kolibri;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.Message;
import android.os.Messenger;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.work.multiprocess.RemoteWorkManagerService;
import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * This service is responsible for starting the remote work manager service and initializing the
 * work manager in the task worker process.
 */
public class WorkControllerService extends Service {
  public static final String TAG = "Kolibri.WorkControllerService";
  public static final int ACTION_WAKE = 1;
  public static final int ACTION_SLEEP = 2;
  public static final int ACTION_STOP = 3;
  public static final int ACTION_RECONCILE = 4;
  protected static final AtomicReference<State> state = new AtomicReference<>(State.SLEEPING);
  protected static final AtomicInteger taskCount = new AtomicInteger(0);
  protected final AtomicBoolean isConnected = new AtomicBoolean(false);
  protected final AtomicBoolean shouldReconcile = new AtomicBoolean(true);
  protected Intent workManagerIntent;
  protected ExecutorService executor;
  protected CompletableFuture<Void> futureChain;
  protected WorkControllerHandler messageHandler;
  protected Messenger messenger;
  private ServiceConnection connection;

  @Override
  public void onCreate() {
    super.onCreate();
    Log.v(TAG, "Initializing work controller service");

    synchronized (state) {
      state.set(State.AWAKE);
    }

    // Initialize Python and Kolibri environment asynchronously (returns the existing future
    // if App already started it). This service runs in the task_worker process, so skip
    // migrations — the main process handles them.
    CompletableFuture<Void> envInitFuture =
        KolibriEnvironmentManager.getInstance()
            .initializeAsync(new KolibriEnvironmentInitializer(this, true));

    workManagerIntent = new Intent(this, RemoteWorkManagerService.class);
    connection = new WorkManagerConnection();
    executor = Executors.newFixedThreadPool(3);
    // Seed the future chain with the init future so all tasks wait for init to complete
    futureChain = CompletableFuture.runAsync(envInitFuture::join, executor);
    messageHandler = new WorkControllerHandler();
    messenger = new Messenger(messageHandler);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    Log.d(TAG, "Destroying work controller service");
    synchronized (state) {
      state.set(State.STOPPED);
    }
    if (isConnected.get()) {
      unbindService(connection);
    }
    executor.shutdown();
    futureChain.cancel(true);

    executor = null;
    futureChain = null;
    workManagerIntent = null;
    messageHandler = null;
    messenger = null;
    connection = null;
  }

  protected void onWake() {
    Log.d(TAG, "Waking up work controller service");
    synchronized (state) {
      if (state.get() != State.AWAKE_LOW_MEMORY) {
        state.set(State.AWAKE);
      }
    }

    synchronized (isConnected) {
      if (isConnected.get()) {
        // Already connected, no need to bind again
        return;
      }
    }

    startTask(
        new WorkTask("wake_work_manager") {
          @Override
          public CompletableFuture<Void> run() {
            // Wakey wakey remote work manager service
            Log.d(TAG, "Binding to work manager service");
            bindService(workManagerIntent, connection, Context.BIND_AUTO_CREATE);
            return null;
          }
        });
  }

  protected void onReconcile() {
    synchronized (shouldReconcile) {
      if (!shouldReconcile.get()) {
        Log.d(TAG, "Skipping enqueue of task reconciliation");
        return;
      }
      shouldReconcile.set(false);
    }

    Log.d(TAG, "Enqueuing task reconciliation");
    startTask(
        new WorkTask("reconciliation") {
          @Override
          public CompletableFuture<Void> run() {
            return CompletableFuture.supplyAsync(
                () -> {
                  try {
                    Python py = Python.getInstance();
                    PyObject reconciler = py.getModule("task_reconciler");
                    PyObject result = reconciler.callAttr("reconcile_tasks");

                    // Result is a tuple (added, cancelled)
                    java.util.List<PyObject> resultList = result.asList();
                    int added = resultList.get(0).toInt();
                    int cancelled = resultList.get(1).toInt();
                    Log.i(TAG, "Reconciliation: added=" + added + ", cancelled=" + cancelled);
                  } catch (Exception e) {
                    Log.e(TAG, "Error during reconciliation", e);
                  }
                  return null;
                },
                executor);
          }
        });
  }

  protected void onSleep() {
    Log.d(TAG, "Sleeping work controller service");
    synchronized (state) {
      state.set(State.SLEEPING);
    }
    synchronized (taskCount) {
      if (taskCount.get() == 0) {
        Log.d(TAG, "Stopping service due to no more tasks");
        stopSelf();
      } else {
        Log.d(TAG, "Waiting for " + taskCount.get() + " tasks to complete");
      }
    }
    synchronized (shouldReconcile) {
      shouldReconcile.set(true);
    }
  }

  protected void onStop() {
    Log.d(TAG, "Stopping work controller service");
    // should eventually call `onDestroy` and that will set the stopped state
    synchronized (state) {
      state.set(State.STOPPED);
    }
    stopSelf();
  }

  protected void startTask(WorkTask task) {
    synchronized (taskCount) {
      taskCount.incrementAndGet();
    }
    futureChain =
        futureChain
            .thenCompose(
                (nothing) -> {
                  try {
                    Log.d(TAG, "Running task: " + task.getName());
                    CompletableFuture<Void> f = task.run();
                    if (f != null) {
                      return f;
                    }
                  } catch (Exception e) {
                    Log.e(TAG, "Failed running task: " + task.getName(), e);
                  }
                  return CompletableFuture.completedFuture(null);
                })
            .thenApply(
                (nothing) -> {
                  Log.d(TAG, "Task completed: " + task.getName());
                  boolean hasNoMoreTasks = false;
                  synchronized (taskCount) {
                    if (taskCount.decrementAndGet() == 0) {
                      Log.d(TAG, "Checking state for stopping service");
                      hasNoMoreTasks = true;
                    }
                  }
                  if (hasNoMoreTasks) {
                    synchronized (state) {
                      if (state.get() != State.AWAKE) {
                        Log.d(TAG, "Stopping service due to no more tasks");
                        stopSelf();
                      }
                    }
                  }
                  return null;
                });
  }

  @Override
  public void onLowMemory() {
    super.onLowMemory();
    Log.d(TAG, "Alerted of low memory");
    synchronized (state) {
      state.set(State.AWAKE_LOW_MEMORY);
    }
  }

  @Override
  public void onTrimMemory(int level) {
    super.onTrimMemory(level);
    if (level >= TRIM_MEMORY_RUNNING_LOW) {
      Log.d(TAG, "Trimming memory (level " + level + "), entering low memory state");
      synchronized (state) {
        state.set(State.AWAKE_LOW_MEMORY);
      }
    }
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    Log.d(TAG, "Producing binding to work controller service");
    return messenger.getBinder();
  }

  public enum State {
    AWAKE,
    AWAKE_LOW_MEMORY,
    SLEEPING,
    STOPPED,
  }

  public enum Action {
    WAKE(ACTION_WAKE),
    SLEEP(ACTION_SLEEP),
    STOP(ACTION_STOP),
    RECONCILE(ACTION_RECONCILE),
    ;

    public final int id;

    Action(int id) {
      this.id = id;
    }

    public int getId() {
      return id;
    }
  }

  abstract static class WorkTask {
    protected final String name;

    public WorkTask(String name) {
      this.name = name;
    }

    public String getName() {
      return name;
    }

    public abstract CompletableFuture<Void> run();
  }

  class WorkManagerConnection implements ServiceConnection {
    @Override
    public void onServiceConnected(android.content.ComponentName name, IBinder service) {
      Log.d(TAG, "WorkManager service connected");
      synchronized (isConnected) {
        isConnected.set(true);
      }
    }

    @Override
    public void onServiceDisconnected(android.content.ComponentName name) {
      Log.d(TAG, "WorkManager service disconnected");
      synchronized (isConnected) {
        isConnected.set(false);
      }
    }

    @Override
    public void onBindingDied(android.content.ComponentName name) {
      Log.d(TAG, "WorkManager service binding died");
      synchronized (isConnected) {
        isConnected.set(false);
      }
    }

    @Override
    public void onNullBinding(android.content.ComponentName name) {
      // WorkManager service should produce a binding normally
      Log.d(TAG, "WorkManager service gave null binding");
      synchronized (isConnected) {
        isConnected.set(false);
      }
    }
  }

  class WorkControllerHandler extends Handler {
    public WorkControllerHandler() {
      super(Looper.getMainLooper());
    }

    @Override
    public void handleMessage(Message msg) {
      Log.d(TAG, "Received message " + msg.what);
      switch (msg.what) {
        case ACTION_WAKE:
          onWake();
          break;
        case ACTION_RECONCILE:
          onReconcile();
          break;
        case ACTION_SLEEP:
          onSleep();
          break;
        case ACTION_STOP:
          onStop();
          break;
        default:
          Log.e(TAG, "Unknown action " + msg.what);
          break;
      }
    }
  }
}
