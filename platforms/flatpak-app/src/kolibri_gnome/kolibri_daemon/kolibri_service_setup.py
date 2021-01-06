import logging

logger = logging.getLogger(__name__)

import filecmp
import multiprocessing
import os
import shutil
import subprocess

from kolibri.utils.conf import KOLIBRI_HOME

from .content_extensions import ContentExtensionsList

from ..config import KOLIBRI_HOME_TEMPLATE_DIR
from ..globals import init_logging


KOLIBRI_BIN = "kolibri"


class KolibriServiceSetupProcess(multiprocessing.Process):
    """
    Does initial setup for Kolibri such as scanning for pre-installed content.
    Initial database migrations and provisioning will also happen here, as
    this is the first time running the Kolibri CLI inside our KOLIBRI_HOME.
    - Sets context.setup_result to True if sucessful, or to False if not.
    """

    def __init__(self, context):
        self.__context = context
        self.__cached_extensions = ContentExtensionsList.from_cache()
        self.__active_extensions = ContentExtensionsList.from_flatpak_info()
        super().__init__()

    def run(self):
        init_logging('kolibri-daemon-setup.txt')

        self.__update_from_home_template()

        self.__active_extensions.update_kolibri_environ(os.environ)

        logger.info("Updating content extensions...")

        success = all(
            operation.apply(self.__run_kolibri_command)
            for operation in self.__iter_content_operations()
        )

        if success:
            logger.info("Finished updating content extensions.")
            self.__active_extensions.write_to_cache()
            self.__context.setup_result = self.__context.SetupResult.SUCCESS
        else:
            logger.warning("Failed to update content extensions.")
            self.__context.setup_result = self.__context.SetupResult.ERROR

    def __update_from_home_template(self):
        # TODO: This code should probably be in Kolibri itself

        if not os.path.isdir(KOLIBRI_HOME_TEMPLATE_DIR):
            return

        if not os.path.isdir(KOLIBRI_HOME):
            os.makedirs(KOLIBRI_HOME, exist_ok=True)

        compare = filecmp.dircmp(
            KOLIBRI_HOME_TEMPLATE_DIR, KOLIBRI_HOME, ignore=["logs"]
        )

        if len(compare.common) > 0:
            return

        # If Kolibri home was not already initialized, copy files from the
        # template directory to the new home directory.

        logger.info("Copying KOLIBRI_HOME template to '{}'".format(KOLIBRI_HOME))

        for filename in compare.left_only:
            left_file = os.path.join(compare.left, filename)
            right_file = os.path.join(compare.right, filename)
            if os.path.isdir(left_file):
                shutil.copytree(left_file, right_file)
            else:
                shutil.copy2(left_file, right_file)

    def __run_kolibri_command(self, *args):
        result = subprocess.run([KOLIBRI_BIN, "manage", *args], check=False)
        return result.returncode == 0

    def __iter_content_operations(self):
        extension_compares_iter = ContentExtensionsList.compare(
            self.__cached_extensions, self.__active_extensions
        )
        for extension_compare in extension_compares_iter:
            for channel_compare in extension_compare.compare_channels():
                yield from _KolibriContentOperation.from_channel_compare(
                    channel_compare
                )


class _KolibriContentOperation(object):
    def apply(self, run_command_fn):
        raise NotImplementedError()

    @classmethod
    def from_channel_compare(cls, channel_compare):
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
    def __init__(self, channel_id, extension_dir):
        self.__channel_id = channel_id
        self.__extension_dir = extension_dir

    def apply(self, run_command_fn):
        args = ["--channels", self.__channel_id, "--skip-annotations"]
        return run_command_fn("scanforcontent", *args)


class _KolibriContentOperation_ImportContent(_KolibriContentOperation):
    def __init__(self, channel_id, extension_dir, include_node_ids, exclude_node_ids):
        self.__channel_id = channel_id
        self.__extension_dir = extension_dir
        self.__include_node_ids = include_node_ids
        self.__exclude_node_ids = exclude_node_ids

    def apply(self, run_command_fn):
        args = []
        if self.__include_node_ids:
            args.extend(["--node_ids", ",".join(self.__include_node_ids)])
        if self.__exclude_node_ids:
            args.extend(["--exclude_node_ids", ",".join(self.__exclude_node_ids)])
        args.extend(["disk", self.__channel_id, self.__extension_dir or KOLIBRI_HOME])
        return run_command_fn("importcontent", *args)


class _KolibriContentOperation_RescanContent(_KolibriContentOperation):
    def __init__(self, channel_id, removed=False):
        self.__channel_id = channel_id
        self.__removed = removed

    def apply(self, run_command_fn):
        args = ["--channels", self.__channel_id]
        if self.__removed:
            args.append("--channel-import-mode=none")
        return run_command_fn("scanforcontent", *args)
