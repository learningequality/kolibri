try:
    import kolibri.utils.pskolibri  # noqa: F401

    SUPPORTED_OS = True
except NotImplementedError:
    # This module can't work on this OS
    SUPPORTED_OS = False
