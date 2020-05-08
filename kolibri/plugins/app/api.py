from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from kolibri.plugins.app.utils import interface
from kolibri.plugins.app.utils import LAUNCH_INTENT


class FromSameDevicePermissions(permissions.BasePermission):
    """
    Allow only users on the same device as the server
    """

    def has_permission(self, request, view):
        return request.META.get("REMOTE_ADDR") == "127.0.0.1"


class AppCommandsViewset(viewsets.ViewSet):

    permission_classes = (FromSameDevicePermissions,)

    if LAUNCH_INTENT in interface:

        @action(detail=False, methods=["post"])
        def launch_intent(self, request):
            filename = request.data.get("filename")
            message = request.data.get("message")
            if filename is None or message is None:
                raise APIException(
                    "filename and message parameters must be defined", code=412
                )
            interface.launch_intent(filename, message)
            return Response()
