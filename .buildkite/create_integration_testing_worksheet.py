"""
# Requirements:
    * Generate a service account key for your Google API credentials, then create environment variable GOOGLE_SPREADSHEET_CREDENTIALS.
        - e.g export GOOGLE_SPREADSHEET_CREDENTIALS=/path/to/credentials.json.

# Environment Variable/s:
    * GOOGLE_SPREADSHEET_CREDENTIALS = Your service account key.
"""
import logging
import os
import sys

import gspread
from gspread.urls import DRIVE_FILES_API_V2_URL
from oauth2client.service_account import ServiceAccountCredentials

logging.getLogger().setLevel(logging.INFO)

SPREADSHEET_CREDENTIALS = os.getenv("GOOGLE_SPREADSHEET_CREDENTIALS")
SPREADSHEET_TPL_KEY = "1kVhg0evo9EV2aDo10KdIIjwqsoT4rISR7dJzf6s_-RM"
SPREADSHEET_TITLE = "Integration testing with Gherkin scenarios"

# Use to get the Kolibri version, for the integration testing spreadsheet
SHEET_TAG = os.getenv("BUILDKITE_TAG")
SHEET_TPL_COLUMN = "B"
SHEET_TPL_START_VALUE = 5
SHEET_INDEX = 0

# Path of all the spreadsheets created by this script.
SHEET_PARENT_CONTAINER_ID = os.getenv("GOOGLE_DRIVE_SPREADSHEETS")

CELL_VALUE_SEPARATOR = "end_feature_index"

if SHEET_PARENT_CONTAINER_ID == "" or SHEET_PARENT_CONTAINER_ID is None:
    SHEET_PARENT_CONTAINER_ID = "10bMsasxKvpi_9U1NU9rq7YBnFBiCkYrc"

if SHEET_TAG == "" or SHEET_TAG is None:
    buildkite_branch = os.getenv("BUILDKITE_PULL_REQUEST_BASE_BRANCH")
    if buildkite_branch != "" or buildkite_branch is not None:
        SHEET_TAG = buildkite_branch
    else:
        SHEET_TAG = "develop"

if SPREADSHEET_CREDENTIALS == "" or SPREADSHEET_CREDENTIALS is None:
    logging.info("Spreadsheet credentials not exist")
    sys.exit()

GIT_FEATURE_LINK = (
    "https://github.com/learningequality/kolibri/blob/%s/integration_testing/features"
    % (SHEET_TAG)
)

SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

G_ACCESS = gspread.authorize(
    ServiceAccountCredentials.from_json_keyfile_name(SPREADSHEET_CREDENTIALS, SCOPE)
)


def get_feature_name(str_arg):
    str_name = str_arg.replace("-", " ").replace(".feature", " ").capitalize()
    return str_name.strip()


def get_role_name(str_arg):
    return str_arg.replace("-", " ").capitalize() + " scenarios"


def get_kolibri_path():
    dir_name = os.path.dirname
    parent_path = dir_name(dir_name(os.path.abspath(__file__)))
    return parent_path


def get_feature_dir_path():
    return get_kolibri_path() + "/integration_testing/features/"


def get_worksheet_link(sheet_id, wks_id):
    sheet_domain = "https://docs.google.com/spreadsheets/d/"
    link_arg = "{0}{1}{2}{3}"
    final_link = link_arg.format(sheet_domain, sheet_id, "/edit#gid=", wks_id)
    logging.info("Here is the new integration testing worksheet %s" % final_link)
    return final_link


def check_file_exist(str_arg):
    return os.path.exists(str_arg)


def check_name(str_arg):
    """
    Check the role and feature file name.
    """
    if str_arg == "" or str_arg[0] == "#":
        return False
    return True


def create_artifact(str_arg):
    buidkite_path = get_kolibri_path() + "/.buildkite/"
    txt_path = buidkite_path + "spreadsheet-link.txt"
    file = open(txt_path, "w")
    file.write(str_arg)
    file.close()


def fetch_feature_files():
    """
        Fetch all the .features scenarios at the Integration testing directory
        The order of the scenarios at the spreadsheet will based on the ORDER.txt
        This will return a list and a count of .features scenarios
    """
    feature_dir = get_feature_dir_path()
    order_name = "/ORDER.txt"
    order_txt_path = feature_dir + order_name
    sheet_contents = []
    sheet_cell_count = []
    counter = 0
    with open(order_txt_path, "r") as read_txt:
        txt_lines = read_txt.readlines()
        for line in txt_lines:
            file_name = line.strip()
            role_path = feature_dir + file_name + "/"
            order_txt_path = role_path + order_name
            if check_name(file_name):
                with open(order_txt_path, "r") as read_feature:
                    feature_lines = read_feature.readlines()
                    role_cell_name = get_role_name(file_name)

                    sheet_contents.append(CELL_VALUE_SEPARATOR)
                    sheet_contents.append(role_cell_name)
                    counter += 1
                    for feature in feature_lines:
                        feature_file_name = feature.strip()
                        feature_path = role_path + feature_file_name
                        if check_name(feature_file_name):
                            feature_name = get_feature_name(feature_file_name)
                            cell_val = '=HYPERLINK("%s/%s/%s","%s")' % (
                                GIT_FEATURE_LINK,
                                file_name,
                                feature_file_name,
                                feature_name,
                            )
                            if not check_file_exist(feature_path):
                                cell_val = feature_name
                            sheet_contents.append(cell_val)
                            counter += 1
                    sheet_cell_count.append(counter)
                    counter = 0
                read_feature.close()
    read_txt.close()
    return sheet_cell_count, sheet_contents


