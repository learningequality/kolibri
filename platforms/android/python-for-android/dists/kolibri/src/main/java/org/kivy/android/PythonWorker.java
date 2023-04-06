package org.kivy.android;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.R;
import org.learningequality.Notifications;

import java.io.File;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

public class PythonWorker extends RemoteListenableWorker {
    private static final String TAG = "PythonWorker";

    // WorkRequest data key for python worker argument
    public static final String ARGUMENT_WORKER_ARGUMENT = "PYTHON_WORKER_ARGUMENT";

    public static final String ARGUMENT_LONG_RUNNING = "LONG_RUNNING_ARGUMENT";

    // Python environment variables
    private String androidPrivate;
    private String androidArgument;
    private String pythonName;
    private String pythonHome;
    private String pythonPath;
    private String workerEntrypoint;

    public static PythonWorker mWorker = null;

    public int notificationId;

    public static ThreadLocal<Integer> threadNotificationId = new ThreadLocal<>();

    private String notificationTitle;

    private static final AtomicInteger threadCounter = new AtomicInteger(0);

    public PythonWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);

        String appRoot = PythonUtil.getAppRoot(context);

        notificationTitle = context.getString(R.string.app_name);

        notificationId = ThreadLocalRandom.current().nextInt(1, 65537);

        PythonWorker.mWorker = this;

        androidPrivate = appRoot;
        androidArgument = appRoot;
        pythonHome = appRoot;
        pythonPath = appRoot + ":" + appRoot + "/lib";
    }

    public void setPythonName(String value) {
        pythonName = value;
    }

    public void setWorkerEntrypoint(String value) {
        workerEntrypoint = value;
    }

    @Override
    public ListenableFuture<Result> startRemoteWork() {
        return CallbackToFutureAdapter.getFuture(completer -> {
            String dataArg = getInputData().getString(ARGUMENT_WORKER_ARGUMENT);
            final String serviceArg;
            if (dataArg != null) {
                Log.d(TAG, "Setting python worker argument to " + dataArg);
                serviceArg = dataArg;
            } else {
                serviceArg = "";
            }

            boolean longRunning = getInputData().getBoolean(ARGUMENT_LONG_RUNNING, false);

            if (longRunning) {
                runAsForeground();
            }

            // The python thread handling the work needs to be run in a
            // separate thread so that future can be returned. Without
            // it, any cancellation can't be processed.
            final Thread pythonThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    PythonUtil.loadLibraries(
                            new File(getApplicationContext().getApplicationInfo().nativeLibraryDir)
                    );

                    Log.d(TAG, "Running with python worker argument: " + serviceArg);

                    threadCounter.incrementAndGet();

                    threadNotificationId.set(notificationId);

                    int res = nativeStart(
                        androidPrivate, androidArgument,
                        workerEntrypoint, pythonName,
                        pythonHome, pythonPath,
                        serviceArg
                    );

                    int remainingThreads = threadCounter.decrementAndGet();

                    if (remainingThreads == 0) {
                        tearDownPython();
                    }

                    Log.d(TAG, "Finished remote python work: " + res);

                    if (res == 0) {
                        completer.set(Result.success());
                    } else {
                        completer.set(Result.failure());
                    }
                }
            });
            pythonThread.setName("python_worker_thread");

            completer.addCancellationListener(new Runnable() {
                @Override
                public void run() {
                    Log.i(TAG, "Interrupting remote work");
                    pythonThread.interrupt();
                }
            }, Executors.newSingleThreadExecutor());

            Log.i(TAG, "Starting remote python work");
            pythonThread.start();

            return TAG + " work thread";
        });
    }

    // Native part
    public static native int nativeStart(
        String androidPrivate, String androidArgument,
        String workerEntrypoint, String pythonName,
        String pythonHome, String pythonPath,
        String pythonServiceArgument
    );

    public ForegroundInfo getForegroundInfo() {
        return new ForegroundInfo(notificationId, Notifications.createNotification(notificationTitle, null, -1, -1));
    }

    public void runAsForeground() {
        setForegroundAsync(getForegroundInfo());
    }

    @Override
    public ListenableFuture<ForegroundInfo> getForegroundInfoAsync() {
        return CallbackToFutureAdapter.getFuture((CallbackToFutureAdapter.Resolver<ForegroundInfo>) completer -> completer.set(getForegroundInfo()));
    }

    public static native int tearDownPython();

    public static int getNotificationId() {
        return threadNotificationId.get();
    }
}
