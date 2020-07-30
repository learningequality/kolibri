import sys

from django.utils.six.moves import input

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Membership


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input("{} [Type 'yes' or 'no'.] ".format(message)).lower()
    if answer != "yes":
        print("Canceled! Exiting without touching the database.")
        sys.exit(1)


def create_adhoc_group_for_learners(classroom, learners):
    adhoc_group = AdHocGroup.objects.create(name="", parent=classroom)
    for learner in learners:
        Membership.objects.create(user=learner, collection=adhoc_group)
    return adhoc_group
