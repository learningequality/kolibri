import hashlib
import itertools
import json
import os
from collections import namedtuple

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode

try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError


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
    """

    def __init__(self):
        self._channels_dict = {}

    def read(self, filenames):
        if not isinstance(filenames, list):
            filenames = [filenames]

        files_read = []

        for filename in filenames:
            try:
                with open(filename, "r") as fp:
                    self.read_file(fp)
            except FileNotFoundError:
                pass
            else:
                files_read.append(filename)

        return files_read

    def read_file(self, fp):
        json_str = fp.read()
        if not json_str:
            return
        # Raises JSONDecodeError if the file is invalid
        manifest_data = json.loads(json_str)
        self.read_dict(manifest_data)

    def read_dict(self, manifest_data):
        for channel_data in manifest_data.get("channels", []):
            channel_id = channel_data.get("id", None)
            channel_version = channel_data.get("version", None)
            include_node_ids = channel_data.get("include_node_ids", [])
            if channel_id is None or channel_version is None:
                raise ContentManifestParseError("id and version are required fields")
            self._update_channel_data(channel_id, channel_version, include_node_ids)

    def write(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as fp:
            self.write_file(fp)

    def write_file(self, fp):
        json.dump(self.to_dict(), fp, indent=4)

    def to_dict(self):
        channels_list = list(self._iter_channel_dicts())
        return {
            "channels": channels_list,
            "channel_list_hash": hashlib.md5(
                json.dumps(channels_list, sort_keys=True).encode()
            ).hexdigest(),
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
                yield self.get_channel_data(channel_id, channel_version)

    def get_channel_ids(self):
        return self._channels_dict.keys()

    def get_channel_versions(self, channel_id):
        return self._channels_dict.get(channel_id, {}).keys()

    def get_channel_data(self, channel_id, channel_version):
        channel_data = self._channels_dict.get(channel_id, {}).get(
            channel_version, None
        )
        if channel_data is None:
            channel_data = ContentManifestChannelData(None, None, set())
        return channel_data

    def get_include_node_ids(self, channel_id, channel_version):
        channel_data = self.get_channel_data(channel_id, channel_version)
        return channel_data.include_node_ids

    def add_content_nodes(self, channel_id, channel_version, nodes_queries_list):
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

    def _set_channel_data(self, channel_data):
        assert isinstance(channel_data, ContentManifestChannelData)
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
                available_nodes_queue.extend(node.children.all())
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
