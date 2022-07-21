import os

from django.test.utils import TestContextDecorator

from kolibri.utils import conf
from kolibri.utils.options import option_spec


class override_option(TestContextDecorator):
    """
    Acts as either a decorator or a context manager. If it's a decorator it
    takes a function and returns a wrapped function. If it's a contextmanager
    it's used with the ``with`` statement. In either event entering/exiting
    are called before and after, respectively, the function/block is executed.

    Note: adapted from django.test.utils.override_settings
    """

    def __init__(self, section, key, value):
        self.section = section
        self.key = key
        self.temp_value = value
        super(override_option, self).__init__()

    def enable(self):
        self.old_value = conf.OPTIONS[self.section][self.key]
        envvars = option_spec[self.section][self.key]["envvars"]
        self.old_envvars = {}
        for envvar in envvars:
            self.old_envvars[envvar] = os.environ.get(envvar, None)
            os.environ[envvar] = str(self.temp_value)
        conf.OPTIONS[self.section][self.key] = self.temp_value

    def disable(self):
        conf.OPTIONS[self.section][self.key] = self.old_value
        for envvar, value in self.old_envvars.items():
            if value is None:
                del os.environ[envvar]
            else:
                os.environ[envvar] = value
