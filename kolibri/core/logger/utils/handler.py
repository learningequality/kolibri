import os
from logging.handlers import TimedRotatingFileHandler

GET_FILES_TO_DELETE = "getFilesToDelete"
DO_ROLLOVER = "doRollover"


class KolibriTimedRotatingFileHandler(TimedRotatingFileHandler):
    """
    A custom TimedRotatingFileHandler that overrides two methods, getFilesToDelete
    and doRollover, to rename the rotation files from KOLIBRI_HOME/logs/kolibri.txt.YYYY-MM-DD
    to KOLIBRI_HOME/logs/archive/KOLIBRI-YYYY-MM-DD.txt.
    The original code is here: https://github.com/python/cpython/blob/2.7/Lib/logging/handlers.py#L162
    """

    def __init__(self, *args, **kwargs):
        super(KolibriTimedRotatingFileHandler, self).__init__(*args, **kwargs)
        dirname, basename = os.path.split(self.baseFilename)
        archive_dir = os.path.join(dirname, "archive")

        # Define attributes for this custom handler class
        self.dirname = dirname
        self.basename = basename
        self.archive_dir = archive_dir

    def getFilesToDelete(self):
        """
        Overriding the original getFilesToDelete method because the names of
        rotation files have been changed in doRollover method.
        """
        # If the archive directory does not exist, it means that there are no
        # rotation files
        if not os.path.exists(self.archive_dir):
            return []

        filenames = os.listdir(self.archive_dir)
        prefix = self.basename.split(".")[0] + "-"

        # Find all the rotation files in the KOLIBRI_HOME/logs/archive directory
        result = self._rotation_files(filenames, prefix, GET_FILES_TO_DELETE)
        result.sort()

        if len(result) < self.backupCount:
            result = []
        else:
            result = result[: len(result) - self.backupCount]
        return result

    def doRollover(self):
        """
        Overriding the original doRollover method so that the rotation files will
        be renamed from KOLIBRI_HOME/logs/kolibri.txt.YYYY-MM-DD to
        KOLIBRI_HOME/logs/archive/KOLIBRI-YYYY-MM-DD.txt.
        """
        super(KolibriTimedRotatingFileHandler, self).doRollover()
        filenames = os.listdir(self.dirname)
        prefix = self.basename + "."

        # Find all the rotation files in the KOLIBRI_HOME/logs directory and rename
        # them.
        if not os.path.exists(self.archive_dir):
            os.mkdir(self.archive_dir)
        self._rotation_files(filenames, prefix)

    def _rotation_files(self, filenames, prefix, func=DO_ROLLOVER):
        result = []
        plen = len(prefix)

        for filename in filenames:
            if filename[:plen] != prefix:
                continue

            rollover_time = filename[plen:].split(".")[0]
            if not self.extMatch.match(rollover_time):
                continue

            if func == GET_FILES_TO_DELETE:
                # Get the set of rotation files if the method is called from getFilesToDelete().
                result.append(os.path.join(self.archive_dir, filename))
            else:
                # Rename the rotation files if the method is called from doRollover().
                logname, ext = self.basename.split(".")
                new_name = logname + "-" + rollover_time + "." + ext
                destination_filename = os.path.join(self.archive_dir, new_name)
                source_filename = os.path.join(self.dirname, filename)
                os.rename(source_filename, destination_filename)

        return result
