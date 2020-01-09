# -*- coding: utf-8 -*-
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html

This set of functions interacts with the crowdin API as documented here:
    https://support.crowdin.com/api/api-integration-setup/
"""

import click
import csv
import io
import json
import logging
import os
import shutil
import sys
import zipfile

import requests
import utils
from tabulate import tabulate


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


"""
Ensure that the API key is set
"""


def checkApiKey():
    if "CROWDIN_API_KEY" not in os.environ:
        logging.error("The CROWDIN_API_KEY environment variable needs to be set")
        sys.exit(1)


"""
Ensure that Perseus is installed for development
"""

PERSEUS_NOT_INSTALLED_FOR_DEV = """
Perseus strings must be updated during releases along with Kolibri.

Clone https://github.com/learningequality/kolibri-exercise-perseus-plugin/
and ensure that it has been checked out the the correct commit.

Install it in Kolibri in development mode:

    pip install -e [local_path_to_perseus_repo]

For more information see:
https://kolibri-dev.readthedocs.io/en/develop/i18n.html#updating-the-perseus-plugin
"""


PERSEUS_CSV_NOT_AVAILABLE = """
You must manually generate Perseus CSV files in order to upload them.
Change to the installed Perseus directory and run:

    yarn run makemessages
"""


def checkPerseus():
    if not (os.path.exists(utils.PERSEUS_LOCALE_PATH)):
        logging.error("Cannot find Perseus locale directory.")
        logging.info(PERSEUS_NOT_INSTALLED_FOR_DEV)
        sys.exit(1)
    elif "/site-packages/" in utils.PERSEUS_LOCALE_PATH:
        logging.warning("It appears that Perseus is not installed for development.")
        logging.info(PERSEUS_NOT_INSTALLED_FOR_DEV)
        click.confirm("Continue anyway?", abort=True)

    if not (os.path.exists(os.path.join(utils.PERSEUS_SOURCE_PATH, PERSEUS_CSV))):
        logging.warning("Perseus strings are not available as CSVs")
        logging.info(PERSEUS_CSV_NOT_AVAILABLE)
        click.confirm("Continue anyway?", abort=True)


"""
Shared constants and helpers
"""

CROWDIN_PROJECT = "kolibri"  # crowdin project name
CROWDIN_API_KEY = os.environ["CROWDIN_API_KEY"]
CROWDIN_API_URL = "https://api.crowdin.com/api/project/{proj}/{cmd}?key={key}{params}"

PERSEUS_CSV = "kolibri_exercise_perseus_plugin.main-messages.csv"
GLOSSARY_XML_FILE = "glossary.tbx"

DETAILS_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT, key=CROWDIN_API_KEY, cmd="info", params="&json"
)


def get_crowdin_details():
    r = requests.get(DETAILS_URL)
    r.raise_for_status()
    return r.json()


def no_crowdin_branch(branch, details):
    branches = [
        node["name"] for node in details["files"] if node["node_type"] == "branch"
    ]
    return branch not in branches


def crowdin_files(branch, details):
    if no_crowdin_branch(branch, details):
        return set()
    branch_node = next(node for node in details["files"] if node["name"] == branch)
    return set(
        node["name"] for node in branch_node["files"] if node["node_type"] == "file"
    )


def is_string_file(file_name):
    return file_name.endswith(".po") or file_name.endswith("-messages.csv")


"""
Rebuild
"""

REBUILD_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="export",
    params="&branch={branch}&json",
)


@click.command()
@click.argument("branch")
def rebuild_translations(branch):
    """
    Rebuild the given branch
    """
    checkApiKey()

    logging.info("Crowdin: rebuilding '{}'. This could take a while...".format(branch))
    r = requests.get(REBUILD_URL.format(branch=branch))
    r.raise_for_status()
    if r.json()["success"]["status"] == "skipped":
        logging.info("Crowdin: rebuild skipped. Can only be run once every 30 min.")
    else:
        logging.info(
            "Crowdin: rebuild succeeded! {}".format(r.json()["success"]["status"])
        )


"""
Pre-translate command
"""

# pre-translate all strings matches, and auto-approve only those with exact ID matches
PRETRANSLATE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="pre-translate",
    # perfect_match=0 - apply TM to all identical strings, regardless of ID
    # apply_untranslated_strings_only=1 - don't apply TM to strings that already have translations
    # approve_translated=1 - auto-approve
    params="&method=tm&approve_translated=1&auto_approve_option={approve_option}&json&apply_untranslated_strings_only=1&perfect_match=0",
)


@click.command()
@click.option(
    "--approve-all",
    is_flag=True,
    default=False,
    help="Automatically approve all string matches (default False)",
)
@click.argument("branch")
def pretranslate(branch, approve_all=False):
    """
    Apply pre-translation to the given branch
    """
    checkApiKey()

    params = []
    files = [
        "{}/{}".format(branch, f) for f in crowdin_files(branch, get_crowdin_details())
    ]
    params.extend([("files[]", file) for file in files])
    codes = [lang[utils.KEY_CROWDIN_CODE] for lang in utils.supported_languages()]
    params.extend([("languages[]", code) for code in codes])

    msg = (
        "Crowdin: pre-translating and pre-approving untranslated matches in '{}'..."
        if approve_all
        else "Crowdin: pre-translating untranslated matches in '{}'..."
    )
    msg += "\n\tNote that this operation can take a long time and may time out."
    msg += "\n\tYou should see the results on Crowdin eventually..."
    logging.info(msg.format(branch))

    r = requests.post(
        PRETRANSLATE_URL.format(approve_option=0 if approve_all else 1), params=params
    )
    r.raise_for_status()
    logging.info("Crowdin: succeeded!")


"""
Upload translations
"""

UPLOAD_TRANSLATION_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="upload-translation",
    params="&branch={branch}&language={language}&auto_approve_imported=1&import_duplicates=1&json",
)


def _translation_upload_ref(file_name, lang_object):
    if file_name == PERSEUS_CSV:  # hack for perseus, assumes the same file name
        source_path = utils.local_perseus_locale_path(lang_object)
    else:
        source_path = utils.local_locale_path(lang_object)
    file_pointer = open(os.path.join(source_path, file_name), "rb")
    return ("files[{0}]".format(file_name), file_pointer)


def _upload_translation(branch, lang_object):

    if no_crowdin_branch(branch, get_crowdin_details()):
        logging.error("Branch '{}' not found.".format(branch))
        sys.exit(1)

    logging.info(
        "Crowdin: uploading translation files for '{}' to '{}'...".format(
            lang_object[utils.KEY_CROWDIN_CODE], branch
        )
    )

    url = UPLOAD_TRANSLATION_URL.format(
        branch=branch, language=lang_object[utils.KEY_CROWDIN_CODE]
    )

    file_names = []
    for name in os.listdir(utils.local_locale_path(lang_object)):
        if is_string_file(name):
            file_names.append(name)
    for name in os.listdir(utils.local_perseus_locale_path(lang_object)):
        if is_string_file(name):
            file_names.append(name)

    for chunk in _chunks(file_names):
        references = [_translation_upload_ref(f, lang_object) for f in chunk]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()

    logging.info("Crowdin: upload succeeded!")


@click.command()
@click.argument("branch")
def upload_translations(branch):
    """
    Upload translations to the given branch
    """
    checkPerseus()
    checkApiKey()

    supported_languages = utils.supported_languages(
        include_in_context=False, include_english=False
    )
    for lang_object in supported_languages:
        _upload_translation(branch, lang_object)


"""
Convert CSV to JSON command
"""


def _csv_to_json():
    """
    Convert all CSV json files to JSON and ensure consistent diffs with ordered keys
    """

    for lang_object in utils.supported_languages(include_in_context=True):
        locale_path = utils.local_locale_path(lang_object)
        perseus_path = utils.local_perseus_locale_path(lang_object)

        csv_locale_dir_path = os.path.join(
            utils.local_locale_csv_path(), lang_object["crowdin_code"]
        )
        perseus_locale_dir_path = os.path.join(
            utils.local_perseus_locale_csv_path(), lang_object["crowdin_code"]
        )

        # Make sure that the Perseus directory for CSV_FILES/{lang_code} exists
        if not os.path.exists(perseus_locale_dir_path):
            os.makedirs(perseus_locale_dir_path)

        csv_dirs = os.listdir(csv_locale_dir_path) + os.listdir(perseus_locale_dir_path)

        for file_name in csv_dirs:
            if "csv" not in file_name:
                continue

            if file_name == PERSEUS_CSV:
                csv_path = os.path.join(perseus_locale_dir_path, file_name)
            else:
                csv_path = os.path.join(csv_locale_dir_path, file_name)

            # Account for csv reading differences in Pythons 2 and 3
            try:
                newline = None if sys.version_info[0] < 3 else ""
                mode = "r+b" if sys.version_info[0] < 3 else "r"
                encoding = None if sys.version_info[0] < 3 else "utf-8"
                csv_file = io.open(
                    csv_path, mode=mode, encoding=encoding, newline=newline
                )
            except EnvironmentError as e:
                logging.info("Failed to find CSV file in: {}".format(csv_path))
                continue

            with csv_file as f:
                csv_data = list(row for row in csv.DictReader(f))

            data = _locale_data_from_csv(csv_data)

            if file_name == PERSEUS_CSV:
                utils.json_dump_formatted(
                    data, perseus_path, file_name.replace("csv", "json")
                )
            else:
                utils.json_dump_formatted(
                    data, locale_path, file_name.replace("csv", "json")
                )


def _locale_data_from_csv(file_data):
    json = dict()

    for row in file_data:
        if len(row.keys()) == 0:
            return json
        # First index is Identifier, Third index is the translation
        json[row["Identifier"]] = row["Translation"]

    return json


@click.command()
def convert_files():
    """
    Convert downloaded CSV files to JSON
    """
    _csv_to_json()
    logging.info("Kolibri: CSV to JSON conversion succeeded!")


"""
Download translations
"""

DOWNLOAD_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="download/all.zip",
    params="&branch={branch}",
)


def _wipe_translations(locale_path):
    for file_name in os.listdir(locale_path):
        target = os.path.join(locale_path, file_name)
        if file_name != "en" and os.path.isdir(target):
            shutil.rmtree(target)


@click.command()
@click.argument("branch")
def download_translations(branch):
    """
    Download translations from the given branch
    """
    checkPerseus()
    checkApiKey()

    logging.info("Crowdin: downloading '{}'...".format(branch))

    # delete previous files
    _wipe_translations(utils.LOCALE_PATH)
    _wipe_translations(utils.PERSEUS_LOCALE_PATH)

    for lang_object in utils.supported_languages(include_in_context=True):
        code = lang_object[utils.KEY_CROWDIN_CODE]
        url = DOWNLOAD_URL.format(language=code, branch=branch)
        r = requests.get(url)
        r.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(r.content))
        target = utils.local_locale_csv_path()
        logging.info("\tExtracting {} to {}".format(code, target))
        z.extractall(target)

        # hack for perseus
        perseus_target = os.path.join(
            utils.local_perseus_locale_csv_path(), lang_object["crowdin_code"]
        )
        ## TODO - Update this to work with perseus properly - likely to need to update
        ## the kolibri-exercise-perseus-plugin repo directly to produce a CSV for its
        ## translations.
        if not os.path.exists(perseus_target):
            os.makedirs(perseus_target)
        try:
            shutil.move(
                os.path.join(target, lang_object["crowdin_code"], PERSEUS_CSV),
                os.path.join(perseus_target, PERSEUS_CSV),
            )
        except:
            pass

    ## TODO Don't need to format here... going to do this in the new command.
    _csv_to_json()  # clean them up to make git diffs more meaningful
    logging.info("Crowdin: download succeeded!")


"""
Glossary commands
"""

DOWNLOAD_GLOSSARY_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT, key=CROWDIN_API_KEY, cmd="download-glossary", params=""
)

UPLOAD_GLOSSARY_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT, key=CROWDIN_API_KEY, cmd="upload-glossary", params=""
)

GLOSSARY_FILE = os.path.join(utils.LOCALE_PATH, GLOSSARY_XML_FILE)


@click.command()
def download_glossary():
    """
    Download glossary file
    """
    checkApiKey()

    logging.info("Crowdin: downloading glossary...")
    r = requests.get(DOWNLOAD_GLOSSARY_URL)
    r.raise_for_status()
    with io.open(GLOSSARY_FILE, mode="w", encoding="utf-8") as f:
        f.write(r.text)
    logging.info("Crowdin: download succeeded!")


@click.command()
def upload_glossary():
    """
    Upload glossary file
    """
    checkApiKey()

    logging.info("Crowdin: uploading glossary...")
    files = {"file": open(GLOSSARY_FILE, "rb")}
    r = requests.post(UPLOAD_GLOSSARY_URL, files=files)
    r.raise_for_status()
    logging.info("Crowdin: upload succeeded!")


"""
Upload source files
"""

ADD_BRANCH_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="add-directory",
    params="&name={branch}&is_branch=1&json",
)
ADD_SOURCE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="add-file",
    params="&branch={branch}&scheme=identifier,source_phrase,context,translation&json&first_line_contains_header&import_translations=0",
)
UPDATE_SOURCE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="update-file",
    params="&branch={branch}&scheme=identifier,source_phrase,context,translation&json&first_line_contains_header&import_translations=0",
)


def _source_upload_ref(file_name):
    if file_name == PERSEUS_CSV:  # hack for perseus, assumes the same file name
        file_pointer = open(os.path.join(utils.PERSEUS_SOURCE_PATH, file_name), "rb")
    else:
        file_pointer = open(os.path.join(utils.SOURCE_PATH, file_name), "rb")
    return ("files[{0}]".format(file_name), file_pointer)


def _chunks(files):
    # API can take only 20 files at a time
    files = list(files)
    MAX_FILES = 20
    for i in range(0, len(files), MAX_FILES):
        yield files[i : i + MAX_FILES]


def _modify(url, file_names):
    # split into multiple requests
    logging.info("Uploading {}".format(url))
    for chunk in _chunks(file_names):
        # generate the weird syntax and data structure required by crowdin + requests
        references = [_source_upload_ref(file_name) for file_name in chunk]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()


@click.command()
@click.argument("branch")
def upload_sources(branch):
    """
    Upload English source files to the given branch
    """
    checkPerseus()
    checkApiKey()

    logging.info("Crowdin: uploading sources for '{}'...".format(branch))
    details = get_crowdin_details()
    if no_crowdin_branch(branch, details):
        logging.info("\tcreating branch '{}'...".format(branch))
        r = requests.post(ADD_BRANCH_URL.format(branch=branch))
        r.raise_for_status()

    source_files = set(
        file_name
        for file_name in os.listdir(utils.SOURCE_PATH)
        if is_string_file(file_name)
    )

    # hack for perseus
    source_files.add(PERSEUS_CSV)

    current_files = crowdin_files(branch, details)
    to_add = source_files.difference(current_files)
    to_update = source_files.intersection(current_files)

    if to_add:
        logging.info("\tAdd in '{}': {}".format(branch, ", ".join(to_add)))
        _modify(ADD_SOURCE_URL.format(branch=branch), to_add)
    if to_update:
        logging.info("\tUpdate in '{}': {}".format(branch, ", ".join(to_update)))
        _modify(UPDATE_SOURCE_URL.format(branch=branch), to_update)

    logging.info("Crowdin: upload succeeded!")


"""
Statistics
"""

STATS_TEMPLATE = """
=================================================================
Branch: {branch}
=================================================================
==  Summary  ====================================================