def sheet_insert_rows(sheet, wrk_sheet, start_index=0, end_index=0):
    """
        REF: https://github.com/burnash/gspread
        I reuse the gspread function to make this API request.
    """
    body = {
        "requests": [
            {
                "insertDimension": {
                    "range": {
                        "sheetId": wrk_sheet.id,
                        "dimension": "ROWS",
                        "startIndex": start_index,
                        "endIndex": end_index,
                    }
                }
            }
        ]
    }
    sheet.batch_update(body)


def rename_worksheet(sheet, wrk_sheet, sheet_name):
    """
        REF: https://github.com/burnash/gspread
        I reuse the gspread function to make this API request.
    """
    body = {
        "requests": [
            {
                "updateSheetProperties": {
                    "properties": {"sheetId": wrk_sheet.id, "title": SHEET_TAG},
                    "fields": "title",
                }
            }
        ]
    }
    sheet.batch_update(body)


def search_file_name(file_name):
    """
        REF: https://github.com/burnash/gspread
        I reuse the gspread function to make this API request.
    """
    self = G_ACCESS
    files = []
    page_token = ""
    url = "https://www.googleapis.com/drive/v3/files"
    search = "name='{0}'".format(file_name)
    params = {
        "q": search,
        "pageSize": 1000,
        "supportsTeamDrives": True,
        "includeTeamDriveItems": True,
    }

    while page_token is not None:
        if page_token:
            params["pageToken"] = page_token

        res = self.request("get", url, params=params).json()
        files.extend(res["files"])
        page_token = res.get("nextPageToken", None)
    return files


def create_sheet_container(file_id, dir_name):
    """
        REF: https://github.com/burnash/gspread
        I reuse the gspread function to make this API request.
    """
    self = G_ACCESS
    payload = {
        "title": dir_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [{"kind": "drive#childList", "id": file_id}],
    }
    r = self.request("post", DRIVE_FILES_API_V2_URL, json=payload)
    return r.json()["id"]


def sheet_copy(file_id, dist_id, title=None, copy_permissions=False):
    """
        REF: https://github.com/burnash/gspread
        I reuse the gspread function to make this request.
    """
    self = G_ACCESS

    url = "{0}/{1}/copy".format(DRIVE_FILES_API_V2_URL, file_id)

    payload = {
        "title": title,
        "mimeType": "application/vnd.google-apps.spreadsheet",
        "parents": [{"kind": "drive#childList", "id": dist_id}],
    }
    r = self.request("post", url, json=payload)
    spreadsheet_id = r.json()["id"]

    new_spreadsheet = self.open_by_key(spreadsheet_id)

    if copy_permissions:
        original = self.open_by_key(file_id)

        permissions = original.list_permissions()
        for p in permissions:
            if p.get("deleted"):
                continue
            try:
                new_spreadsheet.share(
                    value=p["emailAddress"],
                    perm_type=p["type"],
                    role=p["role"],
                    notify=False,
                )
            except Exception:
                pass
    return new_spreadsheet


def sheet_container():
    """
        Return the spreadsheet container ID.
    """
    drive_search = search_file_name(SHEET_TAG)
    if len(drive_search) == 0:
        dist_folder = SHEET_PARENT_CONTAINER_ID
        dir_id = create_sheet_container(dist_folder, SHEET_TAG)
        return dir_id
    return drive_search[0]["id"]


def create_spreadsheet():
    spreadsheet = sheet_copy(
        SPREADSHEET_TPL_KEY,
        sheet_container(),
        title=SPREADSHEET_TITLE,
        copy_permissions=True,
    )
    worksheet = spreadsheet.get_worksheet(SHEET_INDEX)
    feature_cells, feature_contents = fetch_feature_files()

    role_counter = 0
    end_index_counter = 0
    for row in feature_cells:
        sheet_start_value = SHEET_TPL_START_VALUE + 1
        row = row - 2
        start_index = end_index_counter
        end_index = end_index_counter + row
        if role_counter == 0:
            start_index = sheet_start_value
            end_index = row + sheet_start_value
        # Create a cell container for each feature scenarios at the spreadsheet.
        sheet_insert_rows(spreadsheet, worksheet, start_index, end_index)
        end_index_counter = end_index + 3
        role_counter += 1

    cell_range = (
        SHEET_TPL_COLUMN
        + str(SHEET_TPL_START_VALUE)
        + ":"
        + SHEET_TPL_COLUMN
        + str(SHEET_TPL_START_VALUE + len(feature_contents))
    )
    cell_list = worksheet.range(cell_range)
    cell_counter = 0
    for cell in cell_list:
        try:
            feature_val = feature_contents[cell_counter]
            if not feature_val == CELL_VALUE_SEPARATOR:
                cell.value = feature_val
            cell_counter += 1
        except Exception:
            pass
    # Insert all the feature scenarios at the spreadsheet.
    worksheet.update_cells(cell_list, "USER_ENTERED")
    template_name = SHEET_TAG + " base template"
    spreadsheet.duplicate_sheet(
        worksheet.id,
        insert_sheet_index=None,
        new_sheet_id=None,
        new_sheet_name=template_name,
    )
    rename_worksheet(spreadsheet, worksheet, SHEET_TAG)
    sheet_link = get_worksheet_link(spreadsheet.id, worksheet.id)
    create_artifact(sheet_link)


def main():
    create_spreadsheet()


if __name__ == "__main__":
    main()
