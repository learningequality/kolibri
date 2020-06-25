"""
This module contains constants representing the kinds of Collections.
"""
from __future__ import unicode_literals

FACILITY = "facility"
CLASSROOM = "classroom"
LEARNERGROUP = "learnergroup"
ADHOCLEARNERSGROUP = "adhoclearnersgroup"

# the ordering of kinds in the following tuple corresponds to their level in the hierarchy tree
choices = (
    (FACILITY, "Facility"),
    (CLASSROOM, "Classroom"),
    (LEARNERGROUP, "Named learner group within a class"),
    (ADHOCLEARNERSGROUP, "Ad hoc learner group within a class"),
)
