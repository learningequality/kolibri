import base64
import configparser
import logging
import mimetypes
import os
import re

from django.utils.functional import cached_property
from django.utils.six import BytesIO
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.paths import get_content_dir_path
from PIL import Image
from PIL import ImageFilter

logger = logging.getLogger(__name__)

DATA_URI_PATTERN = re.compile(
    "^(data:)(?P<mimetype>[\\w\\/\\+-]*)(;base64),(?P<data_b64>.*)"
)
LAUNCHER_PREFIX = "org.learningequality.Kolibri.Channel."


def update_channel_launchers():
    launchers_from_db = list(ChannelLauncher_FromDatabase.load_all())
    launchers_from_disk = list(ChannelLauncher_FromDisk.load_all())

    for launcher in launchers_from_disk:
        if not any(map(launcher.is_same_channel, launchers_from_db)):
            logger.info("Removing desktop launcher %s", launcher)
            launcher.delete()

    for launcher in launchers_from_db:
        if not any(map(launcher.is_same_channel, launchers_from_disk)):
            logger.info("Creating desktop launcher %s", launcher)
            launcher.save()
        elif any(map(launcher.compare, launchers_from_disk)):
            logger.info("Updating desktop launcher %s", launcher)
            launcher.save()


class ChannelLauncher(object):
    def __str__(self):
        return self.desktop_file_name

    @property
    def channel_id(self):
        raise NotImplementedError()

    @property
    def channel_version(self):
        raise NotImplementedError()

    @property
    def desktop_file_path(self):
        return os.path.join(self.applications_dir, self.desktop_file_name)

    @property
    def desktop_file_name(self):
        return "{prefix}{channel}.desktop".format(
            prefix=LAUNCHER_PREFIX, channel=self.channel_id
        )

    @property
    def applications_dir(self):
        return os.path.join(_get_content_share_dir_path(), "applications")

    @property
    def icons_dir(self):
        return os.path.join(_get_content_share_dir_path(), "icons")

    def compare(self, other):
        if not self.is_same_channel(other):
            return None
        self_channel, self_format = map(int, self.channel_version.split("~"))
        other_channel, other_format = map(int, other.channel_version.split("~"))
        return (self_channel - other_channel) or (self_format - other_format)

    def is_same_channel(self, other):
        return self.channel_id == other.channel_id

    def save(self):
        self.write_desktop_file()
        self.write_channel_icon()

    def delete(self):
        self.delete_desktop_file()
        self.delete_channel_icon()

    def write_desktop_file(self):
        raise NotImplementedError()

    def delete_desktop_file(self):
        os.remove(self.desktop_file_path)

    def write_channel_icon(self):
        raise NotImplementedError()

    def delete_channel_icon(self):
        raise NotImplementedError()


class ChannelLauncher_FromDatabase(ChannelLauncher):
    FORMAT_VERSION = 1

    def __init__(self, channelmetadata):
        self.__channelmetadata = channelmetadata

    @classmethod
    def load_all(cls):
        for channelmetadata in ChannelMetadata.objects.all():
            yield cls(channelmetadata)

    @property
    def channel_id(self):
        return self.__channelmetadata.id

    @property
    def channel_version(self):
        return "{}~{}".format(self.__channelmetadata.version, self.FORMAT_VERSION)

    @cached_property
    def __channel_icon(self):
        if self.__channelmetadata.thumbnail:
            return ChannelIcon(self.__channelmetadata.thumbnail)
        else:
            return None

    @property
    def __icon_file_path(self):
        if not self.__channel_icon:
            return None

        icon_file_name = "{prefix}{channel}{extension}".format(
            prefix=LAUNCHER_PREFIX,
            channel=self.channel_id,
            extension=self.__channel_icon.file_extension,
        )
        return os.path.join(self.icons_dir, icon_file_name)

    def write_desktop_file(self):
        desktop_file_parser = configparser.ConfigParser()
        desktop_file_parser.optionxform = str
        desktop_file_parser.add_section("Desktop Entry")
        desktop_file_parser.set("Desktop Entry", "Version", "1.0")
        desktop_file_parser.set("Desktop Entry", "Type", "Application")
        desktop_file_parser.set("Desktop Entry", "Name", self.__channelmetadata.name)
        desktop_file_parser.set(
            "Desktop Entry", "Comment", self.__channelmetadata.tagline or ""
        )
        desktop_file_parser.set(
            "Desktop Entry", "Exec", 'gio open "kolibri:{}"'.format(self.channel_id)
        )
        desktop_file_parser.set("Desktop Entry", "X-Endless-LaunchMaximized", "True")
        desktop_file_parser.set(
            "Desktop Entry", "X-Kolibri-Channel-Id", self.channel_id
        )
        desktop_file_parser.set(
            "Desktop Entry", "X-Kolibri-Channel-Version", self.channel_version
        )
        desktop_file_parser.set("Desktop Entry", "Categories", "Education;")

        desktop_file_parser.set("Desktop Entry", "Icon", self.__icon_file_path or "")

        _ensure_dir(self.desktop_file_path)
        with open(self.desktop_file_path, "w") as desktop_entry_file:
            desktop_file_parser.write(desktop_entry_file, space_around_delimiters=False)

    def write_channel_icon(self):
        if not self.__channel_icon:
            return

        _ensure_dir(self.__icon_file_path)
        with open(self.__icon_file_path, "wb") as icon_file:
            self.__channel_icon.write(icon_file)


