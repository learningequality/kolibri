"""
Avoid adding global imports, as `using_metered_connection` is overridden by the app plugin
"""


def automatic_download_enabled():
    """
    Either the device setting is enabled, or we haven't provisioned yet. If the device isn't
    provisioned, we allow this because the default will be True after provisioning
    :return: a boolean indicating whether automatic download is enabled
    """
    from kolibri.core.device.utils import get_device_setting

    return get_device_setting("enable_automatic_download")


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


def get_free_space_for_downloads(completed_size=0):
    """
    :return: The number of bytes of free space on the device, or allocated for automatic downloads
    """
    from kolibri.core.device.utils import get_device_setting
    from kolibri.utils.conf import OPTIONS

    from kolibri.utils.system import get_free_space

    free_space = get_free_space(OPTIONS["Paths"]["CONTENT_DIR"])

    # if a limit is set, subtract the total content storage size from the limit
    if get_device_setting("set_limit_for_autodownload"):
        # compute total space used by automatic and learner initiated downloads
        auto_download_limit = get_device_setting("limit_for_autodownload") or 0
        # returning smallest argument as to not exceed the space available on disk
        free_space = min(free_space, auto_download_limit - completed_size)

    return free_space
