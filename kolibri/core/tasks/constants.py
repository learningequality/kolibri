DEFAULT_QUEUE = "kolibri"


class Priority(object):
    """
    This class defines the priority levels and their corresponding integer values.

    REGULAR priority is for tasks that can wait for some time before it actually
    starts executing. Tasks that are tracked on task manager should use this priority.

    HIGH priority is for tasks that want execution as soon as possible. Tasks that
    might affect user experience (e.g. on screen loading animation) like importing
    channel metadata.
    """

    LOW = 15
    REGULAR = 10
    HIGH = 5

    # A set of all valid priorities
    Priorities = {HIGH, REGULAR, LOW}
