from django.utils.translation import gettext_lazy as _
from django.utils.translation import pgettext_lazy

# Error messages ###
UNEXPECTED_EXCEPTION = 0
TOO_LONG = 1
INVALID = 2
DUPLICATED_USERNAME = 3
INVALID_USERNAME = 4
REQUIRED_COLUMN = 5
INVALID_HEADER = 6
NO_FACILITY = 7
FILE_READ_ERROR = 8
FILE_WRITE_ERROR = 9

MESSAGES = {
    UNEXPECTED_EXCEPTION: _("Unexpected exception [{}]: {}"),
    TOO_LONG: pgettext_lazy(
        "Error report message when the allowed number of digits has been exceeded.",
        "Content of cell '{}' is too long",
    ),
    INVALID: pgettext_lazy(
        "Error report message when the cell contains an improper data format.",
        "Content of cell '{}' is not valid",
    ),
    DUPLICATED_USERNAME: _("Duplicated username"),
    INVALID_USERNAME: _(
        "Username only can contain characters, numbers and underscores"
    ),
    REQUIRED_COLUMN: _("The column '{}' is required"),
    INVALID_HEADER: _("Mix of valid and/or invalid header labels found in first row"),
    NO_FACILITY: _(
        "No default facility exists. Make sure to set up a facility on the device before running this command"
    ),
    FILE_READ_ERROR: _("Error trying to read csv file: {}"),
    FILE_WRITE_ERROR: _("Error trying to write csv file: {}"),
}
