"""Unified Kolibri Process Implementation

This module provides a unified KolibriProcess class that directly inherits from
KolibriProcessBus, consolidating initialization logic that was previously duplicated
across platform-specific implementations.

Platform-specific behavior is achieved by adding different plugins to the same
base process class, rather than having separate wrapper classes per platform.
"""

from kolibri.main import initialize
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import KolibriProcessBus

from kolibri_app.logger import logging


class KolibriProcess(KolibriProcessBus):
    """
    Unified Kolibri server process that directly inherits from KolibriProcessBus.

    This class consolidates the initialization logic previously duplicated across
    Windows and POSIX implementations, reducing code duplication and providing
    a single source of truth for Kolibri server setup.

    Platform-specific behavior is achieved by adding different plugins after
    construction, rather than through inheritance or wrapper classes.
    """

    def __init__(self, port=None, zip_port=None):
        logging.info("Initializing Kolibri...")
        initialize()

        if port is None:
            port = OPTIONS["Deployment"]["HTTP_PORT"]
        if zip_port is None:
            zip_port = OPTIONS["Deployment"]["ZIP_CONTENT_PORT"]

        super().__init__(port=port, zip_port=zip_port)

        logging.info(f"KolibriProcess initialized on port {port}")
