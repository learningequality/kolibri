from morango.models import DatabaseIDModel
from morango.models import HardDeletedModels

from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.models import Facility
from kolibri.core.auth.utils.delete import clean_up_legacy_counters
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal
from kolibri.core.auth.utils.delete import get_delete_group_for_facility
from kolibri.core.device.models import DeviceSettings
from kolibri.core.tasks.main import job_storage


def deprovision(progress_update=None):
    with DisablePostDeleteSignal():
        facilities = Facility.objects.all()
        for facility in facilities:
            delete_group = get_delete_group_for_facility(facility)
            delete_group.delete()
            if progress_update:
                progress_update(1)

        clean_up_legacy_counters()
        dataset_cache.clear()

        # Delete device-level models not covered by facility deletion
        HardDeletedModels.objects.all().delete()
        DatabaseIDModel.objects.all().delete()
        DeviceSettings.objects.all().delete()

        # Clear all completed, failed or cancelled jobs
        job_storage.clear()

        if progress_update:
            progress_update(1)


def get_deprovision_progress_total():
    return Facility.objects.count() + 1  # +1 for cleanup step