class ChannelLauncher_FromDisk(ChannelLauncher):
    def __init__(self, desktop_file_path, desktop_entry_data):
        self.__desktop_file_path = desktop_file_path
        self.__desktop_entry_data = desktop_entry_data

    @classmethod
    def load_all(cls):
        applications_dir = os.path.join(_get_content_share_dir_path(), "applications")
        if not os.path.isdir(applications_dir):
            return
        for file_name in os.listdir(applications_dir):
            file_path = os.path.join(applications_dir, file_name)
            desktop_file_parser = configparser.ConfigParser()
            desktop_file_parser.optionxform = str
            desktop_file_parser.read(file_path)
            if desktop_file_parser.has_section("Desktop Entry"):
                desktop_entry_data = dict(
                    desktop_file_parser.items(section="Desktop Entry")
                )
                yield cls(file_path, desktop_entry_data)

    @property
    def channel_id(self):
        return self.__desktop_entry_data.get("X-Kolibri-Channel-Id")

    @property
    def channel_version(self):
        return self.__desktop_entry_data.get("X-Kolibri-Channel-Version")

    @property
    def desktop_file_path(self):
        return self.__desktop_file_path

    @property
    def desktop_file_name(self):
        return os.path.basename(self.desktop_file_path)

    def write_channel_icon(self):
        pass

    def delete_channel_icon(self):
        icon_path = self.__desktop_entry_data.get("Icon")
        if os.path.isabs(icon_path) and _is_subdir(icon_path, self.icons_dir):
            _try_remove(icon_path)
        else:
            # Icon is referred to by name, which we do not expect here.
            pass


class ChannelIcon(object):
    def __init__(self, thumbnail_data_uri):
        match = DATA_URI_PATTERN.match(thumbnail_data_uri)
        self.__thumbnail_info = match.groupdict()

    @property
    def mimetype(self):
        return self.__thumbnail_info.get("mimetype")

    @cached_property
    def thumbnail_data(self):
        return base64.b64decode(self.__thumbnail_info.get("data_b64"))

    @cached_property
    def file_extension(self):
        return mimetypes.guess_extension(self.mimetype)

    def write(self, icon_file):
        icon_size = (256, 256)
        thumbnail_size = (256 - 16, 256 - 16)
        shadow_size = (256 - 8, 256 - 8)

        base_image = Image.new("RGBA", icon_size, (255, 255, 255, 0))

        thumbnail_io = BytesIO(self.thumbnail_data)
        thumbnail_image = Image.open(
            thumbnail_io, formats=_pil_formats_for_mimetype(self.mimetype)
        )
        thumbnail_image.thumbnail(thumbnail_size, resample=Image.BICUBIC)

        thumbnail_image = _resize_preserving_aspect_ratio(
            thumbnail_image, thumbnail_size, resample=Image.BICUBIC
        )

        _paste_center(base_image, thumbnail_image)

        base_image.save(icon_file)


def _get_content_share_dir_path():
    """
    Returns the path to the directory where XDG files, like .desktop launchers
    and AppData, are located. By default, this is $KOLIBRI_HOME/content/xdg/share.
    """
    return os.path.join(get_content_dir_path(), "xdg", "share")


def _ensure_dir(file_path):
    dir_path = os.path.dirname(file_path)
    if not os.path.isdir(dir_path):
        os.makedirs(dir_path)
    return file_path


def _try_remove(file_path):
    try:
        os.remove(file_path)
    except Exception:
        pass


def _is_subdir(subdir, basedir):
    subdir = os.path.abspath(subdir)
    basedir = os.path.abspath(basedir)
    return subdir.startswith(basedir)


def _pil_formats_for_mimetype(mimetype):
    return [fmt for fmt, fmt_mime in Image.MIME.items() if fmt_mime == mimetype]


def _paste_center(base_image, paste_image, **kwargs):
    center = [int((a - b) / 2) for a, b in zip(base_image.size, paste_image.size)]
    base_image.paste(paste_image, center, **kwargs)


def _resize_preserving_aspect_ratio(source_image, target_size, **kwargs):
    source_size_square = (max(source_image.size),) * 2
    frame_image = Image.new("RGBA", source_size_square, (255, 255, 255, 0))
    _paste_center(frame_image, source_image)
    return frame_image.resize(target_size, **kwargs)
