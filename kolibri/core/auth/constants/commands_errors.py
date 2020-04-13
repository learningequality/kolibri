from django.utils.translation import gettext_lazy as _

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
    TOO_LONG: _("'{}' is too long"),
    INVALID: _("Not a valid '{}'"),
    DUPLICATED_USERNAME: _("Duplicated Username"),
    INVALID_USERNAME: _(
        "Username only can contain characters, numbers and underscores"
    ),
    REQUIRED_COLUMN: _("The column '{}' is required"),
    INVALID_HEADER: _("Mix of valid and/or invalid header labels found in first row"),
    NO_FACILITY: _(
        "No default facility exists, please make sure to provision this device before running this command"
    ),
    FILE_READ_ERROR: _("Error trying to read csv file: {}"),
    FILE_WRITE_ERROR: _("Error trying to write csv file: {}"),
}
