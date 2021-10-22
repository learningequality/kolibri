from __future__ import annotations

import itertools
import json
import re
from configparser import ConfigParser
from pathlib import Path

from kolibri_app.globals import KOLIBRI_HOME_PATH

CONTENT_EXTENSIONS_DIR = "/app/share/kolibri-content"
CONTENT_EXTENSION_RE = r"^org.learningequality.Kolibri.Content.(?P<name>\w+)$"


class ContentExtensionsList(object):
    """
    Keeps track of a list of content extensions, either cached from a file in
    KOLIBRI_HOME, or generated from /.flatpak-info. It is possible to compare
    instances of ContentExtensionsList to detect changes. At the moment, this
    expects to be running as a Flatpak. Otherwise, the from_flatpak_info
    function will always return an empty ContentExtensionsList.
    """

    CONTENT_EXTENSIONS_STATE_PATH = KOLIBRI_HOME_PATH.joinpath(
        "content-extensions.json"
    )

    __extensions: set[ContentExtension] = None

    def __init__(self, extensions: set[ContentExtension] = set()):
        self.__extensions = set(extensions)

    @classmethod
    def from_flatpak_info(cls) -> ContentExtensionsList:
        extensions = set()

        flatpak_info = ConfigParser()
        flatpak_info.read("/.flatpak-info")
        app_extensions = flatpak_info.get(
            "Instance", "app-extensions", fallback=""
        ).split(";")
        if len(app_extensions) == 1 and app_extensions[0] == "":
            app_extensions = []
        for extension_str in app_extensions:
            content_extension = cls.content_extension_from_str(extension_str)
            if content_extension and content_extension.is_valid():
                extensions.add(content_extension)

        return cls(extensions)

    @classmethod
    def from_cache(cls) -> ContentExtensionsList:
        extensions = set()

        try:
            with cls.CONTENT_EXTENSIONS_STATE_PATH.open("r") as file:
                extensions_json = json.load(file)
        except (OSError, json.JSONDecodeError):
            pass
        else:
            extensions = set(map(ContentExtension.from_json, extensions_json))

        return cls(extensions)

    @staticmethod
    def content_extension_from_str(extension_str: str) -> ContentExtension:
        extension_str_split = extension_str.split("=", 1)
        if len(extension_str_split) == 2:
            extension_ref, extension_commit = extension_str_split
            return ContentExtension.from_ref(extension_ref, extension_commit)
        else:
            return None

    def write_to_cache(self):
        with self.CONTENT_EXTENSIONS_STATE_PATH.open("w") as file:
            extensions_json = list(map(ContentExtension.to_json, self.__extensions))
            json.dump(extensions_json, file)

    def update_kolibri_environ(self, environ: os._Environ) -> os._Environ:
        environ["KOLIBRI_CONTENT_FALLBACK_DIRS"] = ";".join(
            extension.content_dir.as_posix() for extension in self
        )
        return environ

    def get_extension(self, ref: str) -> ContentExtension:
        return next(
            (extension for extension in self.__extensions if extension.ref == ref), None
        )

    def __iter__(self) -> iter:
        return iter(self.__extensions)

    @staticmethod
    def compare(
        old: ContentExtensionsList, new: ContentExtensionsList
    ) -> typing.Generator[ContentExtensionCompare]:
        changed_extensions = old.__extensions.symmetric_difference(new.__extensions)
        changed_refs = set(extension.ref for extension in changed_extensions)
        for ref in changed_refs:
            old_extension = old.get_extension(ref)
            new_extension = new.get_extension(ref)
            yield ContentExtensionCompare(ref, old_extension, new_extension)


class ContentExtension(object):
    """
    Represents a content extension, with details about the flatpak ref and
    support for an index of content which may be either cached or located in the
    content extension itself. We assume any ContentExtension instances with
    matching ref and commit must be the same.
    """

    __ref: str = None
    __name: str = None
    __commit: str = None
    __content_json: dict = None

    def __init__(self, ref: str, name: str, commit: str, content_json: dict = None):
        self.__ref = ref
        self.__name = name
        self.__commit = commit
        self.__content_json = content_json

    @classmethod
    def from_ref(cls, ref: str, commit: str) -> ContentExtension:
        match = re.match(CONTENT_EXTENSION_RE, ref)
        if match:
            name = match.group("name")
            return cls(ref, name, commit, content_json=None)
        else:
            return None

    @classmethod
    def from_json(cls, json_obj: dict) -> ContentExtension:
        return cls(
            json_obj.get("ref"),
            json_obj.get("name"),
            json_obj.get("commit"),
            content_json=json_obj.get("content"),
        )

    def to_json(self) -> dict:
        return {
            "ref": self.ref,
            "name": self.name,
            "commit": self.commit,
            "content": self.content_json,
        }

    def __eq__(self, other: ContentExtension) -> bool:
        return hash(self) == hash(other)

    def __hash__(self) -> int:
        return hash((self.__ref, self.__name, self.__commit))

    @property
    def ref(self) -> str:
        return self.__ref

    @property
    def name(self) -> str:
        return self.__name

    @property
    def commit(self) -> str:
        return self.__commit

    def is_valid(self) -> bool:
        return all([self.content_dir.is_dir(), self.__content_json_path.is_file()])

    @property
    def content_json(self) -> dict:
        if self.__content_json is not None:
            return self.__content_json

        try:
            with self.__content_json_path.open("r") as file:
                self.__content_json = json.load(file)
        except (OSError, json.JSONDecodeError):
            self.__content_json = {}

        return self.__content_json

    @property
    def __channels(self) -> set:
        channels_json = self.content_json.get("channels", [])
        return set(map(ContentChannel.from_json, channels_json))

    @property
    def channel_ids(self) -> set:
        return set(channel.channel_id for channel in self.__channels)

    def get_channel(self, channel_id: str) -> ContentChannel:
        return next(
            (
                channel
                for channel in self.__channels
                if channel.channel_id == channel_id
            ),
            None,
        )

    @property
    def base_dir(self) -> Path:
        return Path(CONTENT_EXTENSIONS_DIR, self.name)

    @property
    def content_dir(self) -> Path:
        return Path(self.base_dir, "content")

    @property
    def __content_json_path(self) -> Path:
        return Path(self.content_dir, "content.json")


