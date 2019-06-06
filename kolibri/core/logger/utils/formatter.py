import re
from logging import Formatter


class KolibriLogFileFormatter(Formatter):
    """
    A custom Formatter to change the format string of Cherrypy logging messages.
    """

    def format(self, record):
        if "cherrypy" in record.name:
            # Remove the timestamp from Cherrypy logging so that the message only contains one timestamp.
            record.msg = re.sub(r"\[[^)]*\]\s", "", record.msg)
            # Change the format string for Cherrypy logging messages from %module(_cplogging) to %name.
            record.module = record.name

        message = super(KolibriLogFileFormatter, self).format(record)
        return message
