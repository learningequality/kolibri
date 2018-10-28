# -*- coding: utf-8 -*-
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html

This set of functions interacts with the crowdin API as documented here:
    https://support.crowdin.com/api/api-integration-setup/
"""
import argparse
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


if "CROWDIN_API_KEY" not in os.environ:
    logging.error("The CROWDIN_API_KEY environment variable needs to be set")
    sys.exit(1)


"""
Constants
"""

CROWDIN_PROJECT = "kolibri"  # crowdin project name
CROWDIN_API_KEY = os.environ["CROWDIN_API_KEY"]
CROWDIN_API_URL = "https://api.crowdin.com/api/project/{proj}/{cmd}?key={key}{params}"
DETAILS_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT, key=CROWDIN_API_KEY, cmd="info", params="&json"
)
LANG_STATUS_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="language-status",
    params="&language={language}&json",
)
REBUILD_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="export",
    params="&branch={branch}&json",
)
DOWNLOAD_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="download/{language}.zip",
    params="&branch={branch}",
)
ADD_SOURCE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="add-file",
    params="&branch={branch}&json",
)
UPDATE_SOURCE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="update-file",
    params="&branch={branch}&json",
)
DELETE_SOURCE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="delete-file",
    params="&branch={branch}&json",
)
ADD_BRANCH_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="add-directory",
    params="&name={branch}&is_branch=1&json",
)
PRETRANSLATE_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="pre-translate",
    params="&method=tm&approve_translated=1&auto_approve_option=1&json&&apply_untranslated_strings_only=1&perfect_match=1",
)
UPLOAD_TRANSLATION_URL = CROWDIN_API_URL.format(
    proj=CROWDIN_PROJECT,
    key=CROWDIN_API_KEY,
    cmd="upload-translation",
    params="&branch={branch}&language={language}&auto_approve_imported=1&import_duplicates=1&json",
)

PERSEUS_FILE = "exercise_perseus_render_module-messages.json"

"""
Shared helpers
"""


def _get_crowdin_details():
    r = requests.get(DETAILS_URL)
    r.raise_for_status()
    return r.json()


def _no_crowdin_branch(branch, details):
    branches = [
        node["name"] for node in details["files"] if node["node_type"] == "branch"
    ]
    return branch not in branches


def _crowdin_files(branch, details):
    if _no_crowdin_branch(branch, details):
        return set()
    branch_node = next(node for node in details["files"] if node["name"] == branch)
    return set(
        node["name"] for node in branch_node["files"] if node["node_type"] == "file"
    )


def _format_json_files():
    """
    re-print all json files to ensure consistent diffs with ordered keys
    """
    locale_paths = []
    for lang_info in utils.supported_languages(include_in_context=True):
        locale_paths.append(utils.local_locale_path(lang_info))
        locale_paths.append(utils.local_perseus_locale_path(lang_info))
    for locale_path in locale_paths:
        for file_name in os.listdir(locale_path):
            if not file_name.endswith(".json"):
                continue
            file_path = os.path.join(locale_path, file_name)
            with io.open(file_path, mode="r", encoding="utf-8") as f:
                data = json.load(f)
            utils.json_dump_formatted(data, file_path)


"""
Rebuild command
"""


def command_rebuild(branch):
    """
    Rebuilds zip files for the given branch on Crowdin
    """
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


def command_pretranslate(branch):
    """
    Applies pre-translation to the given branch on Crowdin
    """
    logging.info("Crowdin: pre-translating '{}'...".format(branch))
    params = []
    files = [
        "{}/{}".format(branch, f)
        for f in _crowdin_files(branch, _get_crowdin_details())
    ]
    params.extend([("files[]", file) for file in files])
    codes = [lang[utils.KEY_CROWDIN_CODE] for lang in utils.supported_languages()]
    params.extend([("languages[]", code) for code in codes])
    r = requests.post(PRETRANSLATE_URL, params=params)
    r.raise_for_status()
    logging.info("Crowdin: pre-translate succeeded!")


"""
Upload translations command
"""


def _translation_upload_ref(file_name, lang_object):
    if file_name == PERSEUS_FILE:  # hack for perseus, assumes the same file name
        source_path = utils.local_perseus_locale_path(lang_object)
    else:
        source_path = utils.local_locale_path(lang_object)
    file_pointer = open(os.path.join(source_path, file_name), "rb")
    return ("files[{0}]".format(file_name), file_pointer)


def command_upload_translation(branch, lang_code, file_name):
    # make sure it's not a source
    if lang_code == "en":
        logging.error("'en' is a source, not a translation")
        sys.exit(1)

    # check branch
    if _no_crowdin_branch(branch, _get_crowdin_details()):
        logging.error("Branch '{}' not found.".format(lang_code))
        sys.exit(1)

    # find language
    try:
        lang_object = next(
            lang
            for lang in utils.supported_languages()
            if lang[utils.KEY_INTL_CODE] == lang_code
        )
    except StopIteration:
        logging.error("Code '{}' not found in supported languages.".format(lang_code))
        logging.error("Make sure to use an Intl code, not crowdin.")
        sys.exit(1)

    logging.info(
        "Crowdin: uploading current translation for '{}' to '{}'...".format(
            lang_code, branch
        )
    )

    url = UPLOAD_TRANSLATION_URL.format(
        branch=branch, language=lang_object[utils.KEY_CROWDIN_CODE]
    )

    file_names = []
    if file_name:
        file_names.append(file_name)
    else:
        for name in os.listdir(utils.local_locale_path(lang_object)):
            if name.endswith(".json"):
                file_names.append(name)

    for chunk in _chunks(file_names):
        logging.info("\t{}".format(", ".join(chunk)))

        references = [_translation_upload_ref(f, lang_object) for f in chunk]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()

    logging.info("Crowdin: upload succeeded!")


"""
Download command
"""


def command_download(branch):
    """
    Downloads and updates the local translation files from the given branch on Crowdin
    """
    logging.info("Crowdin: downloading '{}'...".format(branch))
    for lang in utils.supported_languages(include_in_context=True):
        code = lang[utils.KEY_CROWDIN_CODE]
        url = DOWNLOAD_URL.format(language=code, branch=branch)
        r = requests.get(url)
        r.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(r.content))
        target = utils.local_locale_path(lang)
        logging.info("\tExtracting {} to {}".format(code, target))
        z.extractall(target)

        # hack for perseus
        perseus_target = utils.local_perseus_locale_path(lang)
        if not os.path.exists(perseus_target):
            os.makedirs(perseus_target)
        shutil.move(
            os.path.join(target, PERSEUS_FILE),
            os.path.join(perseus_target, PERSEUS_FILE),
        )

    _format_json_files()  # clean them up to make git diffs more meaningful
    logging.info("Crowdin: download succeeded!")


"""
Upload command
"""


def _is_source(file_name):
    return file_name.endswith(".json") or file_name.endswith(".po")


def _source_upload_ref(file_name):
    if file_name == PERSEUS_FILE:  # hack for perseus, assumes the same file name
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
    for chunk in _chunks(file_names):
        # generate the weird syntax and data structure required by crowdin + requests
        references = [_source_upload_ref(file_name) for file_name in chunk]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()


def command_upload(branch):
    """
    Uploads the English translation source files to the given branch on Crowdin
    """
    logging.info("Crowdin: uploading sources for '{}'...".format(branch))
    details = _get_crowdin_details()
    if _no_crowdin_branch(branch, details):
        logging.info("\tcreating branch '{}'...".format(branch))
        r = requests.post(ADD_BRANCH_URL.format(branch=branch))
        r.raise_for_status()

    source_files = set(
        file_name
        for file_name in os.listdir(utils.SOURCE_PATH)
        if _is_source(file_name)
    )

    # hack for perseus
    source_files.add(PERSEUS_FILE)

    current_files = _crowdin_files(branch, details)
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
Stats command
"""

