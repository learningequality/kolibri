import json
import logging as logger
import os
import time
from datetime import datetime

import kolibri
import requests
from django.core.management.base import BaseCommand
from kolibri.core.device.models import DeviceSettings
from morango.models import InstanceIDModel
from requests.exceptions import ConnectionError, RequestException, Timeout

logging = logger.getLogger(__name__)

DEFAULT_PING_INTERVAL = 24 * 60
DEFAULT_PING_CHECKRATE = 15
DEFAULT_PING_SERVER_URL = "http://telemetry.learningequality.org/api/v1/pingback"


class Command(BaseCommand):
    help = "Pings a central server to check for updates/messages and track stats."

    def add_arguments(self, parser):
        parser.add_argument('--interval', action='store', dest='interval',
                            help='Number of minutes to wait after a successful ping before the next ping.')
        parser.add_argument('--checkrate', action='store', dest='checkrate',
                            help='Number of minutes to wait between failed ping attempts.')
        parser.add_argument('--server', action='store', dest='server',
                            help='URL for the server ')

    def handle(self, *args, **options):

        interval = float(options.get("interval") or DEFAULT_PING_INTERVAL)
        checkrate = float(options.get("checkrate") or DEFAULT_PING_CHECKRATE)
        server = options.get("server") or DEFAULT_PING_SERVER_URL

        self.started = datetime.now()

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

        devicesettings = DeviceSettings.objects.first()
        language = devicesettings.language_id if devicesettings else ""

        data = {
            "instance_id": instance.id,
            "version": kolibri.__version__,
            "mode": os.environ.get("KOLIBRI_RUN_MODE", ""),
            "platform": instance.platform,
            "sysversion": instance.sysversion,
            "database_id": instance.database.id,
            "system_id": instance.system_id,
            "node_id": instance.node_id,
            "language": language,
            "uptime": int((datetime.now() - self.started).total_seconds() / 60),
            # possibly add: channels, user count, dataset ids, high-level stats?
        }

        jsondata = json.dumps(data)

        logging.info("data: {}".format(jsondata))

        response = requests.post(server, data=jsondata, timeout=60)

        response.raise_for_status()

        return json.loads(response.content or "{}")
