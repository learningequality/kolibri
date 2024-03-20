package org.learningequality.task;

/**
 * Interface for defining a worker implementation that can be observed for updates, and handles
 * execution of a task, and cleanup of resources implementing AutoCloseable.
 */
public interface WorkerImpl<T> extends Observable<T>, AutoCloseable {
    boolean execute(String id, String arg);
}
