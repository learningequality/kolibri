"""
This module contains constants representing the kinds of Collections.
"""
from __future__ import unicode_literals

from django.utils.translation import ugettext_lazy as _

FACILITY = "facility"
CLASSROOM = "classroom"
LEARNERGROUP = "learnergroup"
ADHOCLEARNERSGROUP = "adhoclearnersgroup"

# the ordering of kinds in the following tuple corresponds to their level in the hierarchy tree
choices = (
    (FACILITY, _("Facility")),
    (CLASSROOM, _("Classroom")),
    (LEARNERGROUP, _("Learner group")),
    (ADHOCLEARNERSGROUP, _("Ad hoc learners group")),
)
