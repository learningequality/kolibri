import requests
from django.http import Http404
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.decorators import action
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
        return Response(response.text, status=response.status_code)


class ValuesViewset(GenericViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer. At the moment, this is read only.
    """

    # A tuple of values to get from the queryset
    values = None
    # A map of target_key, source_key where target_key is the final target_key that will be set
    # and source_key is the key on the object retrieved from the values call.
    field_map = {}

    def __init__(self, *args, **kwargs):
        viewset = super(ValuesViewset, self).__init__(*args, **kwargs)
        if not isinstance(self.values, tuple):
            raise TypeError("values must be defined as a tuple")
        self._values = tuple(self.values)
        if not isinstance(self.field_map, dict):
            raise TypeError("field_map must be defined as a dict")
        self._field_map = self.field_map.copy()
        return viewset

    def annotate_queryset(self, queryset):
        return queryset

    def prefetch_queryset(self, queryset):
        return queryset

    def _map_fields(self, item):
        for key, value in self._field_map.iteritems():
            if callable(value):
                item[key] = value(item)
            elif value in item:
                item[key] = item.pop(value)
            else:
                item[key] = value
        return item

    def _serialize_queryset(self, queryset):
        queryset = self.annotate_queryset(queryset)
        return queryset.values(*self._values)

    def serialize(self, queryset):
        return map(self._map_fields, self._serialize_queryset(queryset) or [])

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.prefetch_queryset(self.get_queryset()))

        page = self.paginate_queryset(queryset)
        if page is not None:
            data = map(self._map_fields, self._serialize_queryset(page) or [])
            return self.get_paginated_response(data)

        return Response(self.serialize(queryset))

    def serialize_object(self, pk):
        queryset = self.filter_queryset(self.prefetch_queryset(self.get_queryset()))
        try:
            return self._map_fields(self._serialize_queryset(queryset).get(pk=pk))
        except queryset.model.DoesNotExist:
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )

    def retrieve(self, request, pk, *args, **kwargs):
        return Response(self.serialize_object(pk))
