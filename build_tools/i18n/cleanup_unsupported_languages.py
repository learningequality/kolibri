#!/usr/bin/env python
"""
Remove locale directories for languages not in language_info.json.

This script should be run after downloading translations from Crowdin to clean up
any languages that were downloaded but are not officially supported by Kolibri.
"""

import logging
import os
import shutil

from utils import available_languages
from utils import LOCALE_DATA_FOLDER
from utils import to_locale


def cleanup_unsupported_languages():
    """
    Remove locale directories that are not in our supported languages list.
    """
    # Get the set of supported locale directory names
    supported_locales = set()
    for lang_obj in available_languages():
        intl_code = lang_obj["intl_code"]
        locale_dir = to_locale(intl_code)
        supported_locales.add(locale_dir)

    # Check all directories in the locale folder
    removed_locales = []
    for item in os.listdir(LOCALE_DATA_FOLDER):
        item_path = os.path.join(LOCALE_DATA_FOLDER, item)

        # Skip if not a directory or if it's a special file
        if not os.path.isdir(item_path):
            continue

        # If this directory is not in our supported list, remove it
        if item not in supported_locales:
            shutil.rmtree(item_path)
            removed_locales.append(item)

    if removed_locales:
        logging.info(
            f"Removed unsupported language directories: {', '.join(sorted(removed_locales))}"
        )
    else:
        logging.info("No unsupported language directories found")


if __name__ == "__main__":
    cleanup_unsupported_languages()
