package org.kivy.android;

import android.app.Notification;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Data;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.R;

import java.io.File;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

public class PythonWorker extends RemoteListenableWorker {
    private static final String TAG = "PythonWorker";

    // WorkRequest data key for python worker argument
    public static final String ARGUMENT_WORKER_ARGUMENT = "PYTHON_WORKER_ARGUMENT";

    // Python environment variables
    private String androidPrivate;
    private String androidArgument;
    private String pythonName;
    private String pythonHome;
    private String pythonPath;
    private String workerEntrypoint;

    public static PythonWorker mWorker = null;

    public int notificationId = -1;

    private String notificationTitle = null;
    private String notificationText = null;
    private int notificationProgress = -1;
    private int notificationTotal = -1;

    private static final AtomicInteger threadCounter = new AtomicInteger(0);

    public static final String NOTIFICATION_ID = "NOTIFICATION_ID";

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

        // Store the notification id so that we can retrieve it via WorkManager.
        setProgressAsync(new Data.Builder().putInt(NOTIFICATION_ID, notificationId).build());
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

    private Notification createNotification() {
        Context context = getApplicationContext();
        String channelId = context.getString(R.string.notification_channel_id);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_kolibri_notification)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setColor(context.getColor(R.color.primary))
                .setSilent(true)
                .setContentTitle(notificationTitle);
        if (notificationText != null) {
            builder.setContentText(notificationText);
        }
        if (notificationProgress != -1 && notificationTotal != -1) {
            builder.setProgress(notificationTotal, notificationProgress, false);
        }
        return builder.build();
    }

    public void updateNotificationText(String title, String text) {
        notificationTitle = title;
        notificationText = text;
    }

    public void updateNotificationProgress(int progress, int total) {
        notificationProgress = progress;
        notificationTotal = total;
    }

    public void showNotification() {
        Context context = getApplicationContext();
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        notificationManager.notify(notificationId, createNotification());
    }

    public ForegroundInfo getForegroundInfo() {
        return new ForegroundInfo(notificationId, createNotification());
    }

    public void runAsForeground() {
        setForegroundAsync(getForegroundInfo());
    }

    @Override
    public ListenableFuture<ForegroundInfo> getForegroundInfoAsync() {
        return CallbackToFutureAdapter.getFuture((CallbackToFutureAdapter.Resolver<ForegroundInfo>) completer -> completer.set(getForegroundInfo()));
    }

    public static native int tearDownPython();
}
