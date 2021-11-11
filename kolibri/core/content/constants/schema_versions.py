V020BETA1 = "v0.2.0-beta1"

V040BETA3 = "v0.4.0-beta3"

NO_VERSION = "unversioned"

VERSION_1 = "1"

VERSION_2 = "2"

VERSION_3 = "3"

VERSION_4 = "4"

VERSION_5 = "5"

# List of the content db schema versions, ordered from most recent to least recent.
# When a new schema version is generated, it should be added here, at the top of the list.
CONTENT_DB_SCHEMA_VERSIONS = [
    VERSION_5,
    VERSION_4,
    VERSION_3,
    VERSION_2,
    VERSION_1,
    NO_VERSION,
    V040BETA3,
    V020BETA1,
]

# The latest compatible exported schema version for this version of Kolibri
CONTENT_SCHEMA_VERSION = VERSION_5

# The version name for the current content schema,
# which may have schema modifications not present in the export schema
CURRENT_SCHEMA_VERSION = "current"
