import platform

from django.core.exceptions import ObjectDoesNotExist
from morango.models import InstanceIDModel

import kolibri


def get_device_info():
    """Returns metadata information about the device"""

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]
    try:
        device_name = kolibri.core.device.models.DeviceSettings.objects.get().name
    # When Koliri starts at the first time, and device hasn't been created
    except ObjectDoesNotExist:
        device_name = instance_model.hostname

    info = {
        "application": "kolibri",
        "kolibri_version": kolibri.__version__,
        "instance_id": instance_model.id,
        "device_name": device_name,
        "operating_system": platform.system(),
    }
    return info
