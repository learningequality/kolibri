import logging as log
import os
import sys

from kolibri.utils.conf import LOG_ROOT
from kolibri.utils.logger import KolibriTimedRotatingFileHandler
from kolibri_app.constants import RUN_AS_SERVER
from kolibri_app.streams import LoggerWriter

log.basicConfig(format="%(levelname)s: %(message)s", level=log.INFO)
logging = log.getLogger("kolibri_app")

# A handler failure otherwise reports itself on sys.stderr, which we point back
# at logging below. Once the report is queued rather than written inline, the
# LoggerWriter guard cannot see the cycle, and a persistently failing handler
# feeds itself for as long as the app runs (learningequality/kolibri#15150).
# This is module state, so it silences handler failures for every handler in the
# process, Kolibri's own included. To diagnose one, run `kolibri start` from a
# console instead: this module is not imported there, and stderr is a terminal.
log.raiseExceptions = False

# The server subprocess gets its own file: Windows will not rename a log file a
# second process still holds open, so sharing one breaks rotation for both
# (learningequality/kolibri#15150).
log_basename = "kolibri-app-server.txt" if RUN_AS_SERVER else "kolibri-app.txt"
log_filename = os.path.join(LOG_ROOT, log_basename)
file_handler = KolibriTimedRotatingFileHandler(
    filename=log_filename, encoding="utf-8", when="midnight", backupCount=30
)
logging.addHandler(file_handler)

# Make sure we send all app output to logs as we have no console to view them on.
sys.stdout = LoggerWriter(logging.debug)
sys.stderr = LoggerWriter(logging.warning)
