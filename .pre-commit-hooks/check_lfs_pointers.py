#!/usr/bin/env python3
"""
Pre-commit hook to ensure files designated for Git LFS are actually LFS pointers.

This prevents accidentally committing binary files that should be managed by Git LFS.
See: https://github.com/learningequality/kolibri/issues/7099

Checks staged content (what will be committed) to verify it's an LFS pointer,
not binary data. This works whether or not Git LFS is installed in the environment
running the check.
"""

import logging
import subprocess
import sys

LFS_POINTER_HEADER = b"version https://git-lfs.github.com/spec/v1"


def has_lfs_filter(filepath):
    """
    Check if a file has the LFS filter attribute set.

    Args:
        filepath: Path to the file to check

    Returns:
        bool: True if file has filter=lfs attribute
    """
    try:
        result = subprocess.run(
            ["git", "check-attr", "filter", filepath],
            capture_output=True,
            text=True,
            check=True,
        )
        return "filter: lfs" in result.stdout
    except subprocess.CalledProcessError:
        return False


def is_lfs_pointer(filepath):
    """
    Check if the staged content for a file is an LFS pointer.

    Reads the staged content (what will be committed) to verify it starts
    with the LFS pointer header.

    Args:
        filepath: Path to the file to check

    Returns:
        bool: True if staged content is an LFS pointer, False otherwise
    """
    try:
        result = subprocess.run(
            ["git", "show", f":{filepath}"],
            capture_output=True,
            check=True,
        )
        first_line = result.stdout.split(b"\n")[0].strip()
        return first_line.startswith(LFS_POINTER_HEADER)
    except subprocess.CalledProcessError:
        return False


def main(filenames):
    """
    Main function to check staged files against LFS patterns.

    Args:
        filenames: List of filenames to check (passed by pre-commit)

    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    # Configure logging to write to stderr
    logging.basicConfig(level=logging.ERROR, format="%(message)s", stream=sys.stderr)
    logger = logging.getLogger(__name__)

    failed_files = []

    for filepath in filenames:
        if has_lfs_filter(filepath):
            if not is_lfs_pointer(filepath):
                failed_files.append(filepath)

    if failed_files:
        logger.error("\n" + "=" * 80)
        logger.error("ERROR: LFS Pointer Check Failed")
        logger.error("=" * 80)
        logger.error("")
        logger.error(
            "The following files should be LFS pointers but contain binary data:"
        )
        logger.error("")

        for filepath in failed_files:
            logger.error("  \033[31m✗\033[0m %s", filepath)

        logger.error("")
        logger.error("-" * 80)
        logger.error("These files match LFS patterns in .gitattributes but were not")
        logger.error("committed through Git LFS.")
        logger.error("")
        logger.error("To fix this issue:")
        logger.error("  1. Ensure Git LFS is installed: git lfs install")
        logger.error(
            "  2. Remove the binary files from staging: git rm --cached <file>"
        )
        logger.error("  3. Re-add the files (Git LFS will handle them): git add <file>")
        logger.error("=" * 80)
        logger.error("")

        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
