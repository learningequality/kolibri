package org.learningequality.Kolibri;

import android.content.Intent;
import android.content.Context;
import org.kivy.android.PythonService;


public class ServiceRemoteshell extends PythonService {


    @Override
    protected int getServiceId() {
        return 1;
    }

    static private void _start(Context ctx, String smallIconName,
                             String contentTitle, String contentText,
                             String pythonServiceArgument) {
        Intent intent = getDefaultIntent(ctx, smallIconName, contentTitle,
					 contentText, pythonServiceArgument);
        ctx.startService(intent);
    }

    static public void start(Context ctx, String pythonServiceArgument) {
        _start(ctx, "", "Kolibri", "Remoteshell", pythonServiceArgument);
    }

    static public void start(Context ctx, String smallIconName,
                             String contentTitle, String contentText,
                             String pythonServiceArgument) {
	_start(ctx, smallIconName, contentTitle, contentText, pythonServiceArgument);
    }

    static public Intent getDefaultIntent(Context ctx, String smallIconName,
                                          String contentTitle, String contentText,
                                          String pythonServiceArgument) {
        Intent intent = new Intent(ctx, ServiceRemoteshell.class);
        String argument = ctx.getFilesDir().getAbsolutePath() + "/app";
        intent.putExtra("androidPrivate", ctx.getFilesDir().getAbsolutePath());
        intent.putExtra("androidArgument", argument);
        intent.putExtra("serviceTitle", "Kolibri");
        intent.putExtra("serviceEntrypoint", "remoteshell.py");
        intent.putExtra("pythonName", "remoteshell");
        intent.putExtra("serviceStartAsForeground", "false");
        intent.putExtra("pythonHome", argument);
        intent.putExtra("pythonPath", argument + ":" + argument + "/lib");
        intent.putExtra("pythonServiceArgument", pythonServiceArgument);
        intent.putExtra("smallIconName", smallIconName);
        intent.putExtra("contentTitle", contentTitle);
        intent.putExtra("contentText", contentText);
        return intent;
    }

    @Override
    protected Intent getThisDefaultIntent(Context ctx, String pythonServiceArgument) {
        return ServiceRemoteshell.getDefaultIntent(ctx, "", "", "",
							     pythonServiceArgument);
    }

    static public void stop(Context ctx) {
        Intent intent = new Intent(ctx, ServiceRemoteshell.class);
        ctx.stopService(intent);
    }
}
