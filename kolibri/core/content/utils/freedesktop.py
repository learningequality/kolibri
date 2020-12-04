import base64
import mimetypes
import os

from django.forms.models import model_to_dict

from .paths import get_content_share_dir_path
from kolibri.core.content.models import ChannelMetadata


def _get_freedesktop_file_path(child):
    file_path = os.path.join(get_content_share_dir_path(), child)

    file_dirname = os.path.dirname(file_path)
    if not os.path.isdir(file_dirname):
        os.makedirs(file_dirname)

    return file_path


def _get_desktop_file_path(channel):
    return _get_freedesktop_file_path(
        os.path.join(
            "applications",
            "org.learningequality.Kolibri.Channel.{}.desktop".format(channel.id)
        )
    )


def _get_icon_file_path(channel):
    extension = mimetypes.guess_extension(channel.thumbnail.split(';')[0].split(':')[1])
    return _get_freedesktop_file_path(
        os.path.join(
            "icons",
            "org.learningequality.Kolibri.Channel.{}{}".format(channel.id, extension)
        )
    )


def create_channel_freedesktop_files(channel_id):
    channel = ChannelMetadata.objects.get(id=channel_id)

    # Create Desktop file
    with open(_get_desktop_file_path(channel), "w") as f:
        f.write("""[Desktop Entry]
Version=1.0
Type=Application
Name={name}
Exec=gio open "kolibri:{id}"
X-Endless-LaunchMaximized=true
Categories=Education;
""".format(**model_to_dict(channel)))

        if channel.thumbnail:
            f.write("Icon=org.learningequality.Kolibri.Channel.{}\n".format(channel.id))

    # Create channel icon
    if channel.thumbnail:
        with open(_get_icon_file_path(channel), "wb") as f:
            f.write(base64.b64decode(channel.thumbnail.split(';')[1].split(',')[1]))


def delete_channel_freedesktop_files(channel_id):
    channel = ChannelMetadata.objects.get(id=channel_id)

    try:
        os.remove(_get_desktop_file_path(channel))
    except OSError:
        pass

    try:
        os.remove(_get_icon_file_path(channel))
    except OSError:
        pass
