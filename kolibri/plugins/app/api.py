import logging

from django.contrib.auth import login
from django.core.exceptions import ValidationError
from django.http import HttpResponseRedirect
from django.utils.http import is_safe_url
from django.utils.http import urlunquote
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import set_app_key_on_response
from kolibri.core.device.utils import valid_app_key
from kolibri.core.device.utils import valid_app_key_on_request
from kolibri.plugins.app.utils import interface
from kolibri.plugins.app.utils import SHARE_FILE


logger = logging.getLogger(__name__)


class FromAppContextPermission(BasePermission):
    def has_permission(self, request, view):
        return valid_app_key_on_request(request)


class AppCommandsViewset(ViewSet):

    permission_classes = (FromAppContextPermission,)

    if SHARE_FILE in interface:

        @action(detail=False, methods=["post"])
        def share_file(self, request):
            filename = request.data.get("filename")
            message = request.data.get("message")
            if filename is None or message is None:
                raise APIException(
                    "filename and message parameters must be defined", code=412
                )
            interface.share_file(filename, message)
            return Response()


class InitializeAppView(APIView):
    def get(self, request, token):
        if not valid_app_key(token):
            raise PermissionDenied("You have provided an invalid token")
        auth_token = request.GET.get("auth_token")
        if request.user.is_anonymous() and device_provisioned() and auth_token:
            # If we are in app context, then login as the automatically created OS User
            try:
                user = FacilityUser.objects.get_or_create_os_user(auth_token)
                if user is not None:
                    login(request, user)
            except ValidationError as e:
                logger.error(e)
        redirect_url = request.GET.get("next", "/")
        # Copied and modified from https://github.com/django/django/blob/stable/1.11.x/django/views/i18n.py#L40
        if (redirect_url or not request.is_ajax()) and not is_safe_url(
            url=redirect_url,
            allowed_hosts={request.get_host()},
            require_https=request.is_secure(),
        ):
            redirect_url = request.META.get("HTTP_REFERER")
            if redirect_url:
                redirect_url = urlunquote(redirect_url)  # HTTP_REFERER may be encoded.
            if not is_safe_url(
                url=redirect_url,
                allowed_hosts={request.get_host()},
                require_https=request.is_secure(),
            ):
                redirect_url = "/"
        response = HttpResponseRedirect(redirect_url)
        set_app_key_on_response(response, auth_token)
        return response
