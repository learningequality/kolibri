"""
This module contains constants representing the kinds of "membership" that a user can have within a Collection.
"""
from django.utils.translation import ugettext_lazy as _

LEARNER = "learner"

choices = (
    (LEARNER, _("Learner")),
)
