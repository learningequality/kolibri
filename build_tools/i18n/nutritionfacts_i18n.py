# -*- coding: utf-8 -*-
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/release_process.html
"""
import csv
import json
import logging
import os
import sys

import click
import utils


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


FILE_NAME = "kolibri.core.default_frontend-messages.json"

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

        # If the language code is "en", parse csv file instead of json file.
        # Note that `make i18n-extract-frontend` should have been run to generate the csv file.
        if lang_object[utils.KEY_INTL_CODE] == "en":
            file_path = file_path.replace("json", "csv")
            with open(file_path) as f:
                csv_reader = csv.DictReader(f)
                for row in csv_reader:
                    identifier = row["Identifier"]
                    if title == identifier:
                        i18n[I18N_TITLE] = row["Source String"]
                    if message == identifier:
                        i18n[I18N_MESSAGE] = row["Source String"]
                    if link_text == identifier:
                        i18n[I18N_LINK_TEXT] = row["Source String"]

        else:
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
