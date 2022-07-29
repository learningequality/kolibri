import requests
from django.urls import reverse
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from six.moves.urllib.parse import urljoin

from kolibri.core.device.utils import get_device_setting


class OnMyOwnSetupViewset(APIView):
    """
    Viewset to determine if the facility has been setup as an "On my own setup" facoñotu.
    """

    def get(self, request, format=None):
        if request.user.is_anonymous:
            self.permission_denied(request)
        subset_of_users_device = get_device_setting(
            "subset_of_users_device", default=False
        )
        user_facility = self.request.user.facility
        return Response(
            {
                "on_my_own_setup": user_facility.on_my_own_setup,
                "lod": subset_of_users_device,
            }
        )


class RemoteFacilityUserViewset(APIView):
    def get(self, request):
        baseurl = request.query_params.get("baseurl", request.build_absolute_uri("/"))
        username = request.query_params.get("username", None)
        facility = request.query_params.get("facility", None)
        if username is None or facility is None:
            raise ValidationError(detail="Both username and facility are required")
        path = reverse("kolibri:core:publicsearchuser-list").lstrip("/")
        url = urljoin(baseurl, path)
        try:
            response = requests.get(
                url, params={"facility": facility, "search": username}
            )
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response({})
        except Exception as e:
            raise ValidationError(detail=str(e))
