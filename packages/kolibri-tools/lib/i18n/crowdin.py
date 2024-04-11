import glob
import io
import logging
import os
import shutil
import sys
import tempfile
import time
import zipfile
from contextlib import contextmanager

from utils import available_languages
from utils import install_requirement
from utils import KEY_CROWDIN_CODE
from utils import local_locale_path
from utils import local_locale_source_path
from utils import read_config_file

try:
    import click
except ImportError:
    install_requirement("click==7.0")
    import click

try:
    import requests
except ImportError:
    install_requirement("requests")
    import requests

crowdin_version = "1.8.0"

try:
    import crowdin_api  # noqa

    if getattr(crowdin_api, "__version__") != crowdin_version:
        raise ImportError
except ImportError:
    install_requirement("crowdin-api-client=={}".format(crowdin_version))

from crowdin_api import CrowdinClient  # noqa E402
from crowdin_api.exceptions import APIException  # noqa E402

logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
logging.StreamHandler(sys.stdout)


@contextmanager
def handle_api_exception(contextual_message=""):
    """
    Context manager to add contextual messages to tell us what kind of API request failed
    and raise the error as a ClickException.
    """
    contextual_message = (
        contextual_message + ": " if contextual_message else contextual_message
    )
    try:
        yield
    except APIException as e:
        raise click.ClickException(contextual_message + str(e))


crowdin_client = CrowdinClient()


def verify_project(project_name):
    """
    Check to see if the project_name exists then get its ID and return it as we
    need that ID for the actual API requests.
    """

    with handle_api_exception("Listing projects"):
        # Fetch all projects
        list_projects_response = (
            crowdin_client.projects.with_fetch_all().list_projects()
        )
    projects = list_projects_response["data"]

    # Find the first project that matches the project_name
    found_project = next(
        (b for b in projects if b["data"]["identifier"] == project_name), None
    )

    if found_project:
        project_id = found_project["data"]["id"]
        logging.info(
            "Project '{}' found on Crowdin with ID '{}'".format(
                found_project["data"]["name"], project_id
            )
        )
        # Return a dict with the project name and id
        return {"name": project_name, "id": project_id}
    else:
        raise ValueError("Project does not exist")


def verify_branch(project_id, branch_name):
    """
    Check to see if the branch_name exists for the project - then get it's ID and return it as we
    need that ID for the actual API rquests.

    If the branch does not exist, we prompt the user asking if they want to make a new one with the
    given name - if so, we then create it and return it's ID, letting the user know in any case how
    it went
    """
    with handle_api_exception("Listing branches:"):
        list_branches_response = (
            crowdin_client.source_files.with_fetch_all().list_project_branches(
                project_id
            )
        )
    branches = list_branches_response["data"]

    found_branch = next((b for b in branches if b["data"]["name"] == branch_name), {})

    if found_branch.get("data", {}).get("id"):
        branch_id = found_branch["data"]["id"]
        logging.info(
            "Branch '{}' found on Crowdin with ID '{}'".format(
                found_branch["data"]["name"], branch_id
            )
        )
        return {"name": branch_name, "id": branch_id}
    else:
        if click.confirm(
            "Branch {} was not found. Would you like to create that branch?".format(
                branch_name
            )
        ):
            response = crowdin_client.source_files.add_branch(project_id, branch_name)
            branch_id = response["data"]["id"]
            logging.info(
                "Branch {} created. Branch ID: {}".format(branch_name, branch_id)
            )
            return {"name": branch_name, "id": branch_id}
        else:
            raise ValueError("Branch does not exist")


def list_files(project_id, branch_id):
    """
    List all Source Files for a given branch
    """
    with handle_api_exception("Listing files"):
        response = crowdin_client.source_files.with_fetch_all().list_files(
            project_id, branch_id
        )
    return response["data"]


def add_to_storage(filepath):
    """
    If the file exists, will add it to Storage and return the response for the created "storage".
    https://developer.crowdin.com/api/v2/#tag/Storage
    """
    try:
        with open(filepath, "rb") as file, handle_api_exception("Adding to storage"):
            return crowdin_client.storages.add_storage(file)["data"]["id"]
    except FileNotFoundError:
        raise click.ClickException(
            "Tried to add storage for file {} that does not exist locally.".format(
                filepath
            )
        )


