# -*- coding: utf-8 -*-
"""
For usage instructions, see:
    https://kolibri-dev.readthedocs.io/en/develop/references/i18n.html

This set of functions interacts with the crowdin API as documented here:
    https://support.crowdin.com/api/api-integration-setup/
"""
import io
import logging
import os
import shutil
import sys
import zipfile

import click
import requests
import utils
from tabulate import tabulate


logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


# crowdin project name
project_option = click.Option(
    param_decls=["--project"],
    envvar="CROWDIN_PROJECT",
    help="Set the Crowdin Project",
    prompt="Crowdin Project name",
    required=True,
)

login_option = click.Option(
    param_decls=["--login"],
    envvar="CROWDIN_LOGIN",
    help="Set the Crowdin Login Username",
    prompt="Crowdin username",
    required=True,
)

key_option = click.Option(
    param_decls=["--key"],
    envvar="CROWDIN_API_KEY",
    help="Set the Crowdin API key",
    prompt="Crowdin API key",
    required=True,
)

branch_argument = click.argument(
    "branch",
    envvar="CROWDIN_BRANCH",
    required=True,
)


# We could attempt to infer this in the Kolibri and Kolibri plugin
# case, using our plugin machinery - but this would require us to
# import functions from webpack_json.py which is not currently possible
# as these modules do not constitute a package and so cannot do relative
# imports.
locale_data_folder_option = click.option(
    "--locale-data-folder",
    envvar="LOCALE_DATA_FOLDER",
    help="Set path to write locale files to",
    type=click.Path(file_okay=False),
    prompt="Path to locale folder",
    required=True,
)


class CrowdinCommand(click.Command):
    """
    A command class for Crowdin commands.
    By default adds parameters for crowdin access
    and path configuration.
    """

    allow_extra_args = True

    def __init__(self, *args, **kwargs):
        kwargs["params"] = [project_option, login_option, key_option] + (
            kwargs["params"] if "params" in kwargs else []
        )
        context_settings = kwargs.get("context_settings", {})
        default_map = context_settings.get("default_map", {})
        default_map.update(utils.read_config_file())
        context_settings["default_map"] = default_map
        kwargs["context_settings"] = context_settings
        super(CrowdinCommand, self).__init__(*args, **kwargs)


"""
Shared constants and helpers
"""
CROWDIN_API_URL = "https://api.crowdin.com/api/project/{proj}/{cmd}?account-key={key}&login={username}{params}"

GLOSSARY_XML_FILE = "glossary.tbx"


def get_crowdin_details(project, key, login):
    details_url = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="info",
        params="&json",
    )
    r = requests.get(details_url)
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


@click.command(cls=CrowdinCommand)
@branch_argument
def rebuild_translations(branch, project, key, login):
    """
    Rebuild the given branch
    """
    logging.info("Crowdin: rebuilding '{}'. This could take a while...".format(branch))
    rebuild_url = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="export",
        params="&branch={branch}&json".format(branch=branch),
    )
    r = requests.get(rebuild_url)
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
@click.command(cls=CrowdinCommand)
@branch_argument
@click.option(
    "--approve-all",
    is_flag=True,
    default=False,
    help="Automatically approve all string matches (default False)",
)
def pretranslate(branch, project, key, login, approve_all=False):
    """
    Apply pre-translation to the given branch
    """
    params = []
    files = [
        "{}/{}".format(branch, f)
        for f in crowdin_files(branch, get_crowdin_details(project, key, login))
    ]
    params.extend([("files[]", file) for file in files])
    codes = [lang[utils.KEY_CROWDIN_CODE] for lang in utils.available_languages()]
    params.extend([("languages[]", code) for code in codes])

    msg = (
        "Crowdin: pre-translating and pre-approving untranslated matches in '{}'..."
        if approve_all
        else "Crowdin: pre-translating untranslated matches in '{}'..."
    )
    msg += "\n\tNote that this operation can take a long time and may time out."
    msg += "\n\tYou should see the results on Crowdin eventually..."
    logging.info(msg.format(branch))

    pretranslate_url = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        cmd="pre-translate",
        username=login,
        # perfect_match=0 - apply TM to all identical strings, regardless of ID
        # apply_untranslated_strings_only=1 - don't apply TM to strings that already have translations
        # approve_translated=1 - auto-approve
        params="&method=tm&approve_translated=1&auto_approve_option={approve_option}&json&apply_untranslated_strings_only=1&perfect_match=0".format(
            approve_option=0 if approve_all else 1
        ),
    )

    r = requests.post(pretranslate_url, params=params)
    r.raise_for_status()
    logging.info("Crowdin: succeeded!")


