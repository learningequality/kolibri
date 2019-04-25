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
    for lang_object in utils.supported_languages(include_in_context=True):
        locale_paths.append(utils.local_locale_path(lang_object))
        locale_paths.append(utils.local_perseus_locale_path(lang_object))
    for locale_path in locale_paths:
        for file_name in os.listdir(locale_path):
            if not file_name.endswith(".json"):
                continue
            file_path = os.path.join(locale_path, file_name)
            with io.open(file_path, mode="r", encoding="utf-8") as f:
                data = json.load(f)
            utils.json_dump_formatted(data, file_path)


def _is_string_file(file_name):
    return file_name.endswith(".json") or file_name.endswith(".po")


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


def command_pretranslate(branch, approve_all=False):
    """
    Applies pre-translation to the given branch on Crowdin
    """
    params = []
    files = [
        "{}/{}".format(branch, f)
        for f in _crowdin_files(branch, _get_crowdin_details())
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
Upload translations command
"""


def _translation_upload_ref(file_name, lang_object):
    if file_name == PERSEUS_FILE:  # hack for perseus, assumes the same file name
        source_path = utils.local_perseus_locale_path(lang_object)
    else:
        source_path = utils.local_locale_path(lang_object)
    file_pointer = open(os.path.join(source_path, file_name), "rb")
    return ("files[{0}]".format(file_name), file_pointer)


def _upload_translation(branch, lang_object):

    if _no_crowdin_branch(branch, _get_crowdin_details()):
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
        if _is_string_file(name):
            file_names.append(name)
    for name in os.listdir(utils.local_perseus_locale_path(lang_object)):
        if _is_string_file(name):
            file_names.append(name)

    for chunk in _chunks(file_names):
        references = [_translation_upload_ref(f, lang_object) for f in chunk]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()

    logging.info("Crowdin: upload succeeded!")


def command_upload_translations(branch):
    supported_languages = utils.supported_languages(
        include_in_context=False, include_english=False
    )
    for lang_object in supported_languages:
        _upload_translation(branch, lang_object)


"""
Download command
"""


def _wipe_translations(locale_path):
    for file_name in os.listdir(locale_path):
        target = os.path.join(locale_path, file_name)
        if file_name != "en" and os.path.isdir(target):
            shutil.rmtree(target)


def command_download(branch):
    """
    Downloads and updates the local translation files from the given branch on Crowdin
    """
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
        target = utils.local_locale_path(lang_object)
        logging.info("\tExtracting {} to {}".format(code, target))
        z.extractall(target)

        # hack for perseus
        perseus_target = utils.local_perseus_locale_path(lang_object)
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


def command_upload_sources(branch):
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
        if _is_string_file(file_name)
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


def command_stats(branch):
    """
    Prints stats for the translation status of the given branch
    """
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

    avg_untranslated_strings = round(total_untranslated_strings / len(untranslated_table))
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
            untranslated_table=tabulate(untranslated_table, headers=untranslated_table_headers),
            needs_approval_table=tabulate(needs_approval_table, headers=needs_approval_table_headers),
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
        "upload-sources", help="Upload English sources to Crowdin"
    )
    parser_upload.add_argument("branch", help="Branch name", type=str)
    parser_pretranslate = subparsers.add_parser(
        "pretranslate", help="Apply translation memory on Crowdin"
    )
    parser_pretranslate.add_argument(
        "--approve-all",
        dest="approve",
        action="store_true",
        default=False,
        help="Automatically approve all string matches on Crowdin",
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
    parser_upload_translations = subparsers.add_parser(
        "upload-translations", help="Upload a translation from a backup file"
    )
    parser_upload_translations.add_argument("branch", help="Branch name", type=str)
    args = parser.parse_args()

    if args.command == "download":
        command_download(args.branch)
    elif args.command == "upload-sources":
        command_upload_sources(args.branch)
    elif args.command == "rebuild":
        command_rebuild(args.branch)
    elif args.command == "pretranslate":
        command_pretranslate(args.branch, args.approve)
    elif args.command == "stats":
        command_stats(args.branch)
    elif args.command == "upload-translations":
        command_upload_translations(args.branch)
    else:
        logging.warning("Unknown command\n")
        parser.print_help(sys.stderr)


if __name__ == "__main__":
    main()
