from kolibri.core.errors import KolibriError


class ContentModelUsedOutsideDBContext(KolibriError):

    def __init__(self, msg=None):
        self.message = msg or ('Content models can only be used within the context of the '
                               '`using_content_database` decorator/context manager.')

    def __str__(self):
        return self.message
