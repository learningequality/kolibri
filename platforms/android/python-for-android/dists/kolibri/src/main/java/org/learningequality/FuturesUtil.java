package org.learningequality;

import android.util.Log;

import com.google.common.util.concurrent.ListenableFuture;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executor;

import java9.util.concurrent.CompletableFuture;

public class FuturesUtil {
    public static final String TAG = "Kolibri.FuturesUtil";

    public static <T> CompletableFuture<T> toCompletable(ListenableFuture<T> future, Executor executor) {
        CompletableFuture<T> completableFuture = new CompletableFuture<>();
        future.addListener(() -> {
            try {
                completableFuture.complete(future.get(3, java.util.concurrent.TimeUnit.SECONDS));
                Log.d(TAG, "Future completed");
            } catch (InterruptedException | ExecutionException e) {
                Log.d(TAG, "Future encountered exception");
                completableFuture.completeExceptionally(e);
            } catch (java.util.concurrent.TimeoutException e) {
                Log.d(TAG, "Future timed out");
                completableFuture.completeExceptionally(e);
            }
        }, executor);
        completableFuture.whenCompleteAsync((result, error) -> {
            if (completableFuture.isCancelled()) {
                Log.d(TAG, "Propagating cancellation to future");
                future.cancel(true);
            }
        }, executor);
        return completableFuture;
    }
}
