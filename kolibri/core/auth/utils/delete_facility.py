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
from kolibri.core.tasks.utils import get_current_job

logger = logging.getLogger(__name__)


@contextmanager
def _delete_context():
    with DisablePostDeleteSignal(), transaction.atomic():
        yield


def delete_facility(facility_id, noninteractive=True, strict=False):
    facility = get_facility(facility_id=facility_id, noninteractive=noninteractive)
    dataset_id = facility.dataset_id

    logger.info("Found facility {} <{}> for deletion".format(facility.id, dataset_id))

    if not noninteractive:
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

    job = get_current_job()

    def progress_updater(total):
        def update_progress(increment=0):
            if job:
                job.update_progress(job.progress + increment, total)

        return update_progress

    with _delete_context():
        total_groups = delete_group.group_count()
        if job:
            job.update_progress(0, total_groups)

        total_count = delete_group.count(progress_updater(total_groups))

        if job:
            job.update_progress(0, total_count)

        count, stats = delete_group.delete(progress_updater(total_count))
        dataset_cache.clear()

        clean_up_legacy_counters()

        if total_count != count:
            msg = "Deleted count does not match total ({} != {})".format(
                total_count, count
            )
            if strict:
                raise CommandError("{}, aborting!".format(msg))
            else:
                logger.warning(msg)

    logger.info("Deletion complete.")
