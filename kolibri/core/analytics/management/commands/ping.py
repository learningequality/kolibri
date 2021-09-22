import logging

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from kolibri.core.analytics.utils import DEFAULT_PING_CHECKRATE
from kolibri.core.analytics.utils import DEFAULT_PING_INTERVAL
from kolibri.core.analytics.utils import DEFAULT_SERVER_URL
from kolibri.core.analytics.utils import ping_once
from kolibri.core.analytics.utils import schedule_ping
from kolibri.utils.time_utils import local_now

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Pings a central server to check for updates/messages and track stats."

    def add_arguments(self, parser):
        parser.add_argument(
            "--interval",
            action="store",
            dest="interval",
            help="Number of minutes to wait after a successful ping before the next ping.",
        )
        parser.add_argument(
            "--checkrate",
            action="store",
            dest="checkrate",
            help="Number of minutes to wait between failed ping attempts.",
        )
        parser.add_argument(
            "--server",
            action="store",
            dest="server",
            help="Base URL of the server to connect to.",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            dest="once",
            help="Only try to ping once, then exit",
        )

    def handle(self, *args, **options):

        interval = float(options.get("interval") or DEFAULT_PING_INTERVAL)
        checkrate = float(options.get("checkrate") or DEFAULT_PING_CHECKRATE)
        server = options.get("server") or DEFAULT_SERVER_URL
        once = options.get("once") or False

        if once:
            started = local_now().isoformat()
            try:
                ping_once(started, server)
            except Exception as e:
                raise CommandError(e)
        else:
            schedule_ping(server, checkrate, interval)
