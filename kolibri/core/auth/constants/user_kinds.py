"""
This module contains constants representing the kinds of user that can be logged in, based on their roles and permissions.
"""

from django.utils.translation import gettext_lazy as _

from .role_kinds import ADMIN
from .role_kinds import ASSIGNABLE_COACH
from .role_kinds import choices
from .role_kinds import COACH

LEARNER = "learner"
SUPERUSER = "superuser"
ANONYMOUS = "anonymous"
CAN_MANAGE_CONTENT = "can manage content"

choices = (
    *choices,
    (LEARNER, "Learner"),
    (SUPERUSER, "Superadmin"),
    (ANONYMOUS, "Anonymous"),
    (CAN_MANAGE_CONTENT, "Can manage content"),
)

labels = {
    ADMIN: _("Admin"),
    SUPERUSER: _("Super admin"),
    ASSIGNABLE_COACH: _("Class coach"),
    COACH: _("Facility coach"),
    LEARNER: _("Learner"),
}
