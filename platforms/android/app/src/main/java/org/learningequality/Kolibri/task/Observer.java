package org.learningequality.Kolibri.task;

import androidx.annotation.Nullable;

/** Small interface for an observer that listens for updates from an observable. */
public interface Observer<T> {
  void update(@Nullable T message);
}
