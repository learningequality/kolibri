"""
This script backports this Python 3.10 compatibility fix https://github.com/pytest-dev/pytest/pull/8540
in order to allow pytest to run in Python 3.10 without upgrading to version 6.2.5 which does not support 2.7
"""
import logging
import os
import subprocess
import sys

import pytest

logger = logging.getLogger(__name__)


def patch():
    site_packages_dir = os.path.dirname(pytest.__file__)

    patch_file = os.path.join(os.path.dirname(__file__), "pytest_3.10.patch")

    logger.info("Applying patch: " + str(patch_file))

    # -N: insist this is FORWARD patch, don't reverse apply
    # -p1: strip first path component
    # -t: batch mode, don't ask questions
    patch_command = [
        "patch",
        "-N",
        "-p1",
        "-d",
        site_packages_dir,
        "-t",
        "-i",
        patch_file,
    ]
    logger.info(" ".join(patch_command))
    try:
        # Use a dry run to establish whether the patch is already applied.
        # If we don't check this, the patch may be partially applied (which is bad!)
        subprocess.check_output(patch_command + ["--dry-run"])
    except subprocess.CalledProcessError as e:
        if e.returncode == 1:
            # Return code 1 means not all hunks could be applied, this usually
            # means the patch is already applied.
            logger.warning(
                "Failed to apply patch (exit code 1), "
                "assuming it is already applied: ",
                str(patch_file),
            )
        else:
            raise e
    else:
        # The dry run worked, so do the real thing
        subprocess.check_output(patch_command)


if __name__ == "__main__":
    if sys.version_info >= (3, 10):
        patch()
