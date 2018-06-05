"""
This module contains constants representing the kinds of "roles" that a user can have with respect to a Collection.
"""
from __future__ import unicode_literals

from django.utils.translation import ugettext_lazy as _

ADMIN = "admin"
FACILITY_COACH = "facility coach"
CLASS_COACH = "classroom assignable coach"

choices = (
    (ADMIN, _("Admin")),
    (FACILITY_COACH, _("Facility coach")),
    (CLASS_COACH, _("Class coach")),
)
