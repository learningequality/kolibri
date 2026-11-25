import os
import sys

from kolibri.utils.conf import KOLIBRI_HOME


def server_command_and_environment():
    if getattr(sys, "frozen", False):
        cmd = [sys.executable, "--run-as-server"]
    else:
        cmd = [sys.executable, "-m", "kolibri_app", "--run-as-server"]

    env = os.environ.copy()
    env["KOLIBRI_HOME"] = os.environ.get("KOLIBRI_HOME", KOLIBRI_HOME)
    env["KOLIBRI_RESTART_HOOKS"] = "kolibri.utils.server.signal_stop"

    return cmd, env
