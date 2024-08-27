from django.contrib.auth import login
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import TokenGenerator
from kolibri.core.auth.models import FacilityUser


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