"""
Upload translations
"""


def _translation_upload_ref(file_name, lang_object, locale_data_folder):
    source_path = utils.local_locale_path(lang_object, locale_data_folder)
    file_pointer = open(os.path.join(source_path, file_name), "rb")
    return ("files[{0}]".format(file_name), file_pointer)


def _upload_translation(branch, project, key, login, lang_object, locale_data_folder):

    if no_crowdin_branch(branch, get_crowdin_details(project, key, login)):
        logging.error("Branch '{}' not found.".format(branch))
        sys.exit(1)

    logging.info(
        "Crowdin: uploading translation files for '{}' to '{}'...".format(
            lang_object[utils.KEY_CROWDIN_CODE], branch
        )
    )
    url = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="upload-translation",
        params="&branch={branch}&language={language}&auto_approve_imported=1&import_duplicates=1&json".format(
            branch=branch, language=lang_object[utils.KEY_CROWDIN_CODE]
        ),
    )

    file_names = []
    for name in os.listdir(utils.local_locale_path(lang_object, locale_data_folder)):
        if is_string_file(name):
            file_names.append(name)

    for chunk in _chunks(file_names):
        references = [
            _translation_upload_ref(f, lang_object, locale_data_folder) for f in chunk
        ]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()

    logging.info("Crowdin: translation upload succeeded!")


@click.command(cls=CrowdinCommand)
@branch_argument
@locale_data_folder_option
def upload_translations(branch, project, key, login, locale_data_folder):
    """
    Upload translations to the given branch
    """
    available_languages = utils.available_languages(
        include_in_context=False, include_english=False
    )
    for lang_object in available_languages:
        _upload_translation(
            branch, project, key, login, lang_object, locale_data_folder
        )


"""
Download translations
"""


def _wipe_translations(locale_path):
    for file_name in os.listdir(locale_path):
        target = os.path.join(locale_path, file_name)
        if file_name != "en" and os.path.isdir(target):
            shutil.rmtree(target)


@click.command(cls=CrowdinCommand)
@branch_argument
@locale_data_folder_option
def download_translations(branch, project, key, login, locale_data_folder):
    """
    Download translations from the given branch
    """
    logging.info("Crowdin: downloading '{}'...".format(branch))

    # delete previous files
    _wipe_translations(locale_data_folder)

    DOWNLOAD_URL = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="download/all.zip",
        params="&branch={branch}&language={language}",
    )

    csv_dir_path = utils.local_locale_csv_path(locale_data_folder)
    for lang_object in utils.available_languages(include_in_context=True):
        code = lang_object[utils.KEY_CROWDIN_CODE]
        url = DOWNLOAD_URL.format(language=code, branch=branch)
        r = requests.get(url)
        r.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(r.content))
        logging.info("\tExtracting {} to {}".format(code, csv_dir_path))
        z.extractall(csv_dir_path)
        csv_locale_dir_path = os.path.join(csv_dir_path, lang_object["crowdin_code"])
        po_file = os.path.join(csv_locale_dir_path, "django.po")
        if os.path.exists(po_file):
            shutil.move(
                po_file, utils.local_locale_path(lang_object, locale_data_folder)
            )

    logging.info("Crowdin: download succeeded!")


"""
Glossary commands
"""


@click.command(cls=CrowdinCommand)
@locale_data_folder_option
def download_glossary(project, key, login, locale_data_folder):
    """
    Download glossary file
    """
    GLOSSARY_FILE = os.path.join(locale_data_folder, GLOSSARY_XML_FILE)
    logging.info("Crowdin: downloading glossary...")
    DOWNLOAD_GLOSSARY_URL = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="download-glossary",
        params="",
    )
    r = requests.get(DOWNLOAD_GLOSSARY_URL)
    r.raise_for_status()
    with io.open(GLOSSARY_FILE, mode="w", encoding="utf-8") as f:
        f.write(r.text)
    logging.info("Crowdin: download succeeded!")


