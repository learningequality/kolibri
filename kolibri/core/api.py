import uuid

import requests
from django.http import Http404
from django.http.request import QueryDict
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.generics import get_object_or_404
from rest_framework.mixins import CreateModelMixin as BaseCreateModelMixin
from rest_framework.mixins import DestroyModelMixin
from rest_framework.mixins import UpdateModelMixin as BaseUpdateModelMixin
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import Serializer
from rest_framework.serializers import UUIDField
from rest_framework.serializers import ValidationError
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_503_SERVICE_UNAVAILABLE
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
        try:
            # token is in query params
            response = requests.get(
                urljoin(
                    PORTAL_URL, "portal/api/public/v1/registerfacility/validate_token"
                ),
                params=request.query_params,
            )
        except requests.exceptions.ConnectionError:
            return Response({"status": "offline"}, status=HTTP_503_SERVICE_UNAVAILABLE)
        # handle any invalid json type responses
        try:
            data = response.json()
        except ValueError:
            data = response.content
        return Response(data, status=response.status_code)


class ValuesViewsetOrderingFilter(OrderingFilter):
    def get_default_valid_fields(self, queryset, view, context=None):
        """
        The original implementation of this makes the assumption that the DRF serializer for the class
        encodes all the serialization behaviour for the viewset:
        https://github.com/encode/django-rest-framework/blob/version-3.12.2/rest_framework/filters.py#L208

        With the ValuesViewset, this is no longer the case so here we do an equivalent mapping from the values
        defined by the values viewset, with consideration for the mapped fields.

        Importantly, we filter out values that have not yet been annotated on the queryset, so if an annotated
        value is requried for ordering, it should be defined in the get_queryset method of the viewset, and not
        the annotate_queryset method, which is executed after filtering.
        """
        if context is None:
            context = {}
        default_fields = set()
        # All the fields that we have field maps defined for - this only allows for simple mapped fields
        # where the field is essentially a rename, as we have no good way of doing ordering on a field that
        # that is doing more complex function based mapping.
        mapped_fields = {v: k for k, v in view.field_map.items() if isinstance(v, str)}
        # All the fields of the model
        model_fields = {f.name for f in queryset.model._meta.get_fields()}
        # Loop through every value in the view's values tuple
        for field in view.values:
            # If the value is for a foreign key lookup, we split it here to make sure that the first relation key
            # exists on the model - it's unlikely this would ever not be the case, as otherwise the viewset would
            # be returning 500s.
            fk_ref = field.split("__")[0]
            # Check either if the field is a model field, a currently annotated annotation, or
            # is a foreign key lookup on an FK on this model.
            if (
                field in model_fields
                or field in queryset.query.annotations
                or fk_ref in model_fields
            ):
                # If the field is a mapped field, we store the field name as returned to the client
                # not the actual internal field - this will later be mapped when we come to do the ordering.
                if field in mapped_fields:
                    default_fields.add((mapped_fields[field], mapped_fields[field]))
                else:
                    default_fields.add((field, field))

        return default_fields

    def remove_invalid_fields(self, queryset, fields, view, request):
        """
        Modified from https://github.com/encode/django-rest-framework/blob/version-3.12.2/rest_framework/filters.py#L259
        to do filtering based on valuesviewset setup
        """
        # We filter the mapped fields to ones that do simple string mappings here, any functional maps are excluded.
        mapped_fields = {k: v for k, v in view.field_map.items() if isinstance(v, str)}
        valid_fields = [
            item[0]
            for item in self.get_valid_fields(queryset, view, {"request": request})
        ]
        ordering = []
        for term in fields:
            if term.lstrip("-") in valid_fields:
                if term.lstrip("-") in mapped_fields:
                    # In the case that the ordering field is a mapped field on the values viewset
                    # we substitute the serialized name of the field for the database name.
                    prefix = "-" if term[0] == "-" else ""
                    new_term = prefix + mapped_fields[term.lstrip("-")]
                    ordering.append(new_term)
                else:
                    ordering.append(term)
        if len(ordering) > 1:
            raise ValidationError("Can only define a single ordering field")
        return ordering


