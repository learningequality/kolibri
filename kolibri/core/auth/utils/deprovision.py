from morango.models import Certificate
from morango.models import DatabaseIDModel
from morango.models import DatabaseMaxCounter
from morango.models import DeletedModels
from morango.models import HardDeletedModels
from morango.models import Store

from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils.delete import DisablePostDeleteSignal
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.tasks.main import job_storage

MODELS_TO_DELETE = [
    AttemptLog,
    ContentSessionLog,
    ContentSummaryLog,
    FacilityUser,
    FacilityDataset,
    HardDeletedModels,
    Certificate,
    DatabaseIDModel,
    Store,
    DevicePermissions,
    DeletedModels,
    DeviceSettings,
    DatabaseMaxCounter,
]


def deprovision(progress_update=None):
    with DisablePostDeleteSignal():
        for Model in MODELS_TO_DELETE:
            Model.objects.all().delete()
            if progress_update:
                progress_update(1)

        # Clear all completed, failed or cancelled jobs
        job_storage.clear()


def get_deprovision_progress_total():
    return len(MODELS_TO_DELETE)
