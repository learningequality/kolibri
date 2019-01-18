import logging
import os
import shutil
import tempfile

import pytest

from kolibri.utils import compat
from kolibri.utils import conf


logger = logging.getLogger(__name__)


@pytest.fixture(scope="module")
def dbbackup_test_home(request):
    """
    This fixture creates a clean KOLIBRI_HOME, sets the environment and yields.
    After returning, it unsets the environment
    """

    KOLIBRI_HOME_DBBACKUP = tempfile.mkdtemp()
    PREVIOUS_HOME = conf.KOLIBRI_HOME
    os.environ["KOLIBRI_HOME"] = KOLIBRI_HOME_DBBACKUP

    # Reload the `conf` module, and we assume the whole application will have
    # necessary changes. This assumes that no other modules read out internal
    # values of the `conf` module, for instance
    # `from kolibri.utils.conf import ...` would violate that assumption.
    compat.reload_module(conf)

    def fin():
        logger.info("Removing {}".format(KOLIBRI_HOME_DBBACKUP))
        shutil.rmtree(KOLIBRI_HOME_DBBACKUP)
        os.environ["KOLIBRI_HOME"] = PREVIOUS_HOME
        compat.reload_module(conf)

    request.addfinalizer(fin)
