package org.learningequality.task;

import androidx.annotation.Nullable;

/**
 * Small interface for an observerable which can be observed for updates with an Observer.
 */
public interface Observable<T> {
    void addObserver(Observer<T> observer);
    void removeObserver(Observer<T> observer);
    void notifyObservers(@Nullable T message);
}
