package org.learningequality.Kolibri.task;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.work.Data;
import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import java.util.List;
import java.util.UUID;

public class TaskWorkerImpl implements WorkerImpl<TaskWorkerImpl.Message> {
  private static final String TAG = "TaskWorkerImpl";
  private static final ThreadLocal<TaskWorkerImpl> localInstance = new ThreadLocal<>();
  private final UUID id;
  private final List<Observer<Message>> observers;
  private final Context context;

  public TaskWorkerImpl(UUID id, @NonNull Context context) {
    this.id = id;
    this.context = context;
    observers = new java.util.ArrayList<>();
    localInstance.set(this);
  }

  /** Execute the task by calling Python taskworker module */
  @Override
  public boolean execute(String id, String arg) {
    try {
      Python py = Python.getInstance();
      PyObject taskworkerModule = py.getModule("taskworker");

      // Call the task worker with the job ID and WorkManager request ID
      PyObject result = taskworkerModule.callAttr("execute_job", id.toString(), arg);

      // Return true if task succeeded
      return result != null && result.toBoolean();

    } catch (Exception e) {
      Log.e(TAG, "Error executing task " + id, e);
      return false;
    }
  }

  public void addObserver(Observer<Message> observer) {
    observers.add(observer);
  }

  public void removeObserver(Observer<Message> observer) {
    observers.remove(observer);
  }

  public void notifyObservers(@Nullable Message message) {
    if (message == null) {
      return;
    }
    for (Observer<Message> observer : observers) {
      observer.update(message);
    }
  }

  public void close() {
    observers.clear();
    localInstance.remove();
  }

  protected Message buildMessage(
      String notificationTitle, String notificationText, int progress, int total) {
    return new Message(notificationTitle, notificationText, progress, total);
  }

  /** This method is called by the python side, when progress is updated */
  public static void notifyLocalObservers(
      String notificationTitle, String notificationText, int progress, int total) {
    TaskWorkerImpl instance = localInstance.get();
    if (instance != null) {
      instance.notifyObservers(
          instance.buildMessage(notificationTitle, notificationText, progress, total));
    }
  }

  public class Message {
    public static final String KEY_ID = "id";
    public static final String KEY_NOTIFICATION_TITLE = "notificationTitle";
    public static final String KEY_NOTIFICATION_TEXT = "notificationText";
    public static final String KEY_PROGRESS = "progress";
    public static final String KEY_TOTAL_PROGRESS = "totalProgress";

    public final String notificationTitle;
    public final String notificationText;
    public final int progress;
    public final int totalProgress;

    public Message(
        String notificationTitle, String notificationText, int progress, int totalProgress) {
      this.notificationTitle = notificationTitle;
      this.notificationText = notificationText;
      this.progress = progress;
      this.totalProgress = totalProgress;
    }

    public UUID getId() {
      return id;
    }

    public Data toData() {
      return new Data.Builder()
          .putString(KEY_ID, id.toString())
          .putString(KEY_NOTIFICATION_TITLE, notificationTitle)
          .putString(KEY_NOTIFICATION_TEXT, notificationText)
          .putInt(KEY_PROGRESS, progress)
          .putInt(KEY_TOTAL_PROGRESS, totalProgress)
          .build();
    }
  }
}