STATS_TEMPLATE = """

Branch: {branch}

New since last release:
{totals_table}

Untranslated:
{branch_table}

"""


def command_stats(branch):
    """
    Prints stats for the translation status of the given branch
    """
    logging.info("Crowdin: getting details for '{}'...".format(branch))

    def _is_branch_node(node):
        return node["node_type"] == "branch" and node["name"] == branch

    total_strings = None
    total_words = None

    branch_table = []

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

        strs = branch_node["phrases"]
        strs_fin = branch_node["approved"]
        words = branch_node["words"]
        words_fin = branch_node["words_approved"]

        total_strings = strs
        total_words = words

        branch_table.append(
            (lang[utils.KEY_ENG_NAME], strs - strs_fin, words - words_fin)
        )

    totals_table = [("Total strings", total_strings), ("Total words", total_words)]
    avg_new_strings = round(sum([row[1] for row in branch_table]) / len(branch_table))
    avg_new_words = round(sum([row[2] for row in branch_table]) / len(branch_table))
    branch_table.insert(
        0, ("** average, all languages **", avg_new_strings, avg_new_words)
    )
    branch_table_headers = ["Language", "Strings", "Words"]

    logging.info(
        STATS_TEMPLATE.format(
            branch=branch,
            totals_table=tabulate(totals_table),
            branch_table=tabulate(branch_table, headers=branch_table_headers),
        )
    )


"""
Main
"""


def main():
    description = "\n\nProcess crowdin translations.\nSyntax: [command] [branch]\n\n"
    parser = argparse.ArgumentParser(description=description)
    subparsers = parser.add_subparsers(dest="command")
    parser_download = subparsers.add_parser(
        "download", help="Download translations from Crowdin"
    )
    parser_download.add_argument("branch", help="Branch name", type=str)
    parser_upload = subparsers.add_parser(
        "upload", help="Upload English sources to Crowdin"
    )
    parser_upload.add_argument("branch", help="Branch name", type=str)
    parser_pretranslate = subparsers.add_parser(
        "pre-translate", help="Apply translation memory on Crowdin"
    )
    parser_pretranslate.add_argument("branch", help="Branch name", type=str)
    parser_rebuild = subparsers.add_parser(
        "rebuild", help="Rebuild the translations on Crowdin"
    )
    parser_rebuild.add_argument("branch", help="Branch name", type=str)
    parser_stats = subparsers.add_parser(
        "stats", help="Stats for the translations on Crowdin"
    )
    parser_stats.add_argument("branch", help="Branch name", type=str)
    parser_upload_translation = subparsers.add_parser(
        "upload-translation", help="Upload a translation from a backup file"
    )
    parser_upload_translation.add_argument(
        "--branch", help="Branch name", type=str, required=True
    )
    parser_upload_translation.add_argument(
        "--language", help="Intl language code (not Crowdin)", type=str, required=True
    )
    parser_upload_translation.add_argument(
        "--file", help="File name (not full path)", type=str
    )
    args = parser.parse_args()

    if args.command == "download":
        command_download(args.branch)
    elif args.command == "upload":
        command_upload(args.branch)
    elif args.command == "rebuild":
        command_rebuild(args.branch)
    elif args.command == "pre-translate":
        command_pretranslate(args.branch)
    elif args.command == "stats":
        command_stats(args.branch)
    elif args.command == "upload-translation":
        command_upload_translation(args.branch, args.language, args.file)
    else:
        logging.warning("Unknown command\n")
        parser.print_help(sys.stderr)


if __name__ == "__main__":
    main()
