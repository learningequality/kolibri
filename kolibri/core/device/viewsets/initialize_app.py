import logging

from django.contrib.auth import login
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect
from django.utils.http import url_has_allowed_host_and_scheme
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import set_app_key_on_response
from kolibri.core.device.utils import valid_app_key

logger = logging.getLogger(__name__)


class NoFacilityFacilityUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacilityUser
        fields = ("username", "full_name", "password")


class InitializeAppView(APIView):
    def get(self, request, token):
        if not valid_app_key(token):
            raise PermissionDenied("You have provided an invalid token")
        auth_token = request.GET.get("auth_token")
        if request.user.is_anonymous and device_provisioned() and auth_token:
            # If we are in app context, then login as the automatically created OS User
            try:
                user = FacilityUser.objects.get_or_create_os_user(auth_token)
                if user is not None:
                    login(request, user)
                else:
                    # If the user is not found, then we should not persist the auth_token
                    auth_token = None
            except ValidationError as e:
                logger.error(e)
        redirect_url = "/"
        next_url = request.GET.get("next")
        if next_url and url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            redirect_url = next_url
        response = HttpResponseRedirect(redirect_url)
        set_app_key_on_response(response, auth_token)
        return response
