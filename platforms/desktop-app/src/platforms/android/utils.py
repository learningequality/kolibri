import json
import logging
import os
from jnius import autoclass, cast, jnius

logging.basicConfig(level=logging.DEBUG)

AndroidString = autoclass("java.lang.String")
Context = autoclass("android.content.Context")
Environment = autoclass("android.os.Environment")
File = autoclass("java.io.File")
FileProvider = autoclass('android.support.v4.content.FileProvider')
Intent = autoclass("android.content.Intent")
NotificationBuilder = autoclass("android.app.Notification$Builder")
NotificationManager = autoclass("android.app.NotificationManager")
PackageManager = autoclass("android.content.pm.PackageManager")
PendingIntent = autoclass("android.app.PendingIntent")
PythonActivity = autoclass("org.kivy.android.PythonActivity")
Timezone = autoclass("java.util.TimeZone")
Uri = autoclass("android.net.Uri")

ANDROID_VERSION = autoclass("android.os.Build$VERSION")
SDK_INT = ANDROID_VERSION.SDK_INT


def is_service_context():
    return "PYTHON_SERVICE_ARGUMENT" in os.environ


def get_service():
    assert is_service_context(), "Cannot get service, as we are not in a service context."
    PythonService = autoclass("org.kivy.android.PythonService")
    return PythonService.mService


def get_timezone_name():
    return Timezone.getDefault().getDisplayName()


def start_service(service_name, service_args):
    service = autoclass("org.learningequality.Kolibri.Service{}".format(service_name.title()))
    service.start(PythonActivity.mActivity, json.dumps(dict(service_args)))

def get_service_args():
    assert is_service_context(), "Cannot get service args, as we are not in a service context."
    return json.loads(os.environ.get("PYTHON_SERVICE_ARGUMENT") or "{}")


def get_version_name():
    return get_activity().getPackageManager().getPackageInfo(PythonActivity.getPackageName(), 0).versionName


def get_activity():
    if is_service_context():
        return cast("android.app.Service", get_service())
    else:
        return PythonActivity.mActivity


def is_app_installed(app_id):

    manager = get_activity().getPackageManager()

    try:
        manager.getPackageInfo(app_id, PackageManager.GET_ACTIVITIES)
    except jnius.JavaException as e:
        return False

    return True


# TODO: check for storage availability, allow user to chose sd card or internal
def get_home_folder():
    kolibri_home_file = get_activity().getExternalFilesDir(None)
    return os.path.join(kolibri_home_file.toString(), "KOLIBRI_DATA")


def send_whatsapp_message(msg):
    share_by_intent(msg=msg, app="com.whatsapp")


def share_by_intent(path=None, filename=None, msg=None, app=None, mimetype=None):

    assert path or msg or filename, "Must provide either a path, a filename, or a msg to share"

    sendIntent = Intent()
    sendIntent.setAction(Intent.ACTION_SEND)
    if path:
        uri = FileProvider.getUriForFile(
            Context.getApplicationContext(),
            "org.learningequality.Kolibri.fileprovider",
            File(path)
        )
        parcelable = cast("android.os.Parcelable", uri)
        sendIntent.putExtra(Intent.EXTRA_STREAM, parcelable)
        sendIntent.setType(AndroidString(mimetype or "*/*"))
        sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    if msg:
        if not path:
            sendIntent.setType(AndroidString(mimetype or "text/plain"))
        sendIntent.putExtra(Intent.EXTRA_TEXT, AndroidString(msg))
    if app:
        sendIntent.setPackage(AndroidString(app))
    sendIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    get_activity().startActivity(sendIntent)


def make_service_foreground(title, message):
    service = get_service()
    Drawable = autoclass("{}.R$drawable".format(service.getPackageName()))
    app_context = service.getApplication().getApplicationContext()

    if SDK_INT >= 26:
        NotificationChannel = autoclass("android.app.NotificationChannel")
        notification_service = cast(NotificationManager, get_activity().getSystemService(Context.NOTIFICATION_SERVICE))
        channel_id = get_activity().getPackageName()
        app_channel = NotificationChannel(channel_id, "Kolibri Background Server", NotificationManager.IMPORTANCE_DEFAULT)
        notification_service.createNotificationChannel(app_channel)
        notification_builder = NotificationBuilder(app_context, channel_id)
    else:
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