class ContentChannel(object):
    __channel_id: str = None
    __include_node_ids: list = None
    __exclude_node_ids: list = None

    def __init__(self, channel_id: str, include_node_ids: list, exclude_node_ids: list):
        self.__channel_id = channel_id
        self.__include_node_ids = include_node_ids or []
        self.__exclude_node_ids = exclude_node_ids or []

    @classmethod
    def from_json(cls, json_obj: dict) -> ContentChannel:
        return cls(
            json_obj.get("channel_id"),
            json_obj.get("node_ids"),
            json_obj.get("exclude_node_ids"),
        )

    @property
    def channel_id(self) -> str:
        return self.__channel_id

    @property
    def include_node_ids(self) -> list:
        return set(self.__include_node_ids)

    @property
    def exclude_node_ids(self) -> list:
        return set(self.__exclude_node_ids)


class ContentExtensionCompare(object):
    __ref: str = None
    __old_extension: ContentExtension = None
    __new_extension: ContentExtension = None

    def __init__(
        self, ref: str, old_extension: ContentExtension, new_extension: ContentExtension
    ):
        self.__ref = ref
        self.__old_extension = old_extension
        self.__new_extension = new_extension

    @property
    def ref(self) -> str:
        return self.__ref

    def compare_channels(self) -> typing.Generator[ContentChanelCompare]:
        for channel_id in self.__all_channel_ids:
            old_channel = self.__old_channel(channel_id)
            new_channel = self.__new_channel(channel_id)
            yield ContentChannelCompare(
                channel_id, self.__extension_dir, old_channel, new_channel
            )

    def __old_channel(self, channel_id: str) -> ContentChannel:
        if self.__old_extension:
            return self.__old_extension.get_channel(channel_id)
        else:
            return None

    def __new_channel(self, channel_id: str) -> ContentChannel:
        if self.__new_extension:
            return self.__new_extension.get_channel(channel_id)
        else:
            return None

    @property
    def __extension_dir(self) -> Path:
        if self.__new_extension:
            return self.__new_extension.base_dir
        else:
            return None

    @property
    def __all_channel_ids(self) -> set:
        return set(itertools.chain(self.__old_channel_ids, self.__new_channel_ids))

    @property
    def __old_channel_ids(self) -> set:
        if self.__old_extension:
            return self.__old_extension.channel_ids
        else:
            return set()

    @property
    def __new_channel_ids(self) -> set:
        if self.__new_extension:
            return self.__new_extension.channel_ids
        else:
            return set()


class ContentChannelCompare(object):
    __channel_id: str = None
    __extension_dir: Path = None
    __old_channel: ContentChannel = None
    __new_channel: ContentChannel = None

    def __init__(
        self,
        channel_id: str,
        extension_dir: Path,
        old_channel: ContentChannel,
        new_channel: ContentChannel,
    ):
        self.__channel_id = channel_id
        self.__extension_dir = extension_dir
        self.__old_channel = old_channel
        self.__new_channel = new_channel

    @property
    def channel_id(self) -> str:
        return self.__channel_id

    @property
    def added(self) -> bool:
        return self.__new_channel and not self.__old_channel

    @property
    def removed(self) -> bool:
        return self.__old_channel and not self.__new_channel

    @property
    def extension_dir(self) -> Path:
        return self.__extension_dir

    @property
    def old_include_node_ids(self) -> set:
        return self.__old_channel.include_node_ids

    @property
    def new_include_node_ids(self) -> set:
        return self.__new_channel.include_node_ids

    @property
    def include_nodes_added(self) -> set:
        return self.new_include_node_ids.difference(self.old_include_node_ids)

    @property
    def include_nodes_removed(self) -> set:
        return self.old_include_node_ids.difference(self.new_include_node_ids)

    @property
    def old_exclude_node_ids(self) -> set:
        return self.__old_channel.exclude_node_ids

    @property
    def new_exclude_node_ids(self) -> set:
        return self.__new_channel.exclude_node_ids

    @property
    def exclude_nodes_added(self) -> set:
        return self.new_exclude_node_ids.difference(self.old_exclude_node_ids)

    @property
    def exclude_nodes_removed(self) -> set:
        return self.old_exclude_node_ids.difference(self.new_exclude_node_ids)
