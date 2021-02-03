import json
import logging
import os
from collections import Mapping

from config import KOLIBRI_PORT


def start_kolibri_server():
    from kolibri.utils.cli import initialize, setup_logging, start
    from kolibri.plugins.registry import registered_plugins

    registered_plugins.register_plugins(['kolibri.plugins.app'])

    logging.info("Starting server...")
    setup_logging(debug=False)
    initialize()
    automatic_provisiondevice()
    start.callback(KOLIBRI_PORT, background=False)


def get_initialize_url(next_url=None):
    from kolibri.utils.cli import initialize
    from kolibri.plugins.registry import registered_plugins

    # The start_kolibri_server function is typically run in a different thread or process
    # than the app, so for get_initialize_url to work, we need to initialize Kolibri
    # in the app process as well.
    registered_plugins.register_plugins(['kolibri.plugins.app'])
    initialize()

    from kolibri.plugins.app.utils import interface

    return interface.get_initialize_url(next_url)


def get_content_file_path(filename):
    from kolibri.core.content.utils.paths import get_content_storage_file_path
    return get_content_storage_file_path(filename)


def automatic_provisiondevice():
    from kolibri.core.device.utils import device_provisioned
    from kolibri.dist.django.core.management import call_command
    from kolibri.utils.conf import KOLIBRI_HOME

    AUTOMATIC_PROVISION_FILE = os.path.join(
        KOLIBRI_HOME, "automatic_provision.json"
    )

    if not os.path.exists(AUTOMATIC_PROVISION_FILE):
        return
    elif device_provisioned():
        return

    try:
        with open(AUTOMATIC_PROVISION_FILE, "r") as f:
            logging.info("Running provisiondevice from 'automatic_provision.json'")
            options = json.load(f)
    except ValueError as e:
        logging.error(
            "Attempted to load 'automatic_provision.json' but failed to parse JSON:\n{}".format(
                e
            )
        )
    except FileNotFoundError:
        options = None

    if isinstance(options, Mapping):
        options.setdefault("superusername", None)
        options.setdefault("superuserpassword", None)
        options.setdefault("preset", "nonformal")
        options.setdefault("language_id", None)
        options.setdefault("facility_settings", {})
        options.setdefault("device_settings", {})
        call_command("provisiondevice", interactive=False, **options)
