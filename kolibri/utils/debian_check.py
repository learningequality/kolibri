import os
import sys

from builtins import input


def check_debian_user():
    # Check whether the current user is the kolibri user when running kolibri
    # that is installed from .deb package.
    # The code is mainly from https://github.com/learningequality/ka-lite/blob/master/bin/kalite#L53
    if os.name == "posix" and os.path.isfile("/etc/kolibri/username"):
        kolibri_user = open("/etc/kolibri/username", "r").read().rstrip()
        current_user = os.environ["USER"]
        if kolibri_user and kolibri_user != current_user:
            kolibri_home = os.environ.get("KOLIBRI_HOME", os.path.expanduser("~/.kolibri"))
            if not os.path.exists(kolibri_home) or not os.listdir(kolibri_home):
                sys.stderr.write((
                    "You are not running kolibri as the default user {}. "
                    "This is recommended unless you want to re-create the database "
                    "and start storing new videos/exercises etc. for a different "
                    "user account\n\n"
                ).format(kolibri_user))
                sys.stderr.write((
                    "To run the command as the default user, run this instead:\n\n"
                    "    sudo su {} -c '<command>'\n\n"
                ).format(kolibri_user))
                cont = input("Do you wish to continue? [y/N] ")
                if not cont.strip().lower() == "y":
                    sys.exit(0)
