import sys

from django.core.management.base import CommandError
from django.utils.six.moves import input

from kolibri.core.auth.models import Facility


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input("{} [Type 'yes' or 'no'.] ".format(message)).lower()
    if answer != "yes":
        print("Canceled! Exiting without touching the database.")
        sys.exit(1)


def get_facility(facility_id=None, noninteractive=False):
    # try to get a valid facility from id
    if facility_id:
        try:
            facility = Facility.objects.get(id=facility_id)
        except Facility.DoesNotExist:
            raise CommandError("Facility with ID {} does not exist".format(facility_id))
    # if no id passed in, assume only one facility on device
    else:
        try:
            facility = Facility.objects.get()
        except Facility.DoesNotExist:
            raise CommandError(
                (
                    "There are no facilities on this device. "
                    "Please setup your kolibri instance."
                )
            )
        except Facility.MultipleObjectsReturned:
            if noninteractive:
                raise CommandError(
                    (
                        "There are multiple facilities on this device. "
                        "Please pass in a facility ID."
                    )
                )
            else:
                # in interactive mode, allow user to select facility
                facilities = Facility.objects.all()
                message = "Please choose a facility to sync:\n"
                for idx, facility in enumerate(facilities):
                    message += "{}. {}\n".format(idx + 1, facility.name)
                idx = input(message)
                facility = facilities[int(idx) - 1]

    return facility
