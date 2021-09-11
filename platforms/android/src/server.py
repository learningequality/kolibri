import initialization  # keep this first, to ensure we're set up for other imports

import logging
import os

from config import KOLIBRI_PORT
from android_utils import make_service_foreground, share_by_intent
from kolibri.main import initialize
from kolibri.main import start
from kolibri.plugins.app.utils import interface
from kolibri.utils.conf import KOLIBRI_HOME

logging.info("Entering Kolibri server service")

# ensure the service stays running by "foregrounding" it with a persistent notification
make_service_foreground("Kolibri is running...", "Click here to resume.")

initialize(skip_update=True)

# register app capabilities
interface.register(share_file=share_by_intent)

logging.info("Home folder: {}".format(KOLIBRI_HOME))
logging.info("Timezone: {}".format(os.environ.get("TZ", "(default)")))
# start the kolibri server
start(port=KOLIBRI_PORT)
