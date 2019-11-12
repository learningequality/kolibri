import requests
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from six.moves.urllib.parse import urljoin

from .utils.portal import registerfacility
from kolibri.core.auth.models import Facility
from kolibri.utils import conf


class KolibriDataPortalViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"])
    def register(self, request):
        facility = Facility.objects.get(id=request.data.get("facility_id"))
        try:
            response = registerfacility(request.data.get("token"), facility)
        except requests.exceptions.RequestException as e:  # bubble up any response error
            return Response(e.response.json(), status=e.response.status_code)
        return Response(status=response.status_code)

    @action(detail=False, methods=["get"])
    def validate_token(self, request):
        PORTAL_URL = conf.OPTIONS["Urls"]["DATA_PORTAL_SYNCING_BASE_URL"]
        # token is in query params
        response = requests.get(
            urljoin(PORTAL_URL, "portal/api/public/v1/registerfacility/validate_token"),
            params=request.query_params,
        )
        return Response(response.json(), status=response.status_code)
