from django.core.management.base import CommandError
from django.utils.six.moves import input

from kolibri.core.auth.models import Facility


def _interactive_facility_selection():
    facilities = Facility.objects.all()
    message = "Please choose a facility to sync:\n"
    for idx, facility in enumerate(facilities):
        message += "{}. {}\n".format(idx + 1, facility.name)
    idx = input(message)
    try:
        facility = facilities[int(idx) - 1]
    except IndexError:
        raise CommandError(
            (
                "{idx} is not in the range of (1, {range})".format(
                    idx=idx, range=len(facilities)
                )
            )
        )
    return facility


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
                    "Please initialize your Kolibri installation by starting the server, loading Kolibri in the browser, "
                    "and completing the setup instructions. "
                )
            )
        except Facility.MultipleObjectsReturned:
            if noninteractive:
                raise CommandError(
                    (
                        "There are multiple facilities on this device. "
                        "Please pass in a facility ID by passing in --facility={ID} after the command."
                    )
                )
            else:
                # in interactive mode, allow user to select facility
                facility = _interactive_facility_selection()

    return facility
