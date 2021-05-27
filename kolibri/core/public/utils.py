import platform

from morango.models import InstanceIDModel

import kolibri
from kolibri.core.device.utils import DeviceNotProvisioned
from kolibri.core.device.utils import get_device_setting


def get_device_info():
    """Returns metadata information about the device"""

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]
    try:
        device_name = get_device_setting("name")
        subset_of_users_device = get_device_setting("subset_of_users_device")
    # When Koliri starts at the first time, and device hasn't been created
    except DeviceNotProvisioned:
        device_name = instance_model.hostname
        subset_of_users_device = False

    info = {
        "application": "kolibri",
        "kolibri_version": kolibri.__version__,
        "instance_id": instance_model.id,
        "device_name": device_name,
        "operating_system": platform.system(),
        "subset_of_users_device": subset_of_users_device,
    }
    return info
