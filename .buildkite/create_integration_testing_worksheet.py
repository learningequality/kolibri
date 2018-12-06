"""
# Requirements:
    * Generate a service account key for your Google API credentials, then create environment variable GOOGLE_APPLICATION_CREDENTIALS.
        - e.g export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json.

# Environment Variable/s:
    * GOOGLE_APPLICATION_CREDENTIALS = Your service account key.
"""
import itertools
import os

import gspread
from oauth2client.service_account import ServiceAccountCredentials


SPREADSHEET_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
SPREADSHEET_FILE_KEY = os.getenv("WKS_FILE_KEY")

SHEET_TAG = os.getenv("BUILDKITE_TAG")
SHEET_TEMPLATE_FEATURES_COLUMN = 'B'
SHEET_TEMPLATE_INDEX = 0
SHEET_MAX_EMPTY_CELL = 20
SHEET_TEMPLATE_TAG = 'release-v0.11.x'

SCOPE = ['https://spreadsheets.google.com/feeds',
         'https://www.googleapis.com/auth/drive']


def copy_worksheet():
    google_account = gspread.authorize(ServiceAccountCredentials.from_json_keyfile_name(SPREADSHEET_CREDENTIALS, SCOPE))
    wks_open = google_account.open_by_key(SPREADSHEET_FILE_KEY)
    wks_id = wks_open.get_worksheet(SHEET_TEMPLATE_INDEX).id
    return wks_open.duplicate_sheet(wks_id, insert_sheet_index=1, new_sheet_id=None, new_sheet_name=SHEET_TAG)


def get_worksheet_link(wks_id):
    wks_domain = "https://docs.google.com/spreadsheets/d/"
    link_arrg = "{0}{1}{2}{3}"
    return link_arrg.format(wks_domain, SPREADSHEET_FILE_KEY, "/edit#gid=", wks_id)


def edit_new_worksheet():
    worksheet = copy_worksheet()
    print(worksheet.id)
    count_cell_empty = 0
    for count in itertools.count():
        current_cell = SHEET_TEMPLATE_FEATURES_COLUMN + str(count + 1)
        cell_value = worksheet.acell(current_cell, value_render_option='FORMULA').value
        edited_cell_value = cell_value.replace(SHEET_TEMPLATE_TAG, SHEET_TAG)
        if SHEET_TAG in edited_cell_value:
            count_cell_empty = 0
            worksheet.update_acell(current_cell, edited_cell_value)
        else:
            if not str(edited_cell_value):
                count_cell_empty += 1
            if count_cell_empty >= SHEET_MAX_EMPTY_CELL:
                break
    wks_link = get_worksheet_link(worksheet.id)
    print("Here's the new integration testing worksheet link =====>", wks_link)


def main():
    edit_new_worksheet()


if __name__ == "__main__":
    main()
