import logging
import sys

from setproctitle import setproctitle

from .application import Launcher


PROCESS_NAME = "kolibri-launcher"
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def main():
    setproctitle(PROCESS_NAME)
    app = Launcher()

    logger.info("")
    logger.info("***********************************")
    logger.info("*  Kolibri Launcher Initializing  *")
    logger.info("***********************************")
    logger.info("")

    return app.run(sys.argv)

if __name__ == "__main__":
    sys.exit(main())
