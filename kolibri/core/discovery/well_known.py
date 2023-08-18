from le_utils.uuidv5 import generate_ecosystem_namespaced_uuid

from kolibri.utils import conf

# AKA Kolibri Studio
CENTRAL_CONTENT_BASE_URL = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
CENTRAL_CONTENT_BASE_INSTANCE_ID = generate_ecosystem_namespaced_uuid(
    CENTRAL_CONTENT_BASE_URL
).hex
