package org.kivy.android;

import android.app.Notification;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import org.learningequality.Kolibri.R;

import java.io.File;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadLocalRandom;

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

    public static int notificationId = -1;

    private String notificationTitle = null;
    private String notificationText = null;
    private int notificationProgress = -1;
    private int notificationTotal = -1;


    public PythonWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);

        String appRoot = PythonUtil.getAppRoot(context);

        notificationTitle = context.getString(R.string.app_name);

        PythonWorker.mWorker = this;

        androidPrivate = appRoot;
        androidArgument = appRoot;
        pythonHome = appRoot;
        pythonPath = appRoot + ":" + appRoot + "/lib";

        File appRootFile = new File(appRoot);
        PythonUtil.unpackAsset(context, "private", appRootFile, false);
        PythonUtil.loadLibraries(
            appRootFile,
            new File(getApplicationContext().getApplicationInfo().nativeLibraryDir)
        );
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
                Log.d(TAG, "Setting python service argument to " + dataArg);
                serviceArg = dataArg;
            } else {
                serviceArg = "";
            }

            // If the work is cancelled, exit the whole process since we
            // have no other way to stop the python thread.
            //
            // FIXME: Unfortunately, exiting here causes the service to
            // behave unreliably since all the connections are not
            // unbound. Android will immediately restart the service to
            // bind the connection again and eventually there are issues
            // with the process not exiting to completely clear the
            // Python environment.
            completer.addCancellationListener(new Runnable() {
                @Override
                public void run() {
                    Log.i(TAG, "Exiting remote work service process");
                    System.exit(0);
                }
            }, Executors.newSingleThreadExecutor());

            // The python thread handling the work needs to be run in a
            // separate thread so that future can be returned. Without
            // it, any cancellation can't be processed.
            final Thread pythonThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    int res = nativeStart(
                        androidPrivate, androidArgument,
                        workerEntrypoint, pythonName,
                        pythonHome, pythonPath,
                        serviceArg
                    );
                    Log.d(TAG, "Finished remote python work: " + res);

                    if (res == 0) {
                        completer.set(Result.success());
                    } else {
                        completer.set(Result.failure());
                    }
                }
            });
            pythonThread.setName("python_worker_thread");

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

    private void setNotificationId() {
        if (notificationId == 0) {
            notificationId = ThreadLocalRandom.current().nextInt(1, 65537);
        }
    }

    private Notification createNotification() {
        setNotificationId();
        Context context = getApplicationContext();
        String channelId = context.getString(R.string.notification_channel_id);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_kolibri_notification)
                .setPriority(NotificationCompat.PRIORITY_LOW)
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
}
