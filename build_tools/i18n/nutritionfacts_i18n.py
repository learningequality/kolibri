# -*- coding: utf-8 -*-
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html

This set of functions interacts with the crowdin API as documented here:
    https://support.crowdin.com/api/api-integration-setup/
"""
import io
import json
import logging
import os
import shutil
import sys
import click

import utils


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


FILE_NAME = "default_frontend-messages.json"

# used in `mostRecentNotification` function in coreBase/index.vue
I18N_TITLE = "title"
I18N_MESSAGE = "msg"
I18N_LINK_TEXT = "link_text"


@click.command()
@click.option(
    "--title",
    default="UpdateNotification.upgradeHeader",
    help="Title string ID",
    type=str,
)
@click.option(
    "--message",
    default="UpdateNotification.upgradeMessageGeneric",
    help="Message string ID",
    type=str,
)
@click.option(
    "--link-text",
    default="UpdateNotification.upgradeLearnAndDownload",
    help="Link text string ID",
    type=str,
)
def main(title, message, link_text):
    """
    Generate JSON suitable for sending in nutrition facts notifications
    """

    supported_languages = utils.supported_languages(
        include_in_context=False, include_english=True
    )

    output = {}
    for lang_object in supported_languages:
        file_path = os.path.join(utils.local_locale_path(lang_object), FILE_NAME)
        i18n = {}
        with open(file_path) as f:
            input_data = json.load(f)
        if title in input_data:
            i18n[I18N_TITLE] = input_data[title]
        if message in input_data:
            i18n[I18N_MESSAGE] = input_data[message]
        if link_text in input_data:
            i18n[I18N_LINK_TEXT] = input_data[link_text]
        output[lang_object[utils.KEY_INTL_CODE]] = i18n

    # output JSON
    print(
        json.dumps(
            output, sort_keys=True, indent=2, separators=(",", ": "), ensure_ascii=False
        )
    )


if __name__ == "__main__":
    main()
