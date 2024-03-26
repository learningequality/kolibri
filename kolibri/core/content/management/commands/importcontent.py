import argparse

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from ...utils import paths
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.utils.resource_import import DiskChannelResourceImportManager
from kolibri.core.content.utils.resource_import import DiskChannelUpdateManager
from kolibri.core.content.utils.resource_import import (
    RemoteChannelResourceImportManager,
)
from kolibri.core.content.utils.resource_import import RemoteChannelUpdateManager
from kolibri.utils import conf
from kolibri.utils import file_transfer as transfer

# constants to specify the transfer method to be used
DOWNLOAD_METHOD = "download"
COPY_METHOD = "copy"


class Command(BaseCommand):
    def add_arguments(self, parser):
        # let's save the parser in case we need to print a help statement
        self._parser = parser

        # we want two groups of arguments. One group is when the
        # 'importcontent disk' command is given, where we'll expect a file
        # directory to be given. Another is the 'importcontent network'
        # command to be given, where we'll expect a channel.

        # However, some optional arguments apply to both groups. Add them here!

        manifest_help_text = """
        Specify a path to a manifest file. Content specified in this manifest file will be imported.

        e.g.

        kolibri manage importcontent --manifest /path/to/KOLIBRI_DATA/content/manifest.json disk
        """
        parser.add_argument(
            "--manifest",
            type=argparse.FileType("r"),
            default=None,
            required=False,
            dest="manifest",
            help=manifest_help_text,
        )

        node_ids_help_text = """
        Specify one or more node IDs to import. Only the files associated to those node IDs will be imported.

        e.g.

        kolibri manage importcontent --node_ids <id1>,<id2>, [<ids>,...] {network, disk} <channel id>
        """
        parser.add_argument(
            "--node_ids",
            "-n",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(",") if x else [],
            default=None,
            required=False,
            dest="node_ids",
            help=node_ids_help_text,
        )

        exclude_node_ids_help_text = """
        Specify one or more node IDs to exclude. Files associated to those node IDs will be not be imported.

        e.g.

        kolibri manage importcontent --exclude_node_ids <id1>,<id2>, [<ids>,...] {network, disk} <channel id>
        """
        parser.add_argument(
            "--exclude_node_ids",
            # Split the comma separated string we get, into a list of strings
            type=lambda x: x.split(",") if x else [],
            default=None,
            required=False,
            dest="exclude_node_ids",
            help=exclude_node_ids_help_text,
        )

        parser.add_argument(
            "--include-unrenderable-content",
            action="store_false",
            default=True,
            dest="renderable_only",
            help="Import all content, not just that which this Kolibri instance can render",
        )

        parser.add_argument(
            "--all-thumbnails",
            action="store_true",
            default=False,
            dest="all_thumbnails",
            help="Import thumbnails for all content nodes regardless of included or excluded node IDs",
        )

        parser.add_argument(
            "--import_updates",
            action="store_true",
            default=False,
            dest="import_updates",
            help="Import all updated content after a channel version upgrade",
        )

        parser.add_argument(
            "--fail-on-error",
            action="store_true",
            default=False,
            dest="fail_on_error",
            help="Raise an error when a file has failed to be imported",
        )

        # to implement these two groups of commands and their corresponding
        # arguments, we'll need argparse.subparsers.
        subparsers = parser.add_subparsers(
            dest="command", help="The following subcommands are available."
        )

        # the network command has a channel id required positional argument,
        # and some optional content_id arguments.

        # Note: cmd should be the management command instance, as though the
        # interface for adding arguments is argparse, Django overrides the
        # parser object with its own thing, hence why we need to add cmd. See
        # http://stackoverflow.com/questions/36706220/is-it-possible-to-create-subparsers-in-a-django-management-command
        network_subparser = subparsers.add_parser(
            "network",
            help="Download the given channel through the network.",
        )
        network_subparser.add_argument("channel_id", type=str)

        default_studio_url = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        network_subparser.add_argument(
            "--baseurl", type=str, default=default_studio_url, dest="baseurl"
        )

        network_subparser.add_argument(
            "--peer_id", type=str, default="", dest="peer_id"
        )

        network_subparser.add_argument(
            "--timeout",
            type=int,
            default=transfer.Transfer.DEFAULT_TIMEOUT,
            dest="timeout",
            help="Specify network timeout in seconds (default: %(default)d)",
        )
        network_subparser.add_argument(
            "--content_dir",
            type=str,
            default=paths.get_content_dir_path(),
            help="Download the content to the given content dir.",
        )

        disk_subparser = subparsers.add_parser(
            "disk", help="Copy the content from the given folder."
        )
        disk_subparser.add_argument("channel_id", type=str)
        disk_subparser.add_argument("directory", type=str, nargs="?")
        disk_subparser.add_argument("--drive_id", type=str, dest="drive_id", default="")
        disk_subparser.add_argument(
            "--content_dir",
            type=str,
            default=paths.get_content_dir_path(),
            help="Copy the content to the given content dir.",
        )
        disk_subparser.add_argument(
            "--no_detect_manifest",
            dest="detect_manifest",
            action="store_false",
            default=True,
        )

    def download_content(
        self,
        channel_id,
        manifest_file=None,
        node_ids=None,
        exclude_node_ids=None,
        baseurl=None,
        peer_id=None,
        renderable_only=True,
        all_thumbnails=False,
        import_updates=False,
        fail_on_error=False,
        timeout=transfer.Transfer.DEFAULT_TIMEOUT,
        content_dir=None,
    ):
        manager_class = (
            RemoteChannelUpdateManager
            if import_updates
            else RemoteChannelResourceImportManager
        )
        if (
            not import_updates
            and not node_ids
            and not exclude_node_ids
            and manifest_file
        ):
            return manager_class.from_manifest(
                channel_id,
                manifest_file,
                baseurl=baseurl,
                peer_id=peer_id,
                renderable_only=renderable_only,
                all_thumbnails=all_thumbnails,
                fail_on_error=fail_on_error,
                timeout=timeout,
                content_dir=content_dir,
            )
        return manager_class(
            channel_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            baseurl=baseurl,
            peer_id=peer_id,
            renderable_only=renderable_only,
            all_thumbnails=all_thumbnails,
            fail_on_error=fail_on_error,
            timeout=timeout,
            content_dir=content_dir,
        )

    def copy_content(
        self,
        channel_id,
        path,
        manifest_file=None,
        drive_id=None,
        detect_manifest=True,
        node_ids=None,
        exclude_node_ids=None,
        renderable_only=True,
        all_thumbnails=False,
        import_updates=False,
        fail_on_error=False,
        content_dir=None,
    ):
        manager_class = (
            DiskChannelUpdateManager
            if import_updates
            else DiskChannelResourceImportManager
        )
        if not import_updates and node_ids is None and exclude_node_ids is None:
            if manifest_file:
                return manager_class.from_manifest(
                    channel_id,
                    manifest_file=manifest_file,
                    path=path,
                    drive_id=drive_id,
                    renderable_only=renderable_only,
                    all_thumbnails=all_thumbnails,
                    fail_on_error=fail_on_error,
                    content_dir=content_dir,
                )
            elif detect_manifest:
                return manager_class.from_manifest(
                    channel_id,
                    path=path,
                    drive_id=drive_id,
                    renderable_only=renderable_only,
                    all_thumbnails=all_thumbnails,
                    fail_on_error=fail_on_error,
                    content_dir=content_dir,
                )
        return manager_class(
            channel_id,
            path=path,
            drive_id=drive_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            renderable_only=renderable_only,
            all_thumbnails=all_thumbnails,
            fail_on_error=fail_on_error,
            content_dir=content_dir,
        )

    def handle(self, *args, **options):
        if options["manifest"] and (
            options["node_ids"] is not None or options["exclude_node_ids"] is not None
        ):
            raise CommandError(
                "The --manifest option must not be combined with --node_ids or --exclude_node_ids."
            )

        try:
            ChannelMetadata.objects.get(id=options["channel_id"])
        except ValueError:
            raise CommandError(
                "{} is not a valid channel_id".format(options["channel_id"])
            )
        except ChannelMetadata.DoesNotExist:
            raise CommandError(
                "Must import a channel with importchannel before importing content."
            )

        if options["command"] == "network":
            manager = self.download_content(
                options["channel_id"],
                manifest_file=options["manifest"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                baseurl=options["baseurl"],
                peer_id=options["peer_id"],
                renderable_only=options["renderable_only"],
                all_thumbnails=options["all_thumbnails"],
                import_updates=options["import_updates"],
                fail_on_error=options["fail_on_error"],
                timeout=options["timeout"],
                content_dir=options["content_dir"],
            )
        elif options["command"] == "disk":
            if not options["directory"] and not options["manifest"]:
                raise CommandError(
                    "Either a directory or a manifest file must be provided."
                )

            manager = self.copy_content(
                options["channel_id"],
                options["directory"],
                manifest_file=options["manifest"],
                detect_manifest=options["detect_manifest"],
                drive_id=options["drive_id"],
                node_ids=options["node_ids"],
                exclude_node_ids=options["exclude_node_ids"],
                renderable_only=options["renderable_only"],
                all_thumbnails=options["all_thumbnails"],
                import_updates=options["import_updates"],
                fail_on_error=options["fail_on_error"],
                content_dir=options["content_dir"],
            )
        else:
            self._parser.print_help()
            raise CommandError(
                "Please give a valid subcommand. You gave: {}".format(
                    options["command"]
                )
            )
        try:
            manager.run()
        except Exception as e:
            raise CommandError(e)
