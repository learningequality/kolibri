import argparse
import subprocess
import sys
from pathlib import Path

from dmgbuild import build_dmg

SETTINGS_FILE = Path(__file__).with_name("dmgbuild_settings.py")


# Event shapes are dmgbuild 1.6.7's build_dmg; recheck on upgrade.
# Spotlight indexing the mounted volume is the suspected holder that makes
# hdiutil refuse dmgbuild's detach (#15173).
def detach_guard_callback():
    mount_point = None

    def callback(info):
        nonlocal mount_point
        if info["type"] != "command::finished":
            return
        if info["command"] == "hdiutil::attach" and not info["ret"]:
            mount_point = next(
                entity["mount-point"]
                for entity in info["output"]["system-entities"]
                if "mount-point" in entity
            )
            Path(mount_point, ".metadata_never_index").touch()
            subprocess.run(["sudo", "-n", "mdutil", "-i", "off", mount_point])
        elif info["command"] == "hdiutil::detach" and info["ret"]:
            sys.stdout.write(f"hdiutil refused to detach {mount_point}; open files:\n")
            sys.stdout.flush()
            subprocess.run(["sudo", "-n", "lsof", "+f", "--", mount_point])

    return callback


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the Kolibri DMG.")
    parser.add_argument("volume_name")
    parser.add_argument("filename")
    args = parser.parse_args()

    build_dmg(
        args.filename,
        args.volume_name,
        str(SETTINGS_FILE),
        detach_retries=5,
        callback=detach_guard_callback(),
    )
