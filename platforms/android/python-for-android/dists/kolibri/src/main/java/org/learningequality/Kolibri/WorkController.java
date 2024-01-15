package org.learningequality.Kolibri;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.Message;
import android.os.Messenger;
import android.os.RemoteException;
import android.util.Log;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * This class is responsible for managing the work controller service. As a singleton, it can be
 * used to wake, sleep, and stop the service.
 */
public class WorkController {
    public static final String TAG = "Kolibri.WorkController";
    protected static WorkController mInstance;

    private final Context context;
    private Connection connection;
    private Messenger messenger;
    private final AtomicBoolean isConnected = new AtomicBoolean(false);

    private WorkController(Context context) {
        this.context = context;
    }

    public static WorkController getInstance(Context context) {
        // The double checking is a common convention for singletons when synchronizing.
        if (mInstance == null) {
            synchronized (WorkController.class) {
                if (mInstance == null) {
                    mInstance = new WorkController(context);
                }
            }
        }
        return mInstance;
    }

    public void wake() {
        synchronized (isConnected) {
            // If we're already connected, then it's awake
            if (isConnected.get()) {
                return;
            }
        }
        dispatch(buildMessage(WorkControllerService.Action.WAKE));
        // Always do a reconcile when waking up, and we were previously asleep
        dispatch(buildMessage(WorkControllerService.Action.RECONCILE));
    }

    public void sleep() {
        synchronized (isConnected) {
            // If we're not already connected, then it's asleep
            if (!isConnected.get()) {
                return;
            }
        }
        dispatch(buildMessage(WorkControllerService.Action.SLEEP));
    }

    public void stop() {
        synchronized (isConnected) {
            // If we're not already connected, then it's asleep
            if (!isConnected.get()) {
                return;
            }
        }
        dispatch(buildMessage(WorkControllerService.Action.STOP));
    }

    public void reconcile() {
        synchronized (isConnected) {
            // If we're not already connected, then it's asleep
            if (!isConnected.get()) {
                return;
            }
        }
        dispatch(buildMessage(WorkControllerService.Action.RECONCILE));
    }

    public void destroy() {
        if (connection != null) {
            context.unbindService(connection);
            connection = null;
            messenger = null;
            isConnected.set(false);
        }
        mInstance = null;
    }

    protected Message buildMessage(WorkControllerService.Action action) {
        return Message.obtain(null, action.getId(), 0, 0);
    }

    protected void dispatch(Message message) {
        dispatch(message, 0);
    }

    protected void dispatch(Message message, int attempts) {
        if (connection == null) {
            connection = new Connection();
        }

        synchronized (isConnected) {
            // If we're already connected, then it's awake
            if (!isConnected.get()) {
                // Binding allows us to monitor the connection state
                context.bindService(
                        new Intent(context, WorkControllerService.class),
                        connection,
                        Context.BIND_AUTO_CREATE
                );
            }
        }

        // Start the service with this intent
        try {
            messenger.send(message);
        } catch (RemoteException e) {
            // If the remote process has died, then we need to rebind
            synchronized (isConnected) {
                isConnected.set(false);
                messenger = null;
            }
            if (attempts < 3) {
                dispatch(message, attempts + 1);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send message " + message, e);
        }
    }

    public class Connection implements ServiceConnection {
        public void onServiceConnected(ComponentName name, IBinder service) {
            Log.d(TAG, "Connected to work manager service");
            synchronized (isConnected) {
                isConnected.set(true);
                messenger = new Messenger(service);
            }
        }

        public void onServiceDisconnected(ComponentName name) {
            Log.d(TAG, "Disconnected from work controller service");
            synchronized (isConnected) {
                isConnected.set(false);
                messenger = null;
            }
        }

        @Override
        public void onBindingDied(ComponentName name) {
            Log.d(TAG, "Disconnected from work controller service");
            synchronized (isConnected) {
                isConnected.set(false);
                messenger = null;
            }
        }

        @Override
        public void onNullBinding(ComponentName name) {
            Log.d(TAG, "Disconnected from work controller service");
            synchronized (isConnected) {
                isConnected.set(false);
                messenger = null;
            }
        }
    }
}
