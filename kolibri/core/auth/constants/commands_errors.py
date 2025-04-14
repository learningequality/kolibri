from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy

# Error messages ###
# TODO: Consolidate with error constants and messages in bulkimportusers.py
INVALID = 2
NO_FACILITY = 7
FILE_WRITE_ERROR = 9

MESSAGES = {
    INVALID: pgettext_lazy(
        "Error report message when the cell contains an improper data format.",
        "Content of cell '{}' is not valid",
    ),
    NO_FACILITY: _(
        "No default facility exists. Make sure to set up a facility on the device before running this command"
    ),
    FILE_WRITE_ERROR: _("Error trying to write csv file: {}"),
}
