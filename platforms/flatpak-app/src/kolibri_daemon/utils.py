import logging

logger = logging.getLogger(__name__)

import filecmp
import shutil

from gi.repository import GLib

from pathlib import Path

import re

from kolibri_app.config import BASE_APPLICATION_ID
from kolibri_app.config import KOLIBRI_HOME_TEMPLATE_DIR
from kolibri_app.globals import KOLIBRI_HOME_PATH

# HTML tags and entities
TAGRE = re.compile("<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});")


def kolibri_update_from_home_template():
    """
    Construct a Kolibri home directory based on the Kolibri home template, if
    necessary.
    """

    # TODO: This code should probably be in Kolibri itself

    kolibri_home_template_dir = Path(KOLIBRI_HOME_TEMPLATE_DIR)

    if not kolibri_home_template_dir.is_dir():
        return

    if not KOLIBRI_HOME_PATH.is_dir():
        KOLIBRI_HOME_PATH.mkdir(parents=True, exist_ok=True)

    compare = filecmp.dircmp(
        kolibri_home_template_dir,
        KOLIBRI_HOME_PATH,
        ignore=["logs", "job_storage.sqlite3"],
    )

    if len(compare.common) > 0:
        return

    # If Kolibri home was not already initialized, copy files from the
    # template directory to the new home directory.

    logger.info("Copying KOLIBRI_HOME template to '{}'".format(KOLIBRI_HOME_PATH))

    for filename in compare.left_only:
        left_file = Path(compare.left, filename)
        right_file = Path(compare.right, filename)
        if left_file.is_dir():
            shutil.copytree(left_file, right_file)
        else:
            shutil.copy2(left_file, right_file)


def dict_to_vardict(data):
    """
    Convert all the values in a Python dict to GLib.Variant.
    """

    return dict((key, _value_to_variant(value)) for key, value in data.items())


def _value_to_variant(value):
    """
    Automatically convert a Python value to a GLib.Variant by guessing the
    matching variant type.
    """

    if isinstance(value, bool):
        return GLib.Variant("b", value)
    elif isinstance(value, bytes):
        return GLib.Variant("y", value)
    elif isinstance(value, int):
        return GLib.Variant("x", value)
    elif isinstance(value, float):
        return GLib.Variant("d", value)
    elif isinstance(value, str):
        return GLib.Variant("s", value)
    else:
        raise ValueError("Unknown value type", value)


def sanitize_text(text):
    """
    Replace all line break with spaces and removes all the html tags
    """

    lines = text.splitlines()
    lines = [re.sub(TAGRE, "", line) for line in lines]

    return " ".join(lines)


def get_search_media_icon(kind):
    node_icon_lookup = {
        "video": "play-circle-outline",
        "exercise": "checkbox-marked-circle-outline",
        "document": "text-box-outline",
        "topic": "cube-outline",
        "audio": "podcast",
        "html5": "motion-outline",
        "slideshow": "image-outline",
    }

    return "{prefix}-{icon}".format(
        prefix=BASE_APPLICATION_ID,
        icon=node_icon_lookup.get(kind, "cube-outline"),
    )