{summary_table}

=================================================================
==  Untranslated  ===============================================

{untranslated_table}

=================================================================
==  Needs Approval  =============================================

{needs_approval_table}

=================================================================
"""

LANG_STATUS_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="language-status",
    params="&language={language}&json",
)


@click.command()
@click.argument("branch")
def translation_stats(branch):
    """
    Print stats for the given branch
    """
    checkApiKey()

    logging.info("Crowdin: getting details for '{}'...".format(branch))

    def _is_branch_node(node):
        return node["node_type"] == "branch" and node["name"] == branch

    needs_approval_table = []
    strings_total = 0
    untranslated_table = []
    words_total = 0

    sorted_languages = sorted(
        utils.supported_languages(), key=lambda x: x[utils.KEY_ENG_NAME]
    )
    for lang in sorted_languages:

        logging.info("Retrieving stats for {}...".format(lang[utils.KEY_ENG_NAME]))
        r = requests.post(LANG_STATUS_URL.format(language=lang[utils.KEY_CROWDIN_CODE]))
        r.raise_for_status()
        try:
            branch_node = next(
                node for node in r.json()["files"] if _is_branch_node(node)
            )
        except StopIteration:
            logging.error("Branch '{}' not found on Crowdin".format(branch))
            sys.exit(1)

        needs_approval_table.append(
            (
                lang[utils.KEY_ENG_NAME],
                branch_node["words_translated"] - branch_node["words_approved"],
                branch_node["translated"] - branch_node["approved"],
            )
        )
        untranslated_table.append(
            (
                lang[utils.KEY_ENG_NAME],
                branch_node["words"] - branch_node["words_translated"],
                branch_node["phrases"] - branch_node["translated"],
            )
        )

        strings_total = branch_node["phrases"]  # should be the same across languages
        words_total = branch_node["words"]  # should be the same across languages

    total_untranslated_strings = sum([row[2] for row in untranslated_table])
    total_unapproved_strings = sum([row[2] for row in needs_approval_table])

    avg_untranslated_strings = round(
        total_untranslated_strings / len(untranslated_table)
    )
    avg_unapproved_strings = round(total_unapproved_strings / len(needs_approval_table))

    total_untranslated_words = sum([row[1] for row in untranslated_table])
    total_unapproved_words = sum([row[1] for row in needs_approval_table])

    avg_untranslated_words = round(total_untranslated_words / len(untranslated_table))
    avg_unapproved_words = round(total_unapproved_words / len(needs_approval_table))

    summary_table_headers = ["", "Words", "Strings"]
    summary_table = [
        ("Avg. Untranslated", avg_untranslated_words, avg_untranslated_strings),
        ("Avg. Needs Approval", avg_unapproved_words, avg_unapproved_strings),
        ("Total (for a new language)", words_total, strings_total),
    ]
    needs_approval_table_headers = ["Language", "Words", "Strings"]
    untranslated_table_headers = ["Language", "Words", "Strings"]

    logging.info(
        STATS_TEMPLATE.format(
            branch=branch,
            summary_table=tabulate(summary_table, headers=summary_table_headers),
            untranslated_table=tabulate(
                untranslated_table, headers=untranslated_table_headers
            ),
            needs_approval_table=tabulate(
                needs_approval_table, headers=needs_approval_table_headers
            ),
        )
    )


"""
Main
"""


@click.group()
def main():
    """
    Process crowdin translations
    """


main.add_command(convert_files)
main.add_command(download_translations)
main.add_command(pretranslate)
main.add_command(rebuild_translations)
main.add_command(translation_stats)
main.add_command(upload_sources)
main.add_command(upload_translations)
main.add_command(download_glossary)
main.add_command(upload_glossary)

if __name__ == "__main__":
    main()
