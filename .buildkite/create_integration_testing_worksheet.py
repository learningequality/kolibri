"""
# Requirements:
    * Generate a service account key for your Google API credentials, then create environment variable GOOGLE_APPLICATION_CREDENTIALS.
        - e.g export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json.

# Environment Variable/s:
    * GOOGLE_APPLICATION_CREDENTIALS = Your service account key.
"""
import logging
import os
import time

import gspread
from oauth2client.service_account import ServiceAccountCredentials
from retrying import retry

logging.getLogger().setLevel(logging.INFO)

SPREADSHEET_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
SPREADSHEET_TEMPLATE_KEY = "1kVhg0evo9EV2aDo10KdIIjwqsoT4rISR7dJzf6s_-RM"
SPREADSHEET_TITLE = "Integration testing with Gherkin scenarios"

SHEET_TAG = os.getenv("BUILDKITE_TAG")
SHEET_TEMPLATE_FEATURES_COLUMN = 'B'
SHEET_INDEX = 0
SHEET_WRITE_LIMIT = 65
SHEET_TIME_RESET = 100

GIT_FEATURE_LINK = "https://github.com/learningequality/kolibri/blob/%s/integration_testing/features" \
    % (SHEET_TAG)

SCOPE = ['https://spreadsheets.google.com/feeds',
         'https://www.googleapis.com/auth/drive']

GOOGLE_ACCOUNT = gspread.authorize(ServiceAccountCredentials.from_json_keyfile_name(SPREADSHEET_CREDENTIALS, SCOPE))


@retry(wait_fixed=100000, stop_max_attempt_number=5)
def create_spreadsheet():
    return GOOGLE_ACCOUNT.copy(SPREADSHEET_TEMPLATE_KEY, title=SPREADSHEET_TITLE, copy_permissions=True)
    # return GOOGLE_ACCOUNT.open_by_key('1Gsek5b5k1GU6WlTDJOud9sVCYohgWu3DJ_psclpUius')


def get_feature_name(str_arg):
    str_name = str_arg.replace("-", " ").replace(".feature", " ").capitalize()
    return str_name.strip()


def get_role_name(str_arg):
    return str_arg.replace("-", " ").capitalize() + " scenarios"


def get_feature_dir_path():
    patent_path = os.path.dirname(os.getcwd())
    return patent_path + "/integration_testing/features/"


def get_worksheet_link(sheet_id, wks_id):
    sheet_domain = "https://docs.google.com/spreadsheets/d/"
    link_arg = "{0}{1}{2}{3}"
    final_link = link_arg.format(sheet_domain, sheet_id, "/edit#gid=", wks_id)
    logging.info('Here is the new integration testing worksheet %s' % final_link)


def check_file_exist(str_arg):
    return os.path.exists(str_arg)


def check_name(str_arg):
    """
    Check the role and feature file name.
    """
    if str_arg == "" or str_arg[0] == "#":
        return False
    return True


def check_sleep_counter(int_arg):
    """
    Check the Google api write api limits on the worksheet.
    """
    if int_arg >= SHEET_WRITE_LIMIT:
        time.sleep(SHEET_TIME_RESET)
        return True
    return False


@retry(wait_fixed=100000, stop_max_attempt_number=5)
def wks_insert_row(wks_arg, counter_arg):
    wks_arg.insert_row([], index=counter_arg)


@retry(wait_fixed=100000, stop_max_attempt_number=5)
def wks_update(wks_arg, cell_arg, val_arg):
    wks_arg.update_acell(cell_arg, val_arg)


def fetch_feature_files():
    feature_dir = get_feature_dir_path()
    spreadsheet = create_spreadsheet()
    worksheet = spreadsheet.get_worksheet(SHEET_INDEX)
    get_worksheet_link(spreadsheet.id, worksheet.id)
    order_name = "/ORDER.txt"
    role_order_path = feature_dir + order_name
    row_counter = 3
    sleep_counter = 0

    with open(role_order_path, 'r') as read_role:
        role_lines = read_role.readlines()
        for role in role_lines:
            role_file_name = role.strip()
            role_path = feature_dir + role_file_name + "/"
            role_order_path = role_path + order_name
            if check_name(role_file_name):
                with open(role_order_path, 'r') as read_feature:
                    feature_lines = read_feature.readlines()
                    row_counter += 3
                    current_role_cell = SHEET_TEMPLATE_FEATURES_COLUMN + str(row_counter)
                    role_cell_name = get_role_name(role_file_name)
                    if check_sleep_counter(sleep_counter):
                        sleep_counter = 0
                    wks_update(worksheet, current_role_cell, role_cell_name)
                    sleep_counter += 1
                    for feature in feature_lines:
                        feature_file_name = feature.strip()
                        feature_path = role_path + feature_file_name
                        if check_name(feature_file_name):
                            row_counter += 1
                            feature_name = get_feature_name(feature_file_name)
                            if check_sleep_counter(sleep_counter):
                                sleep_counter = 0
                            wks_insert_row(worksheet, row_counter)
                            sleep_counter += 1
                            cell_val = '=HYPERLINK("%s/%s/%s","%s")' % (GIT_FEATURE_LINK,
                                                                        role_file_name,
                                                                        feature_file_name,
                                                                        feature_name)
                            if not check_file_exist(feature_path):
                                cell_val = feature_name
                            current_feature_cell = SHEET_TEMPLATE_FEATURES_COLUMN + str(row_counter)
                            if check_sleep_counter(sleep_counter):
                                sleep_counter = 0
                            wks_update(worksheet, current_feature_cell, cell_val)
                            sleep_counter += 1
                            # logging.info('row_counter %s' % row_counter)
                read_feature.close()
    read_role.close()
    get_worksheet_link(spreadsheet.id, worksheet.id)


def main():
    fetch_feature_files()


if __name__ == "__main__":
    main()
