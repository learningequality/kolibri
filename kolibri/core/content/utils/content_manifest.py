import hashlib
import itertools
import json
import logging
import os
from collections import namedtuple

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode

try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError

try:
    from json import JSONDecodeError
except ImportError:
    JSONDecodeError = ValueError


logger = logging.getLogger(__name__)


ContentManifestChannelData = namedtuple(
    "ContentManifestChannelData", ["channel_id", "channel_version", "include_node_ids"]
)


class ContentManifestParseError(ValueError):
    pass


class ContentManifest(object):
    """
    A content manifest describes a selection of Kolibri content across
    multiple channels. It is usually stored as a JSON file along with exported
    content. It contains a list of channels, with their versions, and a list
    of node IDs associated with each channel ID + version.

    When adding content to the manifest, this implementation optimizes the list
    of node IDs to contain the smallest possible number of topic nodes, instead
    of every included node. When nodes are added to a channel ID and version
    that is already in the content manifest, those nodes will be added to the
    existing list.

    For consistency with other code, this class uses a naming convention
    similar to ConfigParser.
    """

    def __init__(self):
        self._channels_dict = {}

    def read(self, filenames, validate=False):
        """
        Read content manifest data from a file path, or a list of file paths.
        Returns the number of files which have been read successfully. Note
        that if a path does not exist, it will be silently skipped, but if
        there is an issue with a file's contents, this function will raise
        `ContentManifestParseError` as with `read_file`.
        """

        if not isinstance(filenames, list):
            filenames = [filenames]

        files_read = []

        for filename in filenames:
            try:
                with open(filename, "r") as fp:
                    self.read_file(fp, validate=validate)
            except FileNotFoundError:
                pass
            else:
                files_read.append(filename)

        return files_read

    def read_file(self, fp, validate=False):
        """
        Read content manifest data from a file-like object.
        Raises `ContentManifestParseError` if a file is invalid JSON, or has
        an incorrecct schema.
        """

        try:
            manifest_data = json.load(fp)
        except JSONDecodeError as error:
            raise ContentManifestParseError("Error decoding JSON: {}".format(error))

        self.read_dict(manifest_data, validate=validate)

    def read_dict(self, manifest_data, validate=False):
        """
        Read content manifest data from a dict object.
        Raises `ContentManifestParseError` if the dict has an incorrect schema.
        """

        if validate:
            self._validate_manifest_data(manifest_data)

        channels_list = manifest_data.get("channels", [])

        for channel_data in channels_list:
            channel_id = channel_data.get("id", None)
            channel_version = channel_data.get("version", None)
            include_node_ids = channel_data.get("include_node_ids", [])
            if channel_id is None or channel_version is None:
                raise ContentManifestParseError("id and version are required fields")
            self._update_channel_data(channel_id, channel_version, include_node_ids)

    def _validate_manifest_data(self, manifest_data):
        channels_list = manifest_data.get("channels", [])
        expected_channels_list_hash = manifest_data.get("channel_list_hash", None)
        actual_channels_list_hash = _get_channels_list_hash(channels_list)

        if expected_channels_list_hash != actual_channels_list_hash:
            raise ContentManifestParseError(
                "channel list hash '{}' is invalid (expected '{}')".format(
                    actual_channels_list_hash, expected_channels_list_hash
                )
            )

    def write(self, path):
        """
        Writes content manifest data in JSON format to a file at `path`.
        """

        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as fp:
            self.write_file(fp)

    def write_file(self, fp):
        """
        Write content manifest data in JSON format to the given file-like
        object.
        """

        json.dump(self.to_dict(), fp, indent=4)

    def to_dict(self):
        channels_list = list(self._iter_channel_dicts())
        return {
            "channels": channels_list,
            "channel_list_hash": _get_channels_list_hash(channels_list),
        }

    def _iter_channel_dicts(self):
        for channel_data in self._iter_channel_data():
            yield {
                "id": channel_data.channel_id,
                "version": channel_data.channel_version,
                "include_node_ids": sorted(channel_data.include_node_ids),
            }

    def _iter_channel_data(self):
        for channel_id in self.get_channel_ids():
            for channel_version in self.get_channel_versions(channel_id):
                yield self._get_channel_data(channel_id, channel_version)

    def get_channel_ids(self):
        """
        Returns the list of channel IDs in the content manifest.
        """

        return self._channels_dict.keys()

    def get_channel_versions(self, channel_id):
        """
        Returns the list of versions for a particular channel in the content
        manifest.
        """

        return self._channels_dict.get(channel_id, {}).keys()

    def get_include_node_ids(self, channel_id, channel_version):
        """
        Returns a list of node IDs for the provided channel ID and version.
        """

        channel_data = self._get_channel_data(channel_id, channel_version)
        return channel_data.include_node_ids

    def get_node_ids_for_channel(self, channel_id):
        node_ids = set()

        channel_metadata = ChannelMetadata.objects.get(id=channel_id)

        for channel_version in self.get_channel_versions(channel_id):
            if channel_version != channel_metadata.version:
                logger.warning(
                    "Manifest entry for {channel_id} has a different version ({manifest_version}) than the installed channel ({local_version})".format(
                        channel_id=channel_id,
                        manifest_version=channel_version,
                        local_version=channel_metadata.version,
                    )
                )
            node_ids.update(self.get_include_node_ids(channel_id, channel_version))

        return node_ids

    def add_content_nodes(self, channel_id, channel_version, nodes_queries_list):
        """
        Update the content manifest to include a new set of nodes for the
        provided channel ID and version. The `nodes_queries_list` is a list
        of database queries as produced by `get_import_export_nodes`. This
        function will optimize the exhaustive list of content nodes to include
        the smallest possible set of parent nodes.
        """

        include_node_ids = get_content_nodes_selectors(
            channel_id, channel_version, nodes_queries_list
        )
        self._update_channel_data(channel_id, channel_version, include_node_ids)

    def _update_channel_data(self, channel_id, channel_version, include_node_ids):
        old_include_node_ids = self.get_include_node_ids(channel_id, channel_version)
        channel_data = ContentManifestChannelData(
            channel_id,
            channel_version,
            set(old_include_node_ids) | set(include_node_ids),
        )
        self._set_channel_data(channel_data)

    def _get_channel_data(self, channel_id, channel_version):
        channel_data = self._channels_dict.get(channel_id, {}).get(
            channel_version, None
        )
        if channel_data is None:
            channel_data = ContentManifestChannelData(None, None, set())
        return channel_data

    def _set_channel_data(self, channel_data):
        if not isinstance(channel_data, ContentManifestChannelData):
            raise TypeError("channel_data must be a ContentManifestChannelData")
        self._channels_dict.setdefault(channel_data.channel_id, {})[
            channel_data.channel_version
        ] = channel_data


