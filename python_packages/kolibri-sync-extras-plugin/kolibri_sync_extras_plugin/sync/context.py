from morango.sync.context import LocalSessionContext


class BackgroundSessionContext(LocalSessionContext):
    """
    Background session context class that won't trigger our BackgroundFinalizeJobOperation when we
    run sync operations in the background. This inherits LocalSessionContext so the default Morango
    operations will accept this context
    """

    def __init__(self, *args, **kwargs):
        super(BackgroundSessionContext, self).__init__(*args, **kwargs)
        # for this use case, we're always going to be the server, and the receiver
        self.is_server = True

    @property
    def is_receiver(self):
        # for this use case, we're always going to be the server, and the receiver
        return True
