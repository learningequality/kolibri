import os

import android_utils


def start_kolibri_server():
    from kolibri.utils.cli import main
    # activate app mode
    from kolibri.plugins.utils import enable_plugin
    enable_plugin('kolibri.plugins.app')

    # register app capabilities
    from kolibri.plugins.app.utils import interface
    interface.register(share_file=android_utils.share_by_intent)

    print("Starting Kolibri server...")
    print("Port: {}".format(os.environ.get("KOLIBRI_HTTP_PORT", "(default)")))
    print("Home folder: {}".format(os.environ.get("KOLIBRI_HOME", "(default)")))
    print("Timezone: {}".format(os.environ.get("TZ", "(default)")))
    main(["start", "--foreground"])
