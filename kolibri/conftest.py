import os
import shutil

import pytest

from kolibri.core.utils.cache import process_cache

# referenced in pytest.ini
TEMP_KOLIBRI_HOME = "./.pytest_kolibri_home"


@pytest.fixture(autouse=True)
def clear_process_cache():
    process_cache.clear()


@pytest.fixture(scope="session", autouse=True)
def global_fixture():
    if not os.path.exists(TEMP_KOLIBRI_HOME):
        os.mkdir(TEMP_KOLIBRI_HOME)
    if not os.path.exists(os.path.join(TEMP_KOLIBRI_HOME, "content")):
        os.mkdir(os.path.join(TEMP_KOLIBRI_HOME, "content"))
    yield  # wait until the test ended
    if os.path.exists(TEMP_KOLIBRI_HOME):
        try:
            shutil.rmtree(TEMP_KOLIBRI_HOME)
        except OSError:
            # Don't fail a test just because we failed to cleanup
            pass