def validate_project(ctx, param, value):
    try:
        return verify_project(value)
    except ValueError:
        raise click.BadParameter("Project is not valid")


# crowdin project name
project_option = click.Option(
    param_decls=["--project"],
    envvar="CROWDIN_PROJECT",
    help="Set the Crowdin Project",
    prompt="Crowdin Project name",
    callback=validate_project,
    is_eager=True,
    required=True,
)


def set_key(ctx, param, value):
    # To set the API token we just set it globally on the crowdin API client.
    crowdin_client.TOKEN = value
    return value


key_option = click.Option(
    param_decls=["--key"],
    envvar="CROWDIN_API_KEY",
    help="Set the Crowdin API key",
    prompt="Crowdin API key",
    expose_value=False,
    is_eager=True,
    callback=set_key,
    required=True,
)


def validate_branch(ctx, param, value):
    try:
        return verify_branch(ctx.params["project"]["id"], value)
    except ValueError:
        raise click.BadParameter("Branch is not valid")


branch_argument = click.argument(
    "branch",
    callback=validate_branch,
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
        # Add in the default key option and project option to ensure that
        # it is set on every command without having to manually specify it.
        kwargs["params"] = [key_option, project_option] + (
            kwargs["params"] if "params" in kwargs else []
        )
        context_settings = kwargs.get("context_settings", {})
        default_map = context_settings.get("default_map", {})
        # Read in any configuration file information into the default map
        # this means that explicit command line args will overwrite these defaults
        # but otherwise the configuration file options will be used.
        default_map.update(read_config_file())
        context_settings["default_map"] = default_map
        kwargs["context_settings"] = context_settings
        super(CrowdinCommand, self).__init__(*args, **kwargs)


"""
Rebuild
"""


def _rebuild_translations(branch, project):
    """
    Trigger a build of the translations on Crowdin, but do not download them yet.
    This can take some time to run and will return a Build ID which can be passed to the
    check_build_status function.
    """
    logging.info(
        "Initiating rebuild of project {} branch {}".format(
            project["name"], branch["name"]
        )
    )
    with handle_api_exception("Rebuilding translations"):
        response = crowdin_client.translations.build_project_translation(
            project["id"], {"branchId": branch["id"]}
        )

    build_id = response.get("data", {}).get("id")

    logging.info("Project rebuild started successfully. Build ID# {}".format(build_id))

    return build_id


@click.command(cls=CrowdinCommand)
@branch_argument
def rebuild_translations(branch, project):
    _rebuild_translations(branch, project)


"""
Pre-translate command
"""


@click.command(cls=CrowdinCommand)
@branch_argument
@click.option(
    "--approve-all",
    is_flag=True,
    default=False,
    help="Automatically approve all string matches (default False)",
)
def pretranslate(branch, project, approve_all=False):
    """
    Apply pre-translation to the given branch
    auto-approve only those with exact ID matches
    """
    logging.info(
        "Initiating pre-translation for Project: {}, Branch: {}{}".format(
            project["name"],
            branch["name"],
            " - **approving all**" if approve_all else "",
        )
    )
    file_ids = [file["data"]["id"] for file in list_files(project["id"], branch["id"])]
    body = {"fileIds": file_ids}

    if approve_all:
        body.update({"autoApproveOption": "all"})

    with handle_api_exception("Pretranslating"):
        response = crowdin_client.translations.apply_pre_translation(
            project["id"], body
        )
    logging.info(response["data"])


"""
Download translations
"""


@click.command(cls=CrowdinCommand)
@branch_argument
@locale_data_folder_option
def download_translations(branch, project, locale_data_folder):
    """
    Download translations from the given branch
    """
    logging.info("Crowdin: downloading '{}'.".format(branch["name"]))

    # Get all the builds for this branch
    with handle_api_exception("Listing builds"):
        builds_response = crowdin_client.translations.list_project_builds(
            project["id"], branch["id"], limit=500
        )

    # Look for the most recent build
    sorted_builds = sorted(
        builds_response["data"], key=lambda x: x["data"]["createdAt"], reverse=True
    )

    if not sorted_builds:
        # If there isn't one, then force a rebuild now.
        build_id = _rebuild_translations(branch, project)
    else:
        build_id = sorted_builds[0]["data"]["id"]

    # Assume the build has not finished and ensure that it has finished before continuing
    finished = False
    while not finished:
        with handle_api_exception("Checking build status"):
            status_response = crowdin_client.translations.check_project_build_status(
                project["id"], build_id
            )
        finished = status_response["data"]["status"] == "finished"
        if not finished:
            # Don't bother waiting if we've already finished
            time.sleep(5)

    with handle_api_exception("Getting translations download URL"):
        response = crowdin_client.translations.download_project_translations(
            project["id"], build_id
        )

    download_url = response["data"]["url"]
    logging.info("Dowload URL: {}".format(download_url))
    expiry = response["data"]["expireIn"]
    logging.info("Expires at: {}".format(expiry.isoformat()))

    zip_dir = tempfile.mkdtemp()

    r = requests.get(download_url)
    r.raise_for_status()
    z = zipfile.ZipFile(io.BytesIO(r.content))
    z.extractall(zip_dir)

    for lang_object in available_languages(include_in_context=True):
        code = lang_object[KEY_CROWDIN_CODE]
        locale_dir_path = local_locale_path(lang_object, locale_data_folder)
        logging.info("\tExtracting {} to {}".format(code, locale_dir_path))

        csv_files = glob.glob(os.path.join(locale_dir_path, "*.csv"))
        for csv_file in csv_files:
            os.remove(csv_file)

        MESSAGES = os.path.join(zip_dir, code)
        if os.path.exists(MESSAGES):
            for msg_file in os.listdir(MESSAGES):
                shutil.move(
                    os.path.join(MESSAGES, msg_file),
                    os.path.join(locale_dir_path, msg_file),
                )

    shutil.rmtree(zip_dir, ignore_errors=True)

    logging.info("Crowdin: download succeeded!")


"""
Glossary commands
"""

GLOSSARY_XML_FILE = "glossary.tbx"


def _get_glossary_id(project):
    # Currently we only support handling a single glossary file for a project
    with handle_api_exception("Listing glossaries"):
        glossaries_response = (
            crowdin_client.glossaries.with_fetch_all().list_glossaries()
        )

    glossary = next(
        filter(
            lambda x: x["data"]["defaultProjectId"] == project["id"],
            glossaries_response["data"],
        ),
        None,
    )

    if not glossary:
        raise click.ClickException(
            "Project {} does not have an associated glossary".format(project["name"])
        )

    return glossary["data"]["id"]


@click.command(cls=CrowdinCommand)
@locale_data_folder_option
def download_glossary(project, locale_data_folder):
    """
    Download glossary file
    """
    file_format = "tbx"

    logging.info("Downloading glossary in {} format.".format(file_format))

    glossary_id = _get_glossary_id(project)

    logging.info("Starting an export of the glossary. This may take a minute.")
    with handle_api_exception("Starting glossary export"):
        # Start a request to export a glossary file.
        response = crowdin_client.glossaries.export_glossary(glossary_id, file_format)
    export_id = response["data"]["identifier"]
    export_status = None
    # Wait for the glossary export
    time.sleep(5)
    while export_status != "finished":
        # Check on the status of the glossary export
        with handle_api_exception("Checking glossary export status"):
            response = crowdin_client.glossaries.check_glossary_export_status(
                glossary_id, export_id
            )
        export_status = response["data"]["status"]
        logging.info("Current export status: {}".format(export_status))
        if export_status != "finished":
            logging.info("Export not finished, trying again in 5 seconds.")
            time.sleep(5)

    logging.info("Export finished! Fetching the download URL.")
    with handle_api_exception("Fetching glossary download URL"):
        # Get the download URL for the exported glossary.
        response = crowdin_client.glossaries.download_glossary(glossary_id, export_id)
    download_url = response["data"]["url"]
    r = requests.get(download_url)
    r.raise_for_status()
    GLOSSARY_FILE = os.path.join(locale_data_folder, GLOSSARY_XML_FILE)
    with io.open(GLOSSARY_FILE, mode="w", encoding="utf-8") as f:
        f.write(r.text)
    logging.info("Crowdin: download succeeded!")


@click.command(cls=CrowdinCommand)
@locale_data_folder_option
def upload_glossary(project, locale_data_folder):
    """
    Upload glossary file
    """
    glossary_id = _get_glossary_id(project)

    GLOSSARY_FILE = os.path.join(locale_data_folder, GLOSSARY_XML_FILE)
    logging.info("Uploading {} to storage.".format(GLOSSARY_FILE))
    # Upload the glossary file to Crowdin's storage
    storage_id = add_to_storage(GLOSSARY_FILE)

    logging.info("Beginning import process.")
    with handle_api_exception("Starting glossary import"):
        # Import the glossary file from Crowdin's storage and set as the glossary
        response = crowdin_client.glossaries.import_glossary(glossary_id, storage_id)
    import_id = response["data"]["identifier"]

    import_status = None
    time.sleep(5)
    # Wait for the import to be complete
    while import_status != "finished":
        with handle_api_exception("Checking glossary import status"):
            response = crowdin_client.glossaries.check_glossary_import_status(
                glossary_id, import_id
            )
        import_status = response["data"]["status"]
        logging.info("Current import status: {}".format(import_status))
        if import_status != "finished":
            logging.info("Still importing, will check again in 5 seconds.")
            time.sleep(5)

    logging.info("Imported successfully!")


"""
Upload source files
"""


def is_string_file(file_name):
    """
    Predicate function returning True if the file matches the naming format for our message files
    """
    return file_name.endswith(".po") or file_name.endswith("-messages.csv")


@click.command(cls=CrowdinCommand)
@branch_argument
@locale_data_folder_option
def upload_sources(branch, project, locale_data_folder):
    """
    Upload English source files to the given branch
    """
    logging.info("Crowdin: uploading sources for '{}'.".format(branch["name"]))
    source_path = local_locale_source_path(locale_data_folder)
    source_files = {
        file_name for file_name in os.listdir(source_path) if is_string_file(file_name)
    }
    logging.info("Found {} source files to upload.".format(len(source_files)))

    # Make a lookup dict of file name to the file data for all the files
    # currently on crowdin.
    crowdin_files = {
        file["data"]["name"]: file["data"]
        for file in list_files(project["id"], branch["id"])
    }

    importOptions = {
        "firstLineContainsHeader": True,
        "scheme": {
            "identifier": 0,
            "sourcePhrase": 1,
            "context": 2,
            "translation": 3,
        },
    }

    for file_name in source_files:
        # For each file we have to upload, add to Crowdin's storage
        storage_id = add_to_storage(os.path.join(source_path, file_name))
        # If this specific CSV file already exists on Crowdin
        if file_name in crowdin_files:
            # Get the id for this file name on Crowdin
            file_id = crowdin_files[file_name]["id"]
            with handle_api_exception("Updating source file"):
                # Update that file to point to the new storage id
                crowdin_client.source_files.update_file(
                    project["id"],
                    file_id,
                    storage_id,
                    importOptions=importOptions,
                )
            logging.info("Updated file {} with id {}".format(file_name, file_id))
        else:
            with handle_api_exception("Adding new source file"):
                # Otherwise just add a new file with the file name to this branch
                crowdin_client.source_files.add_file(
                    project["id"],
                    storage_id,
                    file_name,
                    branch["id"],
                    importOptions=importOptions,
                )
            logging.info("Uploaded new file {}".format(file_name))


def _all_screenshots(project):
    screenshot_response = crowdin_client.screenshots.with_fetch_all().list_screenshots(
        project["id"]
    )
    for sc in screenshot_response["data"]:
        yield sc["data"]


def _source_strings(project, branch):
    source_string_response = (
        crowdin_client.source_strings.with_fetch_all().list_strings(
            project["id"], branchId=branch["id"]
        )
    )
    for string in source_string_response["data"]:
        yield string["data"]


@click.command(cls=CrowdinCommand)
@branch_argument
def screenshot_report(branch, project):
    """
    Make a QA report for screenshots
    """
    # Make a lookup dict of Crowdin string id to data about the string
    string_lookup = {
        string["id"]: string for string in _source_strings(project, branch)
    }
    html = "<html><body>"
    html += """
    <style>
        table,
        td {
            border: 1px solid #333;
        }
        thead,
        {
            font-weight: bold;
        }
    </style>
    """
    html += "<table><thead><tr><th>Screenshot</th><th>English String</th><th>String Identifier</th></tr></thead>"
    # Loop through all the screenshots on Crowdin
    for sc in _all_screenshots(project):
        # Loop through each tag on the screenshot
        for tag in sc["tags"]:
            try:
                # If it's a tag for the branch we're interested in,
                # it will be in our string_lookup
                string = string_lookup[tag["stringId"]]
                # Create a table row with the inlined image,
                # source string text, and string id.
                # Also add a link to the string on Crowdin so that the screenshot
                # can be updated.
                html += """
                    <tr>
                        <td><img style="max-width: 600px;" src="{url}" /></td>
                        <td>{text}</td>
                        <td><a href="https://crowdin.com/translate/{project}/all/en-es?filter=basic&value=0#{crowdinId}">{messageId}</a></td>
                        </tr>
                    """.format(
                    url=sc["url"],
                    project=project["name"],
                    crowdinId=string["id"],
                    messageId=string["identifier"],
                    text=string["text"],
                )
            except KeyError:
                pass
    html += "</table></body></html>"
    filename = "screenshot_report_{}.html".format(branch["name"])
    with open(filename, "w") as f:
        f.write(html)

    logging.info("Screenshot report written to {}".format(filename))


def _normalize_position(position, size):
    """
    Helper function to ensure the position object does not exceed the size
    of the screenshot.
    """
    # Position can be None, so just return that as is.
    if not position:
        return position
    height = min(position["height"], size["height"] - position["y"])
    width = min(position["width"], size["width"] - position["x"])
    return {
        "height": height,
        "width": width,
        "x": position["x"],
        "y": position["y"],
    }


@click.command(cls=CrowdinCommand)
@branch_argument
@click.argument(
    "source_branch",
    callback=validate_branch,
    required=True,
)
def transfer_screenshots(branch, project, source_branch):
    """
    Transfer screenshots from source_branch to branch
    """
    if branch["id"] == source_branch["id"]:
        raise click.ClickException(
            "Must specify different branches to copy screenshots"
        )

    # Make a lookup dict of Crowdin string id to data about the string for the source branch
    source_branch_string_lookup = {
        string["id"]: string for string in _source_strings(project, source_branch)
    }

    # Make a lookup dict from our message ids to data about the strings for the target branch
    target_branch_string_lookup = {
        string["identifier"]: string for string in _source_strings(project, branch)
    }
    transferred = 0
    # Loop through all the screenshots on Crowdin
    for sc in _all_screenshots(project):
        new_tags = []
        size = sc["size"]
        current_string_ids = {tag["stringId"] for tag in sc["tags"]}
        # Loop through each tag on the screenshot
        for tag in sc["tags"]:
            try:
                # If it's a tag for the source branch we're interested in,
                # it will be in our string_lookup
                string = source_branch_string_lookup[tag["stringId"]]
                # Get the message identifier to match it up with strings on our target branch
                message_id = string["identifier"]
                target_branch_string = target_branch_string_lookup[message_id]
                if target_branch_string["id"] not in current_string_ids:
                    # If not already tagged to this screenshot
                    # Create a new tag with the stringId for the target branch
                    # and copy the position information from the source branch
                    new_tags.append(
                        {
                            "stringId": target_branch_string["id"],
                            "position": _normalize_position(tag["position"], size),
                        }
                    )
            except KeyError:
                pass
        if new_tags:
            with handle_api_exception("Adding screenshot to string"):
                # Create all the new tags for this particular screenshot at once.
                crowdin_client.screenshots.add_tag(project["id"], sc["id"], new_tags)
                transferred += len(new_tags)

    logging.info(
        "Transferred {} screenshots from {} to {}".format(
            transferred, source_branch["name"], branch["name"]
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
main.add_command(upload_sources)
main.add_command(download_glossary)
main.add_command(upload_glossary)
main.add_command(screenshot_report)
main.add_command(transfer_screenshots)

if __name__ == "__main__":
    main()
