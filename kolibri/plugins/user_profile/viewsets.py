from rest_framework.response import Response
from rest_framework.views import APIView

from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.utils import get_device_setting


class UserIndividualViewset(APIView):
    """
    Viewset to determine if the device has a single user or not.
    """

    def get(self, request, format=None):
        if request.user.is_anonymous:
            self.permission_denied(request)

        subset_of_users_device = get_device_setting(
            "subset_of_users_device", default=False
        )
        users_device = FacilityUser.objects.count()

        return Response(
            {"individual": users_device == 1, "lod": subset_of_users_device}
        )
