import os
import sys


# Redirect stdout to devnull until we can setup logging.
devnull = open(os.devnull, "w")
sys.stdout = devnull
sys.stderr = devnull

if "KOLIBRI_HOME" not in os.environ:
    kolibri_data_dir = os.path.join(sys._MEIPASS, "..", "KOLIBRI_DATA")
    if os.path.isdir(kolibri_data_dir):
        db_file = os.path.join(kolibri_data_dir, "db.sqlite3")
        if os.path.exists(db_file):
            os.environ["KOLIBRI_HOME"] = kolibri_data_dir
