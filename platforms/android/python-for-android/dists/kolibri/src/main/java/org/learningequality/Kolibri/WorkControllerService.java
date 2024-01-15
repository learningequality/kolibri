package org.learningequality.Kolibri;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.work.multiprocess.RemoteWorkManagerService;

import org.learningequality.Task;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import java9.util.concurrent.CompletableFuture;

/**
 * This service is responsible for starting the remote work manager service and
 * initializing the work manager in the task worker process.
 */
public class WorkControllerService extends Service {
    public static final String TAG = "Kolibri.MonitorService";
    public static final int ACTION_WAKE = 1;
    public static final int ACTION_SLEEP = 2;
    public static final int ACTION_STOP = 3;
    public static final int ACTION_RECONCILE = 4;
    protected static final AtomicReference<State> state = new AtomicReference<>(State.SLEEPING);
    protected static final AtomicInteger taskCount = new AtomicInteger(0);
    protected final AtomicBoolean isConnected = new AtomicBoolean(false);
    protected Intent workManagerIntent;
    protected ExecutorService executor;
    protected CompletableFuture<Void> futureChain;
    protected Messenger messenger;
    private ServiceConnection connection;

    @Override
    public void onCreate() {
        Log.v(TAG, "Initializing work controller service");

        synchronized (state) {
            state.set(State.AWAKE);
        }

        workManagerIntent = new Intent(this, RemoteWorkManagerService.class);
        connection = new WorkManagerConnection();
        executor = Executors.newFixedThreadPool(2);
        futureChain = CompletableFuture.completedFuture(null);
        messenger = new Messenger(new WorkControllerHandler());
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "Destroying work controller service");
        synchronized (state) {
            state.set(State.STOPPED);
        }
        unbindService(connection);
        executor.shutdown();
        futureChain.cancel(true);

        executor = null;
        futureChain = null;
        workManagerIntent = null;
        messenger = null;
        connection = null;
    }

    protected void onWake() {
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

        startTask(() -> {
            // Wakey wakey remote work manager service
            bindService(workManagerIntent, connection, Context.BIND_AUTO_CREATE);
            return null;
        });
    }

    protected void onReconcile() {
        startTask(() -> Task.reconcile(getApplicationContext(), executor)
                .thenApply((r) -> {
                    if (r) {
                        Log.d(TAG, "Reconciliation task completed");
                    } else {
                        Log.d(TAG, "Reconciliation task failed");
                    }
                    return null;
                }));
    }

    protected void onSleep() {
        synchronized (state) {
            state.set(State.SLEEPING);
        }
        synchronized (taskCount) {
            if (taskCount.get() == 0) {
                Log.d(TAG, "Stopping service due to no more tasks");
                stopSelf();
            }
        }
    }

    protected void onStop() {
        // should eventually call `onDestroy` and that will set the stopped state
        stopSelf();
    }

    protected void startTask(WorkTask task) {
        futureChain = futureChain.thenComposeAsync((nothing) -> {
            try {
                CompletableFuture<Void> f = task.run();
                if (f != null) {
                    return f;
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed running task", e);
            } finally {
                synchronized (taskCount) {
                    if (taskCount.decrementAndGet() == 0) {
                        synchronized (state) {
                            if (state.get() != State.AWAKE) {
                                Log.d(TAG, "Stopping service due to no more tasks");
                                stopSelf();
                            }
                        }
                    }
                }
            }
            return CompletableFuture.completedFuture(null);
        }, executor);
    }

    @Override
    public void onLowMemory() {
        Log.d(TAG, "Alerted of low memory");
        synchronized (state) {
            state.set(State.AWAKE_LOW_MEMORY);
        }
    }

    @Override
    public void onTrimMemory(int level) {
        Log.d(TAG, "Trimming memory, stopping service");
        synchronized (state) {
            state.set(State.AWAKE_LOW_MEMORY);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return messenger.getBinder();
    }

    public enum State {
        SLEEPING,
        AWAKE,
        AWAKE_LOW_MEMORY,
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

    interface WorkTask {
        CompletableFuture<Void> run();
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
            Log.d(TAG, "WorkManager service null binding");
            synchronized (isConnected) {
                isConnected.set(false);
            }
        }
    }

    class WorkControllerHandler extends Handler {
        @Override
        public void handleMessage(Message msg) {
            Log.d(TAG, "Received message " + msg.what);
            synchronized (taskCount) {
                taskCount.incrementAndGet();
            }
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
                    synchronized (taskCount) {
                        taskCount.decrementAndGet();
                    }
                    break;
            }
        }
    }
}
