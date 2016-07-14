from kolibri.core.errors import KolibriError


class ContentModelUsedOutsideDBContext(KolibriError):

    def __init__(self, msg=None):
        self.args = (msg or ('Content models can only be used within the context of the '
                             '`using_content_database` decorator/context manager.'),)
