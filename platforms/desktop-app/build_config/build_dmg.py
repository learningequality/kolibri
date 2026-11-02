import argparse
import os
import subprocess
import sys
from pathlib import Path

from dmgbuild import build_dmg
from dmgbuild import core

SETTINGS_FILE = Path(__file__).with_name("dmgbuild_settings.py")
DETACH_RETRIES = 5


# Wraps dmgbuild 1.6.7's core.hdiutil, which build_dmg calls as a module
# global for attach and detach; recheck on upgrade.
def detach_guard_hdiutil(hdiutil, detach_retries):
    devices = []
    mount_point = None
    refusals = 0

    def guarded(cmd, *args, **kwargs):
        nonlocal mount_point, refusals
        ret, output = hdiutil(cmd, *args, **kwargs)
        if cmd == "attach" and not ret:
            for entity in output["system-entities"]:
                dev_entry = entity["dev-entry"]
                devices.extend(
                    [dev_entry, dev_entry.replace("/dev/disk", "/dev/rdisk", 1)]
                )
                if "mount-point" in entity:
                    mount_point = entity["mount-point"]
            Path(mount_point, ".metadata_never_index").touch()
            subprocess.run(["sudo", "-n", "mdutil", "-i", "off", mount_point])
        elif cmd == "detach" and "-force" not in args and ret:
            refusals += 1
            sys.stdout.write(f"hdiutil refused to detach: {output.rstrip()}\n")
            sys.stdout.flush()
            mounted = os.path.ismount(mount_point)
            held = [*devices, mount_point] if mounted else devices
            lsof = subprocess.run(
                ["sudo", "-n", "lsof", "-w", "--", *held],
                capture_output=True,
                text=True,
            )
            holders = lsof.stdout + lsof.stderr
            if not holders and lsof.returncode == 1:
                holders = f"no process has {' '.join(held)} open\n"
            elif lsof.returncode not in (0, 1):
                holders += f"lsof exited with status {lsof.returncode}\n"
            sys.stdout.write(holders)
            sys.stdout.flush()
            if refusals == detach_retries:
                if mounted:
                    sys.stdout.write(
                        f"{mount_point} still mounted; leaving the refusal to dmgbuild\n"
                    )
                    sys.stdout.flush()
                else:
                    sys.stdout.write(f"forcing detach of {args[-1]}\n")
                    sys.stdout.flush()
                    return hdiutil("detach", "-force", *args, plist=False)
        return ret, output

    return guarded


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build the Kolibri DMG.")
    parser.add_argument("volume_name")
    parser.add_argument("filename")
    args = parser.parse_args()

    core.hdiutil = detach_guard_hdiutil(core.hdiutil, DETACH_RETRIES)
    build_dmg(
        args.filename,
        args.volume_name,
        str(SETTINGS_FILE),
        detach_retries=DETACH_RETRIES,
    )
