import logging
from contextlib import contextmanager

from django.core.management.base import CommandError
from django.db import transaction

from kolibri.core.auth.management.utils import confirm_or_exit
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.utils.delete import clean_up_legacy_counters
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal
from kolibri.core.auth.utils.delete import get_delete_group_for_facility
from kolibri.core.tasks.management.commands.base import AsyncCommand


logger = logging.getLogger(__name__)


class Command(AsyncCommand):
    help = "This command initiates the deletion process for a facility and all of its related data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--facility",
            action="store",
            type=str,
            help="The ID of the facility to delete",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Enforce that deletion count matches expected count",
        )
        parser.add_argument("--noninteractive", action="store_true")

    def handle_async(self, *args, **options):
        noninteractive = options["noninteractive"]
        strict = options["strict"]
        facility = get_facility(
            facility_id=options["facility"], noninteractive=noninteractive
        )
        dataset_id = facility.dataset_id

        logger.info(
            "Found facility {} <{}> for deletion".format(facility.id, dataset_id)
        )

        if not noninteractive:
            # ensure the user REALLY wants to do this!
            confirm_or_exit(
                "Are you sure you wish to permanently delete this facility? This will DELETE ALL DATA FOR THE FACILITY."
            )
            confirm_or_exit(
                "ARE YOU SURE? If you do this, there is no way to recover the facility data on this device."
            )

        delete_group = get_delete_group_for_facility(facility)

        logger.info(
            "Proceeding with facility deletion. Deleting all data for facility <{}>".format(
                dataset_id
            )
        )

        with self._delete_context():
            total_deleted = 0

            # run the counting step
            with self.start_progress(
                total=delete_group.group_count()
            ) as update_progress:
                update_progress(increment=0, message="Counting database objects")
                total_count = delete_group.count(update_progress)

            # no the deleting step
            with self.start_progress(total=total_count) as update_progress:
                update_progress(increment=0, message="Deleting database objects")
                count, stats = delete_group.delete(update_progress)
                total_deleted += count
                # clear related cache
                dataset_cache.clear()

            clean_up_legacy_counters()

            # if count doesn't match, something doesn't seem right
            if total_count != total_deleted:
                msg = "Deleted count does not match total ({} != {})".format(
                    total_count, total_deleted
                )
                if strict:
                    raise CommandError("{}, aborting!".format(msg))
                else:
                    logger.warning(msg)

        logger.info("Deletion complete.")

    @contextmanager
    def _delete_context(self):
        with DisablePostDeleteSignal(), transaction.atomic():
            yield
