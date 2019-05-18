"""
This module contains constants representing the kinds of user that can be logged in, based on their roles and permissions.
"""
from .role_kinds import ADMIN  # noqa F401
from .role_kinds import ASSIGNABLE_COACH  # noqa F401
from .role_kinds import choices
from .role_kinds import COACH  # noqa F401

LEARNER = "learner"
SUPERUSER = "superuser"
ANONYMOUS = "anonymous"
CAN_MANAGE_CONTENT = "can manage content"

choices = choices + (
    (LEARNER, "Learner"),
    (SUPERUSER, "Superadmin"),
    (ANONYMOUS, "Anonymous"),
    (CAN_MANAGE_CONTENT, "Can manage content"),
)
