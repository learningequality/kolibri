import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_dmg


def _finished(command, ret, output):
    return {
        "type": "command::finished",
        "command": command,
        "ret": ret,
        "output": output,
    }


def _attached(mount_point):
    return _finished(
        "hdiutil::attach",
        0,
        {
            "system-entities": [
                {"dev-entry": "/dev/disk4"},
                {"dev-entry": "/dev/disk4s1", "mount-point": mount_point},
            ]
        },
    )


class TestSpotlightExclusionCallback(unittest.TestCase):
    def setUp(self):
        volume = tempfile.TemporaryDirectory()
        self.addCleanup(volume.cleanup)
        self.mount_point = volume.name

        bin_dir = tempfile.TemporaryDirectory()
        self.addCleanup(bin_dir.cleanup)
        self.sudo_log = Path(bin_dir.name, "sudo.log")
        sudo = Path(bin_dir.name, "sudo")
        sudo.write_text(f'#!/bin/sh\nprintf "%s\\n" "$*" >> "{self.sudo_log}"\n')
        sudo.chmod(0o755)
        path = patch.dict(
            os.environ, {"PATH": f"{bin_dir.name}{os.pathsep}{os.environ['PATH']}"}
        )
        path.start()
        self.addCleanup(path.stop)

        self.callback = build_dmg.detach_guard_callback()

    def sudo_calls(self):
        if not self.sudo_log.exists():
            return []
        return self.sudo_log.read_text().splitlines()

    def test_attach_turns_off_indexing_of_attached_mount_point(self):
        self.callback(_attached(self.mount_point))

        self.assertEqual(self.sudo_calls(), [f"-n mdutil -i off {self.mount_point}"])
        self.assertTrue(
            os.path.isfile(os.path.join(self.mount_point, ".metadata_never_index"))
        )

    def test_refused_detach_lists_holders_of_attached_mount_point(self):
        self.callback(_attached(self.mount_point))

        self.callback(_finished("hdiutil::detach", 1, "Resource busy"))

        self.assertEqual(self.sudo_calls()[1:], [f"-n lsof +f -- {self.mount_point}"])

    def test_clean_detach_runs_nothing(self):
        self.callback(_attached(self.mount_point))

        self.callback(_finished("hdiutil::detach", 0, ""))

        self.assertEqual(len(self.sudo_calls()), 1)

    def test_failed_attach_runs_nothing(self):
        self.callback(_finished("hdiutil::attach", 1, {}))

        self.assertEqual(self.sudo_calls(), [])
