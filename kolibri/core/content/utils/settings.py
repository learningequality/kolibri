def automatic_download_enabled():
    """
    Either the device setting is enabled, or we haven't provisioned yet. If the device isn't
    provisioned, we allow this because the default will be True after provisioning
    :return: a boolean indicating whether automatic download is enabled
    """
    from kolibri.core.device.utils import device_provisioned
    from kolibri.core.device.utils import get_device_setting

    return get_device_setting(
        "enable_automatic_download", default=not device_provisioned()
    )


def using_metered_connection():
    """
    Overridden by the app plugin
    :return: a boolean indicating whether the device is using a metered connection
    """
    return False


def allow_non_local_download():
    """
    Checks whether the device is allowed to download content over a metered connection
    when the connection is metered
    :return: A boolean indicating whether the device is allowed to download content
             over a metered connection
    """
    from kolibri.core.device.utils import get_device_setting

    return not using_metered_connection() or get_device_setting(
        "allow_download_on_metered_connection"
    )
