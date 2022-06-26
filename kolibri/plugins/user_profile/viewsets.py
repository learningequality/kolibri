import requests
from django.core.urlresolvers import reverse
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from six.moves.urllib.parse import urljoin

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
