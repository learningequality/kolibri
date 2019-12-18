import platform

from morango.models import InstanceIDModel

import kolibri


def get_device_info():
    """Returns metadata information about the device"""

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]

    info = {
        "application": "kolibri",
        "kolibri_version": kolibri.__version__,
        "instance_id": instance_model.id,
        "device_name": instance_model.hostname,
        "operating_system": platform.system(),
    }
    return info