class BaseValuesViewset(viewsets.GenericViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer.
    """

    # A tuple of values to get from the queryset
    # values = None
    # A map of target_key, source_key where target_key is the final target_key that will be set
    # and source_key is the key on the object retrieved from the values call.
    # Alternatively, the source_key can be a callable that will be passed the object and return
    # the value for the target_key. This callable can also pop unwanted values from the obj
    # to remove unneeded keys from the object as a side effect.
    field_map = {}

    def __init__(self, *args, **kwargs):
        super(BaseValuesViewset, self).__init__(*args, **kwargs)
        if not hasattr(self, "values") or not isinstance(self.values, tuple):
            raise TypeError("values must be defined as a tuple")
        self._values = tuple(self.values)
        if not isinstance(self.field_map, dict):
            raise TypeError("field_map must be defined as a dict")
        self._field_map = self.field_map.copy()

    def generate_serializer(self):
        queryset = getattr(self, "queryset", None)
        if queryset is None:
            try:
                queryset = self.get_queryset()
            except Exception:
                pass
        model = getattr(queryset, "model", None)
        if model is None:
            return Serializer
        mapped_fields = {v: k for k, v in self.field_map.items() if isinstance(v, str)}
        fields = []
        extra_kwargs = {}
        for value in self.values:
            try:
                model._meta.get_field(value)
                if value in mapped_fields:
                    extra_kwargs[mapped_fields[value]] = {"source": value}
                    value = mapped_fields[value]
                fields.append(value)
            except Exception:
                pass

        meta = type(
            "Meta",
            (object,),
            {
                "fields": fields,
                "read_only_fields": fields,
                "model": model,
                "extra_kwargs": extra_kwargs,
            },
        )
        CustomSerializer = type(
            "{}Serializer".format(self.__class__.__name__),
            (ModelSerializer,),
            {"Meta": meta},
        )

        return CustomSerializer

    def get_serializer_class(self):
        if self.serializer_class is not None:
            return self.serializer_class
        # Hack to prevent the renderer logic from breaking completely.
        self.__class__.serializer_class = self.generate_serializer()
        return self.__class__.serializer_class

    def _get_lookup_filter(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        if lookup_url_kwarg not in self.kwargs:
            raise AssertionError(
                "Expected view %s to be called with a URL keyword argument "
                'named "%s". Fix your URL conf, or set the `.lookup_field` '
                "attribute on the view correctly."
                % (self.__class__.__name__, lookup_url_kwarg)
            )

        return {self.lookup_field: self.kwargs[lookup_url_kwarg]}

    def _get_object_from_queryset(self, queryset):
        """
        Returns the object the view is displaying.
        We override this to remove the DRF default behaviour
        of filtering the queryset.
        (rtibbles) There doesn't seem to be a use case for
        querying a detail endpoint and also filtering by query
        parameters that might result in a 404.
        """
        # Perform the lookup filtering.
        filter_kwargs = self._get_lookup_filter()
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj

    def get_object(self):
        return self._get_object_from_queryset(self.get_queryset())

    def annotate_queryset(self, queryset):
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

    def consolidate(self, items, queryset):
        return items

    def serialize(self, queryset):
        queryset = self.annotate_queryset(queryset)
        values_queryset = queryset.values(*self._values)
        return self.consolidate(
            list(map(self._map_fields, values_queryset or [])), queryset
        )

    def serialize_object(self, **filter_kwargs):
        queryset = self.get_queryset()
        try:
            filter_kwargs = filter_kwargs or self._get_lookup_filter()
            return self.serialize(queryset.filter(**filter_kwargs))[0]
        except IndexError:
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )


class QueryParamRequest(Request):
    def __init__(self, query_params, *args, **kwargs):
        super(QueryParamRequest, self).__init__(*args, **kwargs)
        self._query_params = QueryDict(mutable=True)
        for key, value in query_params.items():
            self._query_params[key] = (
                ",".join(value) if isinstance(value, (list, set)) else value
            )
        self._query_params._mutable = False

    @property
    def query_params(self):
        return self._query_params


def _generate_request(request, query_params, method="GET"):
    ret = QueryParamRequest(
        query_params,
        request=request._request,
        parsers=request.parsers,
        authenticators=request.authenticators,
        negotiator=request.negotiator,
        parser_context=request.parser_context,
    )
    ret._data = request._data
    ret._files = request._files
    ret._full_data = request._full_data
    ret._content_type = request._content_type
    ret._stream = request._stream
    ret.method = method
    if hasattr(request, "_user"):
        ret._user = request._user
    if hasattr(request, "_auth"):
        ret._auth = request._auth
    if hasattr(request, "_authenticator"):
        ret._authenticator = request._authenticator
    if hasattr(request, "accepted_renderer"):
        ret.accepted_renderer = request.accepted_renderer
    if hasattr(request, "accepted_media_type"):
        ret.accepted_media_type = request.accepted_media_type
    if hasattr(request, "version"):
        ret.version = request.version
    if hasattr(request, "versioning_scheme"):
        ret.versioning_scheme = request.versioning_scheme
    return ret


class ListModelMixin(object):
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page_queryset = self.paginate_queryset(queryset)

        if page_queryset is not None:
            queryset = page_queryset

        if page_queryset is not None:
            return self.get_paginated_response(self.serialize(queryset))

        return Response(self.serialize(queryset))

    def serialize_list(self, request, query_params=None, *args, **kwargs):
        """
        A method to allow serialization of objects for use outside of a regular
        request/response cycle - useful for obtaining identical serialized responses
        in a composite view that returns data from multiple viewsets at once.
        """
        self.request = _generate_request(request, query_params or {})
        response = self.list(self.request)
        return response.data


class RetrieveModelMixin(object):
    def retrieve(self, request, *args, **kwargs):
        return Response(self.serialize_object())


class ReadOnlyValuesViewset(BaseValuesViewset, RetrieveModelMixin, ListModelMixin):
    pass


class CreateModelMixin(BaseCreateModelMixin):
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        return Response(self.serialize_object(pk=instance.pk), status=HTTP_201_CREATED)


class UpdateModelMixin(BaseUpdateModelMixin):
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(self.serialize_object())


class ValuesViewset(
    ReadOnlyValuesViewset, CreateModelMixin, UpdateModelMixin, DestroyModelMixin
):
    pass


class HexUUIDField(UUIDField):
    def __init__(self, **kwargs):
        kwargs["format"] = "hex"
        super(HexUUIDField, self).__init__(**kwargs)

    def to_internal_value(self, data):
        return super(HexUUIDField, self).to_internal_value(data).hex

    def to_representation(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value