@click.command(cls=CrowdinCommand)
@locale_data_folder_option
def upload_glossary(project, key, login, locale_data_folder):
    """
    Upload glossary file
    """
    logging.info("Crowdin: uploading glossary...")
    UPLOAD_GLOSSARY_URL = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="upload-glossary",
        params="",
    )
    GLOSSARY_FILE = os.path.join(locale_data_folder, GLOSSARY_XML_FILE)
    files = {"file": open(GLOSSARY_FILE, "rb")}
    r = requests.post(UPLOAD_GLOSSARY_URL, files=files)
    r.raise_for_status()
    logging.info("Crowdin: glossary upload succeeded!")


"""
Upload source files
"""


def _source_upload_ref(file_name, locale_data_folder):
    file_pointer = open(
        os.path.join(utils.local_locale_csv_source_path(locale_data_folder), file_name),
        "rb",
    )
    return ("files[{0}]".format(file_name), file_pointer)


def _chunks(files):
    # API can take only 20 files at a time
    files = list(files)
    MAX_FILES = 20
    for i in range(0, len(files), MAX_FILES):
        yield files[i : i + MAX_FILES]


def _modify(url, file_names, locale_data_folder):
    # split into multiple requests
    logging.info("Uploading {}".format(url))
    for chunk in _chunks(file_names):
        # generate the weird syntax and data structure required by crowdin + requests
        references = [
            _source_upload_ref(file_name, locale_data_folder) for file_name in chunk
        ]
        r = requests.post(url, files=references)
        r.raise_for_status()
        for ref in references:
            ref[1].close()


@click.command(cls=CrowdinCommand)
@branch_argument
@locale_data_folder_option
def upload_sources(branch, project, key, login, locale_data_folder):
    """
    Upload English source files to the given branch
    """
    logging.info("Crowdin: uploading sources for '{}'...".format(branch))
    details = get_crowdin_details(project, key, login)
    if no_crowdin_branch(branch, details):
        logging.info("\tcreating branch '{}'...".format(branch))
        ADD_BRANCH_URL = CROWDIN_API_URL.format(
            proj=project,
            key=key,
            username=login,
            cmd="add-directory",
            params="&name={branch}&is_branch=1&json".format(branch=branch),
        )
        r = requests.post(ADD_BRANCH_URL)
        r.raise_for_status()

    source_files = set(
        file_name
        for file_name in os.listdir(
            utils.local_locale_csv_source_path(locale_data_folder)
        )
        if is_string_file(file_name)
    )

    current_files = crowdin_files(branch, details)
    to_add = source_files.difference(current_files)
    to_update = source_files.intersection(current_files)

    if to_add:
        logging.info("\tAdd in '{}': {}".format(branch, ", ".join(to_add)))
        ADD_SOURCE_URL = CROWDIN_API_URL.format(
            proj=project,
            key=key,
            username=login,
            cmd="add-file",
            params="&branch={branch}&scheme=identifier,source_phrase,context,translation&json&first_line_contains_header&import_translations=0".format(
                branch=branch
            ),
        )
        _modify(ADD_SOURCE_URL, to_add, locale_data_folder)
    if to_update:
        logging.info("\tUpdate in '{}': {}".format(branch, ", ".join(to_update)))
        UPDATE_SOURCE_URL = CROWDIN_API_URL.format(
            proj=project,
            key=key,
            username=login,
            cmd="update-file",
            params="&branch={branch}&scheme=identifier,source_phrase,context,translation&json&first_line_contains_header&import_translations=0".format(
                branch=branch
            ),
        )
        _modify(UPDATE_SOURCE_URL, to_update)

    logging.info("Crowdin: source file upload succeeded!")


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


@click.command(cls=CrowdinCommand)
@branch_argument
def translation_stats(branch, project, key, login):
    """
    Print stats for the given branch
    """
    logging.info("Crowdin: getting details for '{}'...".format(branch))

    def _is_branch_node(node):
        return node["node_type"] == "branch" and node["name"] == branch

    needs_approval_table = []
    strings_total = 0
    untranslated_table = []
    words_total = 0

    sorted_languages = sorted(
        utils.available_languages(), key=lambda x: x[utils.KEY_ENG_NAME]
    )

    LANG_STATUS_URL = CROWDIN_API_URL.format(
        proj=project,
        key=key,
        username=login,
        cmd="language-status",
        params="&language={language}&json",
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
