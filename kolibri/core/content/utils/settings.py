from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import get_device_setting


def automatic_download_enabled():
    """
    Either the device setting is enabled, or we haven't provisioned yet. If the device isn't
    provisioned, we allow this because the default will be True after provisioning
    :return:
    """
    return get_device_setting(
        "enable_automatic_download", default=not device_provisioned()
    )
