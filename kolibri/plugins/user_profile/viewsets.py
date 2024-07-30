import requests
from django.contrib.auth import login
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import TokenGenerator
from kolibri.core.auth.models import FacilityUser
from kolibri.core.utils.urls import reverse_remote
from kolibri.utils.urls import validator


class OnMyOwnSetupViewset(APIView):
    """
    Viewset to determine if the facility has been setup as an "On my own setup" facility.
    """

    def get(self, request, format=None):
        if request.user.is_anonymous:
            self.permission_denied(request)
        user_facility = self.request.user.facility
        return Response(
            {
                "on_my_own_setup": user_facility.on_my_own_setup,
            }
        )


class RemoteFacilityUserViewset(APIView):
    def get(self, request):
        baseurl = request.query_params.get("baseurl", "")
        try:
            validator(baseurl)
        except DjangoValidationError as e:
            raise ValidationError(detail=str(e))
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
        baseurl = request.data.get("baseurl", "")
        try:
            validator(baseurl)
        except DjangoValidationError as e:
            raise ValidationError(detail=str(e))
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


class LoginMergedUserViewset(APIView):
    """
    Viewset to login into kolibri using the merged user,
    after the old user has been deleted
    """

    def post(self, request):
        pk = request.data.get("pk", None)
        token = request.data.get("token", None)
        new_user = FacilityUser.objects.get(pk=pk)
        if not TokenGenerator().check_token(new_user.id, token):
            return Response({"error": "Unauthorized"}, status=401)
        login(request, new_user)
        return Response({"success": True})
