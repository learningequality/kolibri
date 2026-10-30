import io
import os
import shutil
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import build_dmg

REFUSAL = 'hdiutil: couldn\'t eject "disk4" - Resource busy'
DETACH = ("detach", "/dev/disk4s1")
FORCE = ("detach", "-force", "/dev/disk4s1")
DEVICES = ["/dev/disk4", "/dev/rdisk4", "/dev/disk4s1", "/dev/rdisk4s1"]
RETRIES = 2


def _attached(mount_point):
    return {
        "system-entities": [
            {"dev-entry": "/dev/disk4"},
            {"dev-entry": "/dev/disk4s1", "mount-point": mount_point},
        ]
    }


class TestDetachGuardHdiutil(unittest.TestCase):
    def setUp(self):
        volume = tempfile.TemporaryDirectory()
        self.addCleanup(volume.cleanup)
        self.mount_point = volume.name

        bin_dir = tempfile.TemporaryDirectory()
        self.addCleanup(bin_dir.cleanup)
        self.sudo_log = Path(bin_dir.name, "sudo.log")
        self.sudo_output = Path(bin_dir.name, "sudo.out")
        self.sudo_error = Path(bin_dir.name, "sudo.err")
        self.sudo_status = Path(bin_dir.name, "sudo.status")
        self.sudo = Path(bin_dir.name, "sudo")
        self.sudo.write_text(
            "#!/bin/sh\n"
            f'printf "%s\\n" "$*" >> "{self.sudo_log}"\n'
            f'cat "{self.sudo_output}" 2>/dev/null\n'
            f'cat "{self.sudo_error}" >&2 2>/dev/null\n'
            f'exit "$(cat "{self.sudo_status}" 2>/dev/null || echo 0)"\n'
        )
        self.sudo.chmod(0o755)
        path = patch.dict(
            os.environ, {"PATH": f"{bin_dir.name}{os.pathsep}{os.environ['PATH']}"}
        )
        path.start()
        self.addCleanup(path.stop)

        self.results = {(FORCE, False): (0, "forced")}
        self.calls = []

        def hdiutil(*args, plist=True):
            self.calls.append(((args, plist), len(self.sudo_calls())))
            return self.results[(args, plist)]

        self.hdiutil = build_dmg.detach_guard_hdiutil(hdiutil, RETRIES)

    def sudo_calls(self):
        if not self.sudo_log.exists():
            return []
        return self.sudo_log.read_text().splitlines()

    def attach(self, attached=None):
        self.results[(("attach", "image.dmg"), True)] = (
            0,
            attached or _attached(self.mount_point),
        )
        self.hdiutil("attach", "image.dmg")

    def detach(self, ret, output):
        self.results[(DETACH, False)] = (ret, output)
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            result = self.hdiutil(*DETACH, plist=False)
        return result, stdout.getvalue()

    def forced_calls(self):
        return [sudo_count for call, sudo_count in self.calls if call == (FORCE, False)]

    def test_attach_turns_off_indexing_of_attached_mount_point(self):
        self.attach()

        self.assertEqual(self.sudo_calls(), [f"-n mdutil -i off {self.mount_point}"])
        self.assertTrue(
            os.path.isfile(os.path.join(self.mount_point, ".metadata_never_index"))
        )

    def attach_real_lsof_disk(self):
        disk = Path(self.mount_point, "disk")
        disk.touch()
        self.attach(
            {
                "system-entities": [
                    {"dev-entry": str(disk), "mount-point": self.mount_point}
                ]
            }
        )
        self.sudo.write_text('#!/bin/sh\nshift\nexec "$@"\n')
        return disk

    @unittest.skipUnless(shutil.which("lsof"), "needs lsof")
    def test_refused_detach_lists_real_holder_of_image_device(self):
        disk = self.attach_real_lsof_disk()
        with disk.open() as held:
            holder = subprocess.Popen(["sleep", "60"], stdin=held)
        self.addCleanup(holder.wait)
        self.addCleanup(holder.kill)

        _, log = self.detach(1, REFUSAL)

        self.assertRegex(log, rf"\bsleep\s+{holder.pid}\b")

    @unittest.skipUnless(shutil.which("lsof"), "needs lsof")
    def test_refused_detach_with_real_lsof_and_no_holder_says_none_hold_device(self):
        disk = self.attach_real_lsof_disk()

        _, log = self.detach(1, REFUSAL)

        self.assertIn(f"no process has {disk} {disk} open", log)

    @unittest.skipUnless(shutil.which("lsof"), "needs lsof")
    def test_refused_detach_while_mounted_lists_real_holder_of_volume(self):
        self.attach_real_lsof_disk()
        holder = subprocess.Popen(["sleep", "60"], cwd=self.mount_point)
        self.addCleanup(holder.wait)
        self.addCleanup(holder.kill)

        with patch("build_dmg.os.path.ismount", return_value=True):
            _, log = self.detach(1, REFUSAL)

        self.assertRegex(log, rf"\bsleep\s+{holder.pid}\b")

    def test_refused_detach_logs_refusal_and_holders(self):
        holder = "diskimage 512 root 3u BLK 1,8 /dev/disk4\n"
        self.sudo_output.write_text(holder)
        self.attach()

        _, log = self.detach(1, f"{REFUSAL}\n")

        self.assertIn(f"{REFUSAL}\n{holder}", log)

    def test_refused_detach_with_holder_of_some_devices_logs_no_status(self):
        self.sudo_output.write_text("diskimage 512 root 3u BLK 1,8 /dev/disk4\n")
        self.sudo_status.write_text("1")
        self.attach()

        _, log = self.detach(1, REFUSAL)

        self.assertNotIn("lsof exited", log)

    def test_refused_detach_without_holders_says_none_hold_devices(self):
        self.sudo_status.write_text("1")
        self.attach()

        _, log = self.detach(1, REFUSAL)

        self.assertIn(f"no process has {' '.join(DEVICES)} open", log)

    def test_refused_detach_while_mounted_asks_lsof_about_volume(self):
        self.sudo_status.write_text("1")
        self.attach()

        with patch("build_dmg.os.path.ismount", return_value=True):
            _, log = self.detach(1, REFUSAL)

        held = " ".join([*DEVICES, self.mount_point])
        self.assertEqual(self.sudo_calls()[-1], f"-n lsof -w -- {held}")
        self.assertIn(f"no process has {held} open", log)

    def test_refused_detach_with_lsof_error_logs_error_not_none(self):
        error = "lsof: status error on /dev/disk4: No such file or directory\n"
        self.sudo_error.write_text(error)
        self.sudo_status.write_text("1")
        self.attach()

        _, log = self.detach(1, REFUSAL)

        self.assertIn(error, log)
        self.assertNotIn("no process has", log)

    def test_refused_detach_with_silent_lsof_failure_logs_status_not_none(self):
        self.sudo_status.write_text("139")
        self.attach()

        _, log = self.detach(1, REFUSAL)

        self.assertIn("lsof exited with status 139", log)
        self.assertNotIn("no process has", log)

    def test_clean_detach_runs_nothing(self):
        self.attach()

        _, log = self.detach(0, "")

        self.assertEqual(len(self.sudo_calls()), 1)
        self.assertEqual(log, "")

    def test_failed_attach_runs_nothing(self):
        self.results[(("attach", "image.dmg"), True)] = (1, {})

        self.hdiutil("attach", "image.dmg")

        self.assertEqual(self.sudo_calls(), [])

    def test_refused_detach_before_last_retry_returns_refusal(self):
        self.attach()

        result, _ = self.detach(1, REFUSAL)

        self.assertEqual(self.forced_calls(), [])
        self.assertEqual(result, (1, REFUSAL))

    def test_last_refused_detach_after_unmount_returns_forced_detach(self):
        self.attach()
        self.detach(1, REFUSAL)

        result, log = self.detach(1, REFUSAL)

        self.assertEqual(self.forced_calls(), [3])
        self.assertEqual(result, (0, "forced"))
        self.assertIn(f"forcing detach of {DETACH[-1]}", log)

    def test_last_refused_detach_while_mounted_returns_refusal(self):
        self.attach()

        with patch("build_dmg.os.path.ismount", return_value=True):
            self.detach(1, REFUSAL)
            result, log = self.detach(1, REFUSAL)

        self.assertEqual(self.forced_calls(), [])
        self.assertEqual(result, (1, REFUSAL))
        self.assertEqual(len(self.sudo_calls()), 3)
        self.assertIn(
            f"{self.mount_point} still mounted; leaving the refusal to dmgbuild", log
        )

    def test_refused_forced_detach_returns_refusal(self):
        self.attach()
        self.results[(FORCE, False)] = (1, REFUSAL)

        result = self.hdiutil(*FORCE, plist=False)

        self.assertEqual(self.forced_calls(), [1])
        self.assertEqual(result, (1, REFUSAL))
        self.assertEqual(len(self.sudo_calls()), 1)
