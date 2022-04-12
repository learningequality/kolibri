from __future__ import annotations

import logging
import os
import subprocess
import typing
from pathlib import Path

from kolibri_app.globals import KOLIBRI_HOME_PATH

from .content_extensions import ContentChannelCompare
from .content_extensions import ContentExtensionsList

logger = logging.getLogger(__name__)

KOLIBRI_BIN = "kolibri"

# TODO: We would like to remove support for content extensions, but this feature
#       may be in use by some existing systems.


class ContentExtensionsManager(object):
    """
    Manages Kolibri content that is provided by external content extensions.
    This will keep track of when content extensions change and automatically
    import new content.
    """

    __cached_extensions: ContentExtensionsList
    __active_extensions: ContentExtensionsList

    def __init__(self):
        self.__cached_extensions = ContentExtensionsList.from_cache()
        self.__active_extensions = ContentExtensionsList.from_flatpak_info()

    def apply(self, environ: os._Environ) -> bool:
        if len(self.__cached_extensions) == 0 and len(self.__active_extensions) == 0:
            logger.debug("Extensions: nothing to do")
            return False

        logger.warning(
            "Support for content extensions will be removed in a future release"
        )

        self.__active_extensions.update_kolibri_environ(environ)

        logger.info("Updating content extensions...")

        success = all(
            operation.apply(self.__run_kolibri_command)
            for operation in self.__iter_content_operations()
        )

        if success:
            logger.info("Finished updating content extensions.")
            self.__active_extensions.write_to_cache()
        else:
            logger.warning("Failed to update content extensions.")

        return True

    def __run_kolibri_command(self, *args) -> bool:
        result = subprocess.run([KOLIBRI_BIN, "manage", *args], check=False)
        return result.returncode == 0

    def __iter_content_operations(
        self,
    ) -> typing.Generator[_KolibriContentOperation, None, None]:
        extension_compares_iter = ContentExtensionsList.compare(
            self.__cached_extensions, self.__active_extensions
        )
        for extension_compare in extension_compares_iter:
            for channel_compare in extension_compare.compare_channels():
                yield from _KolibriContentOperation.from_channel_compare(
                    channel_compare
                )


class _KolibriContentOperation(object):
    def apply(self, run_command_fn: typing.Callable) -> typing.Any:
        raise NotImplementedError()

    @classmethod
    def from_channel_compare(
        cls, channel_compare: ContentChannelCompare
    ) -> typing.Generator[_KolibriContentOperation, None, None]:
        if channel_compare.added:
            logger.info("Channel added: %s", channel_compare.channel_id)
            yield _KolibriContentOperation_ImportChannel(
                channel_id=channel_compare.channel_id,
                extension_dir=channel_compare.extension_dir,
            )
            yield _KolibriContentOperation_ImportContent(
                channel_id=channel_compare.channel_id,
                extension_dir=channel_compare.extension_dir,
                include_node_ids=channel_compare.new_include_node_ids,
                exclude_node_ids=channel_compare.new_exclude_node_ids,
            )
        elif channel_compare.removed:
            logger.info("Channel removed: %s", channel_compare.channel_id)
            yield _KolibriContentOperation_RescanContent(
                channel_id=channel_compare.channel_id, removed=True
            )
        elif channel_compare.exclude_nodes_added:
            # We need to rescan all content in the channel
            # TODO: Find a way to provide old_exclude_node_ids to
            #       Kolibri instead of scanning all content.
            logger.info(
                "Channel update (added exclude_nodes): %s", channel_compare.channel_id
            )
            yield _KolibriContentOperation_RescanContent(
                channel_id=channel_compare.channel_id
            )
        elif channel_compare.include_nodes_removed:
            # We need to rescan all content in the channel
            # TODO: Find a way to provide old_include_node_ids to
            #       Kolibri instead of scanning all content.
            logger.info(
                "Channel update (removed include_nodes): %s", channel_compare.channel_id
            )
            yield _KolibriContentOperation_RescanContent(
                channel_id=channel_compare.channel_id
            )
        else:
            # Channel content updated, no content removed
            # We can handle this case efficiently with importcontent
            logger.info("Channel update: %s", channel_compare.channel_id)
            yield _KolibriContentOperation_ImportChannel(
                channel_id=channel_compare.channel_id,
                extension_dir=channel_compare.extension_dir,
            )
            yield _KolibriContentOperation_ImportContent(
                channel_id=channel_compare.channel_id,
                extension_dir=channel_compare.extension_dir,
                include_node_ids=channel_compare.new_include_node_ids,
                exclude_node_ids=channel_compare.new_exclude_node_ids,
            )


class _KolibriContentOperation_ImportChannel(_KolibriContentOperation):
    __channel_id: str
    __extension_dir: typing.Optional[Path]

    def __init__(self, channel_id: str, extension_dir: typing.Optional[Path]):
        self.__channel_id = channel_id
        self.__extension_dir = extension_dir

    def apply(self, run_command_fn: typing.Callable) -> typing.Any:
        args = ["--channels", self.__channel_id, "--skip-annotations"]
        return run_command_fn("scanforcontent", *args)


class _KolibriContentOperation_ImportContent(_KolibriContentOperation):
    __channel_id: str
    __extension_dir: typing.Optional[Path]
    __include_node_ids: set
    __exclude_node_ids: set

    def __init__(
        self,
        channel_id: str,
        extension_dir: typing.Optional[Path],
        include_node_ids: set,
        exclude_node_ids: set,
    ):
        self.__channel_id = channel_id
        self.__extension_dir = extension_dir
        self.__include_node_ids = include_node_ids
        self.__exclude_node_ids = exclude_node_ids

    def apply(self, run_command_fn: typing.Callable) -> typing.Any:
        args = []
        if self.__include_node_ids:
            args.extend(["--node_ids", ",".join(self.__include_node_ids)])
        if self.__exclude_node_ids:
            args.extend(["--exclude_node_ids", ",".join(self.__exclude_node_ids)])
        args.extend(
            [
                "disk",
                self.__channel_id,
                str(self.__extension_dir or KOLIBRI_HOME_PATH.as_posix()),
            ]
        )
        return run_command_fn("importcontent", *args)


class _KolibriContentOperation_RescanContent(_KolibriContentOperation):
    __channel_id: str
    __removed: bool

    def __init__(self, channel_id: str, removed: bool = False):
        self.__channel_id = channel_id
        self.__removed = removed

    def apply(self, run_command_fn: typing.Callable) -> typing.Any:
        args = ["--channels", self.__channel_id]
        if self.__removed:
            args.append("--channel-import-mode=none")
        return run_command_fn("scanforcontent", *args)
