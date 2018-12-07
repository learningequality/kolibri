from django.test.utils import TestContextDecorator

from kolibri.utils import conf


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
        conf.OPTIONS[self.section][self.key] = self.temp_value

    def disable(self):
        conf.OPTIONS[self.section][self.key] = self.old_value
