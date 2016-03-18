"""
This module contains constants representing the kinds of "relations" that a user can have with respect to another user.
"""

# Some role kinds are also relation kinds, so import those here. (e.g. if UserA has the COACH role for ClassX,
# and UserB has the LEARNER role for ClassX, then UserA has the COACH relation to UserB)
from . import role_kinds as __role_kinds

ADMIN = __role_kinds.ADMIN
COACH = __role_kinds.COACH

SELF = "self"
