import requests
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from kolibri.core.device.utils import get_device_setting
from kolibri.core.utils.urls import reverse_remote


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
        url = reverse_remote(baseurl, "kolibri:core:publicsearchuser-list")
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


class RemoteFacilityUserAuthenticatedViewset(APIView):
    def post(self, request, *args, **kwargs):
        baseurl = request.data.get("baseurl", request.build_absolute_uri("/"))
        username = request.data.get("username", None)
        facility = request.data.get("facility", None)
        password = request.data.get("password", None)
        if username is None or facility is None:
            raise ValidationError(detail="Both username and facility are required")
        url = reverse_remote(baseurl, "kolibri:core:publicuser-list")
        params = {"facility": facility, "search": username}

        # adding facility so auth works when learners can login without password:
        username = "username={}&facility={}".format(username, facility)

        auth = requests.auth.HTTPBasicAuth(username, password)
        try:
            response = requests.get(url, params=params, verify=False, auth=auth)
            if response.status_code == 200:
                return Response(response.json())
            else:
                return Response({"error": response.json()["detail"]})
        except Exception as e:
            raise ValidationError(detail=str(e))
