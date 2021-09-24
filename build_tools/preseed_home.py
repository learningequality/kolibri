import os
import shutil
import tempfile

temphome = tempfile.mkdtemp()
os.environ["KOLIBRI_HOME"] = temphome

from kolibri.main import initialize  # noqa E402
from kolibri.deployment.default.sqlite_db_names import (  # noqa E402
    ADDITIONAL_SQLITE_DATABASES,
)
from django.core.management import call_command  # noqa E402

move_to = os.path.join(os.path.dirname(__file__), "..", "kolibri", "dist", "home")
shutil.rmtree(move_to)
os.mkdir(move_to)

print("Generating preseeded home data in {}".format(temphome))

initialize()
call_command(
    "deprovision", "--destroy-all-user-data", "--permanent-irrevocable-data-loss"
)

shutil.move(os.path.join(temphome, "db.sqlite3"), move_to)

for db_name in ADDITIONAL_SQLITE_DATABASES:
    shutil.move(os.path.join(temphome, "{}.sqlite3".format(db_name)), move_to)

print("Moved all preseeded home data to {}".format(move_to))

shutil.rmtree(temphome)
