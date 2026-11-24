import os
import sys
from typing import ClassVar

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.exceptions import APIException
from rest_framework.exceptions import ErrorDetail
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from kolibri.core import error_constants
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.permissions import NotProvisionedHasPermission
from kolibri.utils import conf
from kolibri.utils import port_election
from kolibri.utils import server
from kolibri.utils.options import option_spec

CANNOT_RESTART = "CANNOT_RESTART"
ENVIRONMENT_VARIABLE = "ENVIRONMENT_VARIABLE"
COMMAND_LINE = "COMMAND_LINE"
ADVERTISED_HTTP_PORT = "ADVERTISED_HTTP_PORT"

_FAILURE_ERROR_IDS = {
    port_election.IN_USE: error_constants.PORT_IN_USE,
    port_election.IN_USE_BY_PROCESS: error_constants.PORT_IN_USE_BY_PROCESS,
    port_election.IN_USE_BY_USER: error_constants.PORT_IN_USE_BY_USER,
    port_election.PERMISSION_DENIED: error_constants.PORT_PERMISSION_DENIED,
    port_election.UNAVAILABLE: error_constants.PORT_UNAVAILABLE,
}


def _readonly_reason(served_port):
    deployment = conf.OPTIONS["Deployment"]
    if (
        not deployment["RESTART_HOOKS"]
        or served_port is None
        or server.get_pid() != os.getpid()
    ):
        return CANNOT_RESTART
    if any(
        envvar in os.environ
        for envvar in option_spec["Deployment"]["HTTP_PORT"]["envvars"]
    ):
        return ENVIRONMENT_VARIABLE
    if any(arg == "--port" or arg.startswith("--port=") for arg in sys.argv):
        return COMMAND_LINE
    if deployment["ADVERTISED_HTTP_PORT"]:
        return ADVERTISED_HTTP_PORT
    return None


class _HttpPortSerializer(serializers.Serializer):
    port = serializers.IntegerField(min_value=1, max_value=65535)


@method_decorator(csrf_protect, name="dispatch")
class HttpPortViewSet(viewsets.ViewSet):
    permission_classes: ClassVar[list] = [NotProvisionedHasPermission | IsSuperuser]

    def list(self, request):
        served_port = server.get_port()
        return Response(
            {
                "port": served_port or conf.OPTIONS["Deployment"]["HTTP_PORT"],
                "readonly_reason": _readonly_reason(served_port),
            }
        )

    def create(self, request):
        served_port = server.get_port()
        if _readonly_reason(served_port) is not None:
            raise PermissionDenied()
        serializer = _HttpPortSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        port = serializer.validated_data["port"]
        failure = port_election.claim_http_port(port, serving_port=served_port)
        if failure is not None:
            raise ValidationError(
                {
                    "port": [
                        ErrorDetail(
                            failure.detail or "",
                            code=_FAILURE_ERROR_IDS[failure.code],
                        )
                    ]
                }
            )
        if not server.restart():
            raise APIException()
        return Response({"port": port})
