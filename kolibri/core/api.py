import requests
from django.http import Http404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.status import HTTP_201_CREATED
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
        # handle any invalid json type responses
        try:
            data = response.json()
        except ValueError:
            data = response.content
        return Response(data, status=response.status_code)


class ValuesViewset(viewsets.ModelViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer.
    """

    # A tuple of values to get from the queryset
    values = None
    # A map of target_key, source_key where target_key is the final target_key that will be set
    # and source_key is the key on the object retrieved from the values call.
    field_map = {}

    # Create a read only property rather than creating separate viewsets
    read_only = False

    def __init__(self, *args, **kwargs):
        viewset = super(ValuesViewset, self).__init__(*args, **kwargs)
        if not isinstance(self.values, tuple):
            raise TypeError("values must be defined as a tuple")
        self._values = tuple(self.values)
        if not isinstance(self.field_map, dict):
            raise TypeError("field_map must be defined as a dict")
        self._field_map = self.field_map.copy()
        return viewset

    def get_serializer_class(self):
        if self.serializer_class is not None:
            return self.serializer_class
        # Hack to prevent the renderer logic from breaking completely.
        return Serializer

    def annotate_queryset(self, queryset):
        return queryset

    def prefetch_queryset(self, queryset):
        return queryset

    def _map_fields(self, item):
        for key, value in self._field_map.items():
            if callable(value):
                item[key] = value(item)
            elif value in item:
                item[key] = item.pop(value)
            else:
                item[key] = value
        return item

    def consolidate(self, items):
        return items

    def _serialize_queryset(self, queryset):
        queryset = self.annotate_queryset(queryset)
        return queryset.values(*self._values)

    def serialize(self, queryset):
        return self.consolidate(
            list(map(self._map_fields, self._serialize_queryset(queryset) or []))
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.prefetch_queryset(self.get_queryset()))

        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.serialize(page))

        return Response(self.serialize(queryset))

    def serialize_object(self, pk):
        queryset = self.filter_queryset(self.prefetch_queryset(self.get_queryset()))
        try:
            return self.serialize(queryset.filter(pk=pk))[0]
        except IndexError:
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )

    def retrieve(self, request, pk, *args, **kwargs):
        return Response(self.serialize_object(pk))

    def create(self, request, *args, **kwargs):
        if self.read_only:
            raise MethodNotAllowed
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        instance = serializer.instance
        return Response(
            self.serialize_object(instance.id), status=HTTP_201_CREATED, headers=headers
        )

    def update(self, request, *args, **kwargs):
        if self.read_only:
            raise MethodNotAllowed
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(self.serialize_object(instance.id))
