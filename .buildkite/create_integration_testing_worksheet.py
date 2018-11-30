"""
# Requirements:
    * Generate a service account key for your Google API credentials, then create environment variable GOOGLE_APPLICATION_CREDENTIALS.
        - e.g export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json.

# Environment Variable/s:
    * GOOGLE_APPLICATION_CREDENTIALS = Your service account key.
"""

from oauth2client.service_account import ServiceAccountCredentials
import gspread
import os


WKS_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
WKS_TAG = os.getenv("BUILDKITE_TAG")

WKS_TEMPLATE_TAG = 'release-v0.11.x'
WKS_NAME = "Integration testing with Gherkin scenarios"
WKS_INDEX_COPY = 0
WKS_CELLS_RANGE = 100
WKS_COLUMN = 'B'

SCOPE = ['https://spreadsheets.google.com/feeds',
         'https://www.googleapis.com/auth/drive']


def copy_worksheet():
	google_account = gspread.authorize(ServiceAccountCredentials.from_json_keyfile_name(WKS_CREDENTIALS, SCOPE))
	wks = google_account.open(WKS_NAME)
	wks_id = wks.get_worksheet(WKS_INDEX_COPY).id
	return wks.duplicate_sheet(wks_id, insert_sheet_index=1, new_sheet_id=None, new_sheet_name=WKS_TAG)

def edit_new_worksheet():
	worksheet = copy_worksheet()
	for count in range(WKS_CELLS_RANGE):
		current_wks = WKS_COLUMN + str(count+1)
		val = worksheet.acell(current_wks, value_render_option='FORMULA').value
		final_value = val.replace(WKS_TEMPLATE_TAG, WKS_TAG)
		if str(final_value):
			worksheet.update_acell(current_wks, final_value)

def main():
    edit_new_worksheet()


if __name__ == "__main__":
    main()
