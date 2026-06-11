from django.http.response import HttpResponseBadRequest
from rest_framework import views
from rest_framework.response import Response

from kolibri.core.device.permissions import IsSuperuser
from kolibri.utils.server import get_status_from_pid_file
from kolibri.utils.server import restart
from kolibri.utils.server import STATUS_RUNNING


class DeviceRestartView(views.APIView):
    permission_classes = (IsSuperuser,)

    def get(self, request):
        status = get_status_from_pid_file()
        return Response(status)

    def post(self, request):
        status = get_status_from_pid_file()
        if status == STATUS_RUNNING and restart():
            return Response(status)
        return HttpResponseBadRequest(status)
