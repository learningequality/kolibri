"""
# Requirements:
    * Generate a service account key for your Google API credentials, then create environment variable GOOGLE_APPLICATION_CREDENTIALS.
        - e.g export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json.

# Environment Variable/s:
    * GOOGLE_APPLICATION_CREDENTIALS = Your service account key.
"""
import os

import gspread
from oauth2client.service_account import ServiceAccountCredentials


SPREADSHEET_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
SPREADSHEET_TEMPLATE_KEY = "1kVhg0evo9EV2aDo10KdIIjwqsoT4rISR7dJzf6s_-RM"
SPREADSHEET_TITLE = "Integration testing with Gherkin scenarios"

SHEET_TAG = os.getenv("BUILDKITE_TAG")
SHEET_TEMPLATE_FEATURES_COLUMN = 'B'
SHEET_INDEX = 0

GIT_FEATURE_LINK = "https://github.com/learningequality/kolibri/blob/%s/integration_testing/features" \
    % (SHEET_TAG)

SCOPE = ['https://spreadsheets.google.com/feeds',
         'https://www.googleapis.com/auth/drive']

GOOGLE_ACCOUNT = gspread.authorize(ServiceAccountCredentials.from_json_keyfile_name(SPREADSHEET_CREDENTIALS, SCOPE))


def create_spreadsheet():
    return GOOGLE_ACCOUNT.copy(SPREADSHEET_TEMPLATE_KEY, title=SPREADSHEET_TITLE, copy_permissions=True)


def get_worksheet_link(sheet_id, wks_id):
    wks_domain = "https://docs.google.com/spreadsheets/d/"
    link_arrg = "{0}{1}{2}{3}"
    return link_arrg.format(wks_domain, sheet_id, "/edit#gid=", wks_id)


def get_feature_name(str_arg):
    str_name = str_arg.replace("-", " ").replace(".feature", " ").capitalize()
    return str_name.strip()


def get_role_name(str_arg):
    return str_arg.replace("-", " ").capitalize() + " scenarios"


def get_feature_dir_path():
    patent_path = os.path.dirname(os.getcwd())
    return patent_path + "/integration_testing/features/"


def check_file_exist(str_arg):
    return os.path.exists(str_arg)


def check_name(str_arg1, str_arg2):
    if str_arg2 == "":
        return False
    elif check_file_exist(str_arg1) and str_arg2[0] != "#":
        return True
    return False


def fetch_feature_files():

    feature_dir = get_feature_dir_path()
    spreadsheet = create_spreadsheet()
    worksheet = spreadsheet.get_worksheet(SHEET_INDEX)
    order_name = "/ORDER.txt"
    role_order_path = feature_dir + order_name
    counter = 3
    with open(role_order_path, 'r') as read_role:
        role_lines = read_role.readlines()
        for role in role_lines:
            role_file_name = role.strip()
            role_path = feature_dir + role_file_name + "/"
            role_order_path = role_path + order_name
            if check_name(role_order_path, role_file_name):
                with open(role_order_path, 'r') as read_feature:
                    feature_lines = read_feature.readlines()
                    counter += 3
                    current_role_cell = SHEET_TEMPLATE_FEATURES_COLUMN + str(counter)
                    role_cell_name = get_role_name(role_file_name)
                    worksheet.update_acell(current_role_cell, role_cell_name)
                    for feature in feature_lines:
                        feature_file_name = feature.strip()
                        feature_path = role_path + feature_file_name
                        if check_name(feature_path, feature_file_name):
                            counter += 1
                            feature_name = get_feature_name(feature_file_name)
                            cell_val = '=HYPERLINK("%s/%s/%s","%s")' % (GIT_FEATURE_LINK,
                                                                        role_file_name, feature_file_name,
                                                                        feature_name)
                            worksheet.insert_row([], index=counter)
                            current_feature_cell = SHEET_TEMPLATE_FEATURES_COLUMN + str(counter)
                            worksheet.update_acell(current_feature_cell, cell_val)
                read_feature.close()
    read_role.close()

    print("Here's the new integration testing worksheet =====>", get_worksheet_link(spreadsheet.id, worksheet.id))


def main():
    fetch_feature_files()


if __name__ == "__main__":
    main()
