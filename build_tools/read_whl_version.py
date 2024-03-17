import logging
import sys

from pkginfo import Wheel

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        logger.error("Usage: read_whl_version.py <whl_file>")
        sys.exit(1)

    whl_file = sys.argv[1]
    whl = Wheel(whl_file)
    logger.info(whl.version)
    sys.exit(0)
