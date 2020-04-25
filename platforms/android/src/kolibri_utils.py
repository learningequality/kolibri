import os
import pew.ui
import sys


def start_kolibri_server():
    from kolibri.utils.cli import main
    print("Starting Kolibri server...")
    print("Port: {}".format(os.environ.get("KOLIBRI_HTTP_PORT", "(default)")))
    print("Home folder: {}".format(os.environ.get("KOLIBRI_HOME", "(default)")))
    print("Timezone: {}".format(os.environ.get("TZ", "(default)")))
    main(["start", "--foreground"])


def get_content_file_path(filename):
    from kolibri.core.content.utils.paths import get_content_storage_file_path
    return get_content_storage_file_path(filename)