import json
import logging
import os
import time
from datetime import datetime

import requests
from django.core.management.base import BaseCommand
from django.utils.six.moves.urllib.parse import urljoin
from django.utils.timezone import get_current_timezone
from morango.models import InstanceIDModel
from requests.exceptions import ConnectionError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

import kolibri
from ...utils import dump_zipped_json
from ...utils import extract_channel_statistics
from ...utils import extract_facility_statistics
from kolibri.core.auth.models import Facility
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.device.models import DeviceSettings
from kolibri.utils.server import vacuum_db_lock

logger = logging.getLogger(__name__)

DEFAULT_PING_INTERVAL = 24 * 60
DEFAULT_PING_CHECKRATE = 15
DEFAULT_SERVER_URL = "https://telemetry.learningequality.org"


class Command(BaseCommand):
    help = "Pings a central server to check for updates/messages and track stats."

    def add_arguments(self, parser):
        parser.add_argument('--interval', action='store', dest='interval',
                            help='Number of minutes to wait after a successful ping before the next ping.')
        parser.add_argument('--checkrate', action='store', dest='checkrate',
                            help='Number of minutes to wait between failed ping attempts.')
        parser.add_argument('--server', action='store', dest='server',
                            help='Base URL of the server to connect to.')

    def handle(self, *args, **options):

        interval = float(options.get("interval") or DEFAULT_PING_INTERVAL)
        checkrate = float(options.get("checkrate") or DEFAULT_PING_CHECKRATE)
        server = options.get("server") or DEFAULT_SERVER_URL

        self.started = datetime.now()

        while True:
            try:
                logger.info("Attempting a ping.")
                with vacuum_db_lock:
                    data = self.perform_ping(server)
                    logger.info("Ping succeeded! (response: {})".format(data))
                    if "id" in data:
                        self.perform_statistics(server, data["id"])
                logger.info("Sleeping for {} minutes.".format(interval))
                time.sleep(interval * 60)
                continue
            except ConnectionError:
                logger.warn("Ping failed (could not connect). Trying again in {} minutes.".format(checkrate))
            except Timeout:
                logger.warn("Ping failed (connection timed out). Trying again in {} minutes.".format(checkrate))
            except RequestException as e:
                logger.warn("Ping failed ({})! Trying again in {} minutes.".format(e, checkrate))
            time.sleep(checkrate * 60)

    def perform_ping(self, server):

        url = urljoin(server, "/api/v1/pingback")

        instance, _ = InstanceIDModel.get_or_create_current_instance()

        devicesettings = DeviceSettings.objects.first()
        language = devicesettings.language_id if devicesettings else ""

        try:
            timezone = get_current_timezone().zone
        except Exception:
            timezone = ""

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
            "timezone": timezone,
            "uptime": int((datetime.now() - self.started).total_seconds() / 60),
        }

        logger.debug("Pingback data: {}".format(data))

        jsondata = dump_zipped_json(data)

        response = requests.post(url, data=jsondata, timeout=60)

        response.raise_for_status()

        return json.loads(response.content or "{}")

    def perform_statistics(self, server, pingback_id):

        url = urljoin(server, "/api/v1/statistics")

        channels = [extract_channel_statistics(c) for c in ChannelMetadata.objects.all()]
        facilities = [extract_facility_statistics(f) for f in Facility.objects.all()]

        data = {
            "pi": pingback_id,
            "c": channels,
            "f": facilities,
        }

        logger.debug("Statistics data: {}".format(data))

        jsondata = dump_zipped_json(data)

        response = requests.post(url, data=jsondata, timeout=60)

        response.raise_for_status()

        return json.loads(response.content or "{}")
