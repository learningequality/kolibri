from __future__ import unicode_literals


PROFILE_FACILITY_DATA = "facilitydata"


class ScopeDefinitions(object):
    """
    Class contains morango scope definition constants for certificates.
    """

    FULL_FACILITY = "full-facility"
    SINGLE_USER = "single-user"


class State(object):
    """
    Class containing constants for reporting current sync state
    """

    PENDING = "PENDING"
    SESSION_CREATION = "SESSION_CREATION"
    REMOTE_QUEUING = "REMOTE_QUEUING"
    PULLING = "PULLING"
    LOCAL_DEQUEUING = "LOCAL_DEQUEUING"
    LOCAL_QUEUING = "LOCAL_QUEUING"
    PUSHING = "PUSHING"
    REMOTE_DEQUEUING = "REMOTE_DEQUEUING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"
