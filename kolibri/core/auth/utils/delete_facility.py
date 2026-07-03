import logging

from django.db import transaction

from kolibri.core.auth.errors import FacilityDeletionCountMismatch
from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.utils.delete import clean_up_legacy_counters
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal
from kolibri.core.auth.utils.delete import get_delete_group_for_facility
from kolibri.core.tasks.utils import JobProgressMixin

logger = logging.getLogger(__name__)


class FacilityDeleteManager(JobProgressMixin):
    def __init__(self, facility, strict=False):
        self.facility = facility
        self.strict = strict
        super().__init__()

    def run(self):
        dataset_id = self.facility.dataset_id
        delete_group = get_delete_group_for_facility(self.facility)

        logger.info(
            "Proceeding with facility deletion. Deleting all data for facility <%s>",
            dataset_id,
        )

        with DisablePostDeleteSignal(), transaction.atomic():
            # run the counting step
            with self.start_progress(total=delete_group.group_count()) as update:
                update(increment=0, message="Counting database objects")
                total_count = delete_group.count(update)

            # now the deleting step
            with self.start_progress(total=total_count) as update:
                update(increment=0, message="Deleting database objects")
                count, _stats = delete_group.delete(update)
                # clear related cache
                dataset_cache.clear()

            clean_up_legacy_counters()

            # if count doesn't match, something doesn't seem right
            if total_count != count:
                msg = f"Deleted count does not match total ({total_count} != {count})"
                if self.strict:
                    raise FacilityDeletionCountMismatch(f"{msg}, aborting!")
                logger.warning(msg)

        logger.info("Deletion complete.")
