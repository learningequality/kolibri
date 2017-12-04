import json
import logging as logger
import time

import kolibri
import requests
from django.core.management.base import BaseCommand
from morango.models import InstanceIDModel
from requests.exceptions import ConnectionError, RequestException, Timeout

logging = logger.getLogger(__name__)

DEFAULT_PING_INTERVAL = 24 * 60
DEFAULT_PING_CHECKRATE = 15
PING_SERVER_URL = "http://127.0.0.1:7777"


class Command(BaseCommand):
    help = "Pings a central server to check for updates/messages and track stats."

    def add_arguments(self, parser):
        parser.add_argument('--interval', action='store', dest='interval', default=DEFAULT_PING_INTERVAL,
                            help='Number of minutes to wait after a successful ping before the next ping.')
        parser.add_argument('--checkrate', action='store', dest='checkrate', default=DEFAULT_PING_CHECKRATE,
                            help='Number of minutes to wait between failed ping attempts.')
        parser.add_argument('--server', action='store', dest='server', default=PING_SERVER_URL,
                            help='URL for the server ')

    def handle(self, *args, **options):

        interval = float(options["interval"])
        checkrate = float(options["checkrate"])
        server = options["server"]

        while True:
            try:
                logging.info("Attempting a ping.")
                data = self.perform_ping(server)
                logging.info("Ping succeeded! (response: {}) Sleeping for {} minutes.".format(data, interval))
                time.sleep(interval * 60)
                continue
            except ConnectionError:
                logging.warn("Ping failed (could not connect). Trying again in {} minutes.".format(checkrate))
            except Timeout:
                logging.warn("Ping failed (connection timed out). Trying again in {} minutes.".format(checkrate))
            except RequestException as e:
                logging.warn("Ping failed ({})! Trying again in {} minutes.".format(e, checkrate))
            time.sleep(checkrate * 60)

    def perform_ping(self, server):

        instance, _ = InstanceIDModel.get_or_create_current_instance()

        data = {
            "instance_id": instance.id,
            "version": kolibri.__version__,
            "platform": instance.platform,
            # "hostname": instance.hostname,
            "sysversion": instance.sysversion,
            "database_id": instance.database.id,
            # "db_path": instance.db_path,
            "system_id": instance.system_id,
            "macaddress": instance.macaddress,
            "language": "TODO",
            # possibly add: channels, user count, dataset ids, high-level stats?
        }
        logging.info("data: {}".format(data))

        response = requests.post(server, data=json.dumps(data), timeout=30)

        response.raise_for_status()

        return json.loads(response.content or "{}")
