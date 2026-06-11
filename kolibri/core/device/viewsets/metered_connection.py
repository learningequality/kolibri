from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from kolibri.core.device.utils import using_metered_connection


class CheckMeteredConnectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(using_metered_connection())