def get_content_nodes_selectors(channel_id, channel_version, nodes_queries_list):
    """
    Returns a set of include_node_ids that can be used with the given
    channel_id to import only the nodes contained in nodes_queries_list.
    """

    include_node_ids = set()

    channel_metadata = ChannelMetadata.objects.get(
        id=channel_id, version=channel_version
    )

    available_node_ids = set(
        itertools.chain.from_iterable(
            nodes_query.values_list("id", flat=True)
            for nodes_query in nodes_queries_list
        )
    )

    available_nodes_queue = [channel_metadata.root]

    while len(available_nodes_queue) > 0:
        node = available_nodes_queue.pop(0)

        # We could add nodes to exclude_node_ids when less than half of the
        # sibling nodes are missing. However, it is unclear if this would
        # be useful.

        if node.kind == "topic":
            leaf_node_ids = _get_leaf_node_ids(node)
            matching_leaf_nodes = leaf_node_ids.intersection(available_node_ids)
            missing_leaf_nodes = leaf_node_ids.difference(available_node_ids)
            if len(missing_leaf_nodes) == 0:
                include_node_ids.add(node.id)
            elif len(matching_leaf_nodes) > 0:
                available_nodes_queue.extend(node.children.filter(available=True))
        elif node.id in available_node_ids:
            include_node_ids.add(node.id)

    return include_node_ids


def _get_leaf_node_ids(node):
    return set(
        ContentNode.objects.filter(
            lft__gte=node.lft, lft__lte=node.rght, channel_id=node.channel_id
        )
        .exclude(kind="topic")
        .values_list("id", flat=True)
    )


def _get_channels_list_hash(channels_list):
    return hashlib.md5(json.dumps(channels_list, sort_keys=True).encode()).hexdigest()
