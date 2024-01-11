package org.kivy.android;

import android.annotation.SuppressLint;
import android.content.Context;
import android.util.Log;
import android.os.Process;

import androidx.annotation.NonNull;
import androidx.concurrent.futures.CallbackToFutureAdapter;
import androidx.work.ForegroundInfo;
import androidx.work.WorkerParameters;
import androidx.work.impl.utils.futures.SettableFuture;
import androidx.work.multiprocess.RemoteListenableWorker;

import com.google.common.util.concurrent.ListenableFuture;

import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;

abstract public class PythonWorker extends RemoteListenableWorker {
    private static final String TAG = "PythonWorker";

    // WorkRequest data key for python worker argument
    public static final String ARGUMENT_WORKER_ARGUMENT = "PYTHON_WORKER_ARGUMENT";

    public static final String TAG_LONG_RUNNING = "worker_long_running";

    public static final int MAX_WORKER_RETRIES = 3;

    public static final boolean DO_RETRY = false;

    // Python environment variables
    private String androidPrivate;
    private String androidArgument;
    private String pythonName;
    private String pythonHome;
    private String pythonPath;
    private String workerEntrypoint;

    public static PythonWorker mWorker = null;

    public PythonWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params) {
        super(context, params);

        String appRoot = PythonUtil.getAppRoot(context);

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

    public boolean isLongRunning() {
        return getTags().contains(TAG_LONG_RUNNING);
    }

    protected String getArgument() {
        String dataArg = getInputData().getString(ARGUMENT_WORKER_ARGUMENT);
        final String serviceArg;
        if (dataArg != null) {
            serviceArg = dataArg;
        } else {
            serviceArg = "";
        }
        return serviceArg;
    }

    protected Result doWork() {
        String id = getId().toString();
        String arg = getArgument();

        Log.d(TAG, id + " Running with python worker argument: " + arg);

        String serializedArg = String.join(",", id, arg, Integer.toString(Process.myPid()), Long.toString(Thread.currentThread().getId()));

        int res = nativeStart(
                androidPrivate, androidArgument,
                workerEntrypoint, pythonName,
                pythonHome, pythonPath,
                serializedArg
        );
        Log.d(TAG, id + " Finished remote python work: " + res);

        if (res == 0) {
            return Result.success();
        }

        return Result.failure();
    }

    @SuppressLint("RestrictedApi")
    @NonNull
    @Override
    public ListenableFuture<Result> startRemoteWork() {
        SettableFuture<Result> future = SettableFuture.create();
        String id = getId().toString();

        if (isLongRunning()) {
            Log.d(TAG, id + " Enabling foreground service for long running task");
            setForegroundAsync(getForegroundInfo());
        }

        // See executor defined in configuration
        ThreadPoolExecutor executor = (ThreadPoolExecutor) getBackgroundExecutor();
        // This is somewhat similar to what the plain `Worker` class does, except that we
        // use `submit` instead of `execute` so we can propagate cancellation
        // See https://android.googlesource.com/platform/frameworks/support/+/60ae0eec2a32396c22ad92502cde952c80d514a0/work/workmanager/src/main/java/androidx/work/Worker.java
        Future<?> threadFuture = executor.submit(() -> {
            try {
                Result r = doWork();
                future.set(r);
            }  catch (Exception e) {
                if (!DO_RETRY || getRunAttemptCount() > MAX_WORKER_RETRIES) {
                    Log.e(TAG, id + " Exception in remote python work", e);
                    future.setException(e);
                } else {
                    Log.w(TAG, id + " Exception in remote python work, scheduling retry", e);
                    future.set(Result.retry());
                }
            } finally {
                cleanup();
            }
        });

        // If `RunnableFuture` was a `ListenableFuture` we could simply use `future.setFuture` to
        // propagate the result and cancellation, but instead add listener to propagate
        // cancellation to python thread, using the task executor which should invoke this in the
        // main thread (where this was originally called from)
        future.addListener(() -> {
            if (future.isCancelled()) {
                Log.i(TAG, "Interrupting python thread");
                threadFuture.cancel(true);
            }
        }, getTaskExecutor().getMainThreadExecutor());
        return future;
    }

    // Native part
    public static native int nativeStart(
        String androidPrivate, String androidArgument,
        String workerEntrypoint, String pythonName,
        String pythonHome, String pythonPath,
        String pythonServiceArgument
    );

    public void onStopped() {
        cleanup();
        super.onStopped();
        mWorker = null;
    }
    protected void cleanup() {}

    abstract public ForegroundInfo getForegroundInfo();

    @Override
    public ListenableFuture<ForegroundInfo> getForegroundInfoAsync() {
        return CallbackToFutureAdapter.getFuture((CallbackToFutureAdapter.Resolver<ForegroundInfo>) completer -> completer.set(getForegroundInfo()));
    }

    public static native int tearDownPython();
}
