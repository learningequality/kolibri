import logging
from sys import exit
from time import sleep
from time import time

import requests

from kolibri.core.auth.constants.demographics import NOT_SPECIFIED

logger = logging.getLogger(__name__)

url = "http://localhost:8082/api/device/deviceprovision/"
data = {
    "device_name": "localhost",
    "language_id": "en",
    "facility": {"name": "Atkinson Hall"},
    "preset": "nonformal",
    "allow_guest_access": True,
    "settings": {
        "learner_can_sign_up": True,
        "learner_can_edit_name": True,
        "learner_can_edit_username": True,
        "learner_can_login_with_no_password": True,
    },
    "user": {
        "full_name": "Billy",
        "username": "Joel",
        "password": "123",
        "gender": NOT_SPECIFIED,
        "birth_year": NOT_SPECIFIED,
    },
}

status_code = None
timeout = 30  # wait for kolibri to start
now = time()

logger.info("mock provisioning...")
while time() < now + timeout and status_code != 201:
    sleep(1)
    try:
        response = requests.post(url, json=data)
        status_code = response.status_code
    except requests.exceptions.RequestException:
        pass

if status_code == 201:
    logger.info("success!")
    exit(0)
else:
    logger.error("failed with status %i" % status_code)
    exit(1)
