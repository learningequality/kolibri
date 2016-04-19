"""
This module contains constants representing the kinds of "roles" that a user can have with respect to a Collection.
"""
from django.utils.translation import ugettext_lazy as _

ADMIN = "admin"
COACH = "coach"

choices = (
    (ADMIN, _("Admin")),
    (COACH, _("Coach")),
)
