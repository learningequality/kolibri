import os
import shutil
import tempfile

temphome = tempfile.mkdtemp()
os.environ["KOLIBRI_HOME"] = temphome

from kolibri.main import initialize  # noqa E402
from kolibri.deployment.default.sqlite_db_names import (  # noqa E402
    ADDITIONAL_SQLITE_DATABASES,
)
from django.conf import settings  # noqa E402
from django.core.management import call_command  # noqa E402

move_to = os.path.join(os.path.dirname(__file__), "..", "kolibri", "dist", "home")
shutil.rmtree(move_to, ignore_errors=True)
os.mkdir(move_to)

print("Generating preseeded home data in {}".format(temphome))

initialize()
call_command(
    "deprovision", "--destroy-all-user-data", "--permanent-irrevocable-data-loss"
)

for db_config in settings.DATABASES.values():
    if db_config["ENGINE"] == "django.db.backends.sqlite3":
        shutil.move(os.path.join(temphome, db_config["NAME"]), move_to)

print("Moved all preseeded home data to {}".format(move_to))

shutil.rmtree(temphome)
