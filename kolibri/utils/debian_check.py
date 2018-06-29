import os
import sys

from builtins import input


def check_debian_user():
    # Check whether the current user is the kolibri user when running kolibri
    # that is installed from .deb package.
    # The code is mainly from https://github.com/learningequality/ka-lite/blob/master/bin/kalite#L53
    if os.name == "posix" and os.path.isfile("/etc/kolibri/username"):
        with open("/etc/kolibri/username", "r") as f:
            kolibri_user = f.read().rstrip()
        current_user = os.environ["USER"]
        if kolibri_user and kolibri_user != current_user:
            kolibri_home = os.environ.get(
                "KOLIBRI_HOME", os.path.expanduser("~/.kolibri"))
            if not os.path.exists(kolibri_home) or not os.listdir(kolibri_home):
                sys.stderr.write((
                    "You are running this command as the user '{current_user}', "
                    "but Kolibri was originally installed to run as the user '{kolibri_user}'.\n"
                    "This may result in unexpected behavior, "
                    "because the two users will each use their own local databases and content.\n\n"
                ).format(current_user=current_user, kolibri_user=kolibri_user))
                sys.stderr.write((
                    "If you'd like to run the command as '{}', you can try:\n\n"
                    "    sudo su {} -c '<command>'\n\n"
                ).format(kolibri_user, kolibri_user))
                cont = input(
                    "Alternatively, would you like to continue and "
                    "run the command as '{}'? [y/N] ".format(current_user))
                if not cont.strip().lower() == "y":
                    sys.exit(0)
