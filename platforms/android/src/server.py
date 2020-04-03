import json
import logging
import os
import sys

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)

import pew
import pew.ui

logging.info("Entering server.py...")

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
sys.path.append(os.path.join(script_dir, "kolibri", "dist"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri.deployment.default.settings.base"

# TODO: before shipping the app, make this contingent on debug vs production mode
os.environ["KOLIBRI_RUN_MODE"] = "pew-dev"


def start_django(port):

    from kolibri.utils.cli import main

    logging.info("Starting server...")

    main(["start", "--foreground", "--port={port}".format(port=port)])


if pew.ui.platform == "android":

    from jnius import autoclass

    service_args = json.loads(os.environ.get("PYTHON_SERVICE_ARGUMENT") or "{}")

    service = autoclass('org.kivy.android.PythonService').mService
    File = autoclass("java.io.File")
    Timezone = autoclass("java.util.TimeZone")
    AndroidString = autoclass('java.lang.String')
    Drawable = autoclass("{}.R$drawable".format(service.getPackageName()))
    Context = autoclass('android.content.Context')
    Intent = autoclass('android.content.Intent')
    PendingIntent = autoclass('android.app.PendingIntent')
    NotificationBuilder = autoclass('android.app.Notification$Builder')
    Notification = autoclass('android.app.Notification')

    def make_service_foreground(title, message):
        PythonActivity = autoclass('org.kivy.android.PythonActivity')
        app_context = service.getApplication().getApplicationContext()
        notification_builder = NotificationBuilder(app_context)
        notification_builder.setContentTitle(AndroidString(title))
        notification_builder.setContentText(AndroidString(message))
        notification_intent = Intent(app_context, PythonActivity)
        notification_intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK)
        notification_intent.setAction(Intent.ACTION_MAIN)
        notification_intent.addCategory(Intent.CATEGORY_LAUNCHER)
        intent = PendingIntent.getActivity(service, 0, notification_intent, 0)
        notification_builder.setContentIntent(intent)
        notification_builder.setSmallIcon(Drawable.icon)
        notification_builder.setAutoCancel(True)
        new_notification = notification_builder.getNotification()
        service.startForeground(1, new_notification)

    os.environ["KOLIBRI_HOME"] = service_args["HOME"]

    os.environ["TZ"] = Timezone.getDefault().getDisplayName()
    os.environ["LC_ALL"] = "en_US.UTF-8"

    logging.info("Home folder: {}".format(os.environ["KOLIBRI_HOME"]))
    logging.info("Timezone: {}".format(os.environ["TZ"]))

    make_service_foreground("Kolibri is running...", "Click here to resume.")

    start_django(service_args["PORT"])
