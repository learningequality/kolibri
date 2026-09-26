from kolibri.core.auth.errors import FacilityLookupError
from kolibri.core.auth.errors import MultipleFacilitiesError
from kolibri.core.auth.models import Facility


def get_facility(facility_id=None):
    # try to get a valid facility from id
    if facility_id:
        try:
            return Facility.objects.get(id=facility_id)
        except Facility.DoesNotExist as e:
            raise FacilityLookupError(
                f"Facility with ID {facility_id} does not exist"
            ) from e
    # if no id passed in, assume only one facility on device
    try:
        return Facility.objects.get()
    except Facility.DoesNotExist as e:
        raise FacilityLookupError(
            "There are no facilities on this device. "
            "Please initialize your Kolibri installation by starting the server, loading Kolibri in the browser, "
            "and completing the setup instructions. "
        ) from e
    except Facility.MultipleObjectsReturned as e:
        raise MultipleFacilitiesError(
            "There are multiple facilities on this device.",
            Facility.objects.all().order_by("name"),
        ) from e
