try:
    from kolibri.core.analytics.pskolibri.common import LINUX  # noqa: F401
    from kolibri.core.analytics.pskolibri.common import WINDOWS  # noqa: F401
    SUPPORTED_OS = True
except NotImplementedError:
    # This module can't work on this OS
    SUPPORTED_OS = False
