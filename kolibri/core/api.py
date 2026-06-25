"""
Kolibri API base classes and utilities.

IMPORTANT: Most Kolibri APIs are internal and unstable, designed for Kolibri's own use.
They may change without notice. Do not build external applications that depend on these APIs.

EXCEPTION: Public APIs under /public/ URLs are maintained with backwards compatibility.
See kolibri/core/public/api_urls.py for the public API definitions.

For more information, see: docs/backend_architecture/index.rst
"""

import operator
import threading
import uuid
from collections import defaultdict
from contextlib import contextmanager
from itertools import groupby
from typing import Any
from typing import Dict
from typing import List
from typing import Optional

from django.conf import settings
from django.http import Http404
from django.http.request import QueryDict
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
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

from kolibri.core import error_constants
from kolibri.core.auth.models import Facility
from kolibri.core.auth.tasks import enqueue_automatic_kdp_sync
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.utils.serializer_introspection import derive_values_from_serializer
from kolibri.core.utils.serializer_introspection import normalize_field_map
from kolibri.core.utils.serializer_introspection import ValuesMethodField  # noqa: F401
from kolibri.utils import conf

from .utils.portal import registerfacility

# Error constants the portal returns that the frontend matches on - the only
# parts of a portal error body that are reflected to the client.
PORTAL_REFLECTED_ERRORS = (
    error_constants.INVALID_KDP_REGISTRATION_TOKEN,
    error_constants.ALREADY_REGISTERED_FOR_COMMUNITY,
)


def _portal_error_response(response):
    """
    Build the response to return to the client for an error response from the
    portal, reflecting only recognized error constants from the body. No
    response, or a non-JSON body (e.g. a CDN error page), is treated as a
    network-level failure.
    """
    offline = Response({"status": "offline"}, status=HTTP_503_SERVICE_UNAVAILABLE)
    if response is None:
        return offline
    try:
        data = response.json()
    except ValueError:
        return offline
    if not isinstance(data, list):
        data = []
    errors = [
        {"id": error["id"]}
        for error in data
        if isinstance(error, dict) and error.get("id") in PORTAL_REFLECTED_ERRORS
    ]
    return Response(errors, status=response.status_code)


class KolibriDataPortalViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"])
    def register(self, request):
        facility = Facility.objects.get(id=request.data.get("facility_id"))
        try:
            response = registerfacility(request.data.get("token"), facility)
        except NetworkLocationResponseFailure as e:
            return _portal_error_response(e.response)
        except NetworkClientError:
            return Response({"status": "offline"}, status=HTTP_503_SERVICE_UNAVAILABLE)
        enqueue_automatic_kdp_sync(facility)
        return Response(status=response.status_code)

    @action(detail=False, methods=["get"])
    def validate_token(self, request):
        PORTAL_URL = conf.OPTIONS["Urls"]["DATA_PORTAL_SYNCING_BASE_URL"]
        try:
            # token is in query params
            client = NetworkClient(PORTAL_URL)
            response = client.get(
                "portal/api/public/v1/registerfacility/validate_token",
                params=request.query_params,
            )
        except NetworkLocationResponseFailure as e:
            return _portal_error_response(e.response)
        except NetworkClientError:
            return Response({"status": "offline"}, status=HTTP_503_SERVICE_UNAVAILABLE)
        try:
            data = response.json()
        except ValueError:
            return Response({"status": "offline"}, status=HTTP_503_SERVICE_UNAVAILABLE)
        name = data.get("name") if isinstance(data, dict) else None
        return Response({"name": name})


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
        db_columns = view._field_map.db_column_map()
        # Invert to get {db_col: api_name} for non-promoted renames whose DB column
        # appears in _values rather than the client-facing name.
        db_col_to_api = {v: k for k, v in db_columns.items()}
        # All the fields of the model
        model_fields = {f.name for f in queryset.model._meta.get_fields()}
        # Loop through every value in the view's values tuple
        for field in view._values:
            # db_column_map() returns the true DB column for renamed fields; for
            # SQL-promoted renames _values holds the alias, so we resolve it back.
            db_source = db_columns.get(field, field)
            # If the value is for a foreign key lookup, we split it here to make sure that the first relation key
            # exists on the model - it's unlikely this would ever not be the case, as otherwise the viewset would
            # be returning 500s.
            fk_ref = db_source.split("__")[0]
            # Check either if the field is a model field, a currently annotated annotation, or
            # is a foreign key lookup on an FK on this model.
            if (
                db_source in model_fields
                or field in queryset.query.annotations
                or fk_ref in model_fields
            ):
                # Expose the client-facing name, not the internal DB column.
                api_name = db_col_to_api.get(field, field)
                default_fields.add((api_name, api_name))

        return default_fields

    def remove_invalid_fields(self, queryset, fields, view, request):
        """
        Modified from https://github.com/encode/django-rest-framework/blob/version-3.12.2/rest_framework/filters.py#L259
        to do filtering based on valuesviewset setup
        """
        db_columns = view._field_map.db_column_map()
        valid_fields = [
            item[0]
            for item in self.get_valid_fields(queryset, view, {"request": request})
        ]
        ordering = []
        for term in fields:
            field_name = term.lstrip("-")
            if field_name in valid_fields:
                prefix = "-" if term[0] == "-" else ""
                db_col = db_columns.get(field_name)
                if db_col is not None:
                    # Translate the client-facing name to its DB column for ORDER BY.
                    ordering.append(prefix + db_col)
                else:
                    ordering.append(term)
        if len(ordering) > 1:
            raise ValidationError("Can only define a single ordering field")
        return ordering


class _ThreadLocalContext(threading.local):
    """
    A dict-like context whose contents are thread-local — writes by one
    thread don't leak to others. Used as the ``context`` on a shared cached
    serializer so the same instance can safely carry per-request context
    (``request``, ``view``, ``format``) on each worker thread without
    per-request allocation.

    Inheriting from ``threading.local`` gives every thread its own
    ``self.__dict__``; the dict-like protocol proxies straight to it.

    ``BaseValuesViewset.serialize()`` populates this from
    ``get_serializer_context()`` before running the pipeline and clears it
    on exit.
    """

    def __getitem__(self, key):
        return self.__dict__[key]

    def __setitem__(self, key, value):
        self.__dict__[key] = value

    def __delitem__(self, key):
        del self.__dict__[key]

    def __contains__(self, key):
        return key in self.__dict__

    def __iter__(self):
        return iter(self.__dict__)

    def __len__(self):
        return len(self.__dict__)

    def __repr__(self):
        return repr(self.__dict__)

    def get(self, key, default=None):
        return self.__dict__.get(key, default)

    def keys(self):
        return self.__dict__.keys()

    def values(self):
        return self.__dict__.values()

    def items(self):
        return self.__dict__.items()

    def update(self, *args, **kwargs):
        self.__dict__.update(*args, **kwargs)

    def setdefault(self, key, default=None):
        return self.__dict__.setdefault(key, default)

    def pop(self, key, *args):
        return self.__dict__.pop(key, *args)

    def clear(self):
        self.__dict__.clear()


class BaseValuesViewset(viewsets.GenericViewSet):
    """
    A viewset that uses a values call to get all model/queryset data in
    a single database query, rather than delegating serialization to a
    DRF ModelSerializer.

    Values can be specified explicitly via the `values` attribute, or derived
    automatically from the serializer_class field definitions.

    To use serializer-derived values:
    1. Define serializer_class with proper field source attributes
    2. Do NOT define a `values` attribute (or set it to None)
    3. Optionally set `deferred_fields` for nested serializers to fetch separately
    """

    # A tuple of values to get from the queryset.
    # If not defined, values will be derived from serializer_class on first
    # instantiation via _ensure_initialized.

    # A map of target_key, source_key where target_key is the final target_key that will be set
    # and source_key is the key on the object retrieved from the values call.
    # Alternatively, the source_key can be a callable that will be passed the object and return
    # the value for the target_key. This callable can also pop unwanted values from the obj
    # to remove unneeded keys from the object as a side effect.
    # For derived pattern, this is built automatically from serializer renames.

    # Tuple of nested serializer field names that should be fetched separately
    # rather than joined in the main query. These fields are handled in consolidate().
    deferred_fields = ()

    # Cached itemgetter for pk_field, used in _auto_consolidate for fast groupby
    _pk_getter = None
    # Cached many=True nested info for groupby consolidation
    _joined_many = ()
    # Cached serializer instance used for introspection and for invoking
    # ``ValuesMethodField`` bound methods. The instance is shared across
    # requests; its ``context`` is a ``_ThreadLocalContext`` so per-request
    # values don't leak between threads.
    _cached_serializer = None
    # Thread-local context object attached to ``_cached_serializer.context``.
    # ``serialize()`` populates it from ``get_serializer_context()`` and
    # clears it on exit.
    _serializer_context = None
    # Cached derived info for deferred fields, keyed by serializer_path.
    # Defaults to None; set per-class by _ensure_initialized.
    _nested_derived_cache = None
    # Cached validation schema for DEBUG mode: (expected_fields, nested_schemas)
    # Built once during _ensure_initialized to avoid per-request recomputation.
    _validation_schema = None
    # Whether this class derives its values from serializer_class. Legacy
    # explicit-values viewsets may pair a write-oriented serializer with a
    # different read shape, so DEBUG output validation only applies when True.
    _serializer_derived = False
    # Whether _ensure_initialized has run for this class
    _initialized = False
    # Guards _ensure_initialized for this class; each subclass gets its own
    # lock via __init_subclass__ so it isn't shared through the MRO.
    _initialization_lock = threading.Lock()

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls._initialization_lock = threading.Lock()

    @classmethod
    def _get_own(cls, attr, default=None):
        """
        Get attr from this class's own dict, ignoring MRO inheritance.

        Prevents dynamically cached class attributes (e.g. serializer_class
        set by get_serializer_class()) from leaking to child classes.
        """
        return cls.__dict__.get(attr, default)

    @classmethod
    def _ensure_initialized(cls):
        """
        Run once per concrete subclass on first instantiation.

        Deferred from __init_subclass__ to avoid instantiating serializers
        (which may reference querysets) at class definition / import time.

        Double-checked locking: the unlocked fast path avoids lock overhead
        on every instantiation once initialized; the re-check inside the
        lock ensures the initialization work runs exactly once per class,
        including under free-threaded Python (3.13+ no-GIL).
        """
        if cls._get_own("_initialized", False):
            return

        with cls._initialization_lock:
            if cls._get_own("_initialized", False):
                return
            cls._do_initialize()

    @classmethod
    def _do_initialize(cls):
        cls._serializer_context = _ThreadLocalContext()

        has_explicit_values = isinstance(getattr(cls, "values", None), tuple)
        serializer_class = getattr(cls, "serializer_class", None)
        cls._serializer_derived = not has_explicit_values

        if has_explicit_values:
            cls._values = tuple(cls.values)
            if not hasattr(cls, "field_map"):
                cls.field_map = {}
            # Normalize legacy str/callable entries to canonical entry
            # objects (SourceFieldEntry/CallableFieldEntry). Produces a
            # fresh _LegacyFieldMap so post-init mutation of cls.field_map
            # doesn't leak into instance serialization.
            cls._field_map = normalize_field_map(cls.field_map)
        elif serializer_class is not None:
            cls._cached_serializer = serializer_class(context=cls._serializer_context)
            (
                cls._values,
                cls._field_map,
                cls._joined_many,
                cls._nested_derived_cache,
            ) = derive_values_from_serializer(
                cls._cached_serializer,
                deferred_fields=cls.deferred_fields,
                check_constraints=settings.DEBUG,
            )
            # Auto-derived: keep _values/_field_map only on cls. Writing to
            # ``cls.values`` here would expose the tuple to subclasses via MRO
            # so ``has_explicit_values`` would mis-detect it as user-supplied,
            # routing the child into the explicit-values path and skipping
            # serializer derivation against its own ``serializer_class``.
            cls._values = tuple(cls._values)
        else:
            raise TypeError(
                "Either 'values' tuple or 'serializer_class' must be defined"
            )

        # Cache pk itemgetter from queryset
        queryset = getattr(cls, "queryset", None)
        if queryset is not None and hasattr(queryset, "model"):
            cls._pk_getter = operator.itemgetter(queryset.model._meta.pk.name)

        # Cache validation schema for DEBUG mode — serializer-derived
        # viewsets only; the serializer is the read contract for them.
        if settings.DEBUG and cls._serializer_derived:
            cls._validation_schema = cls._build_validation_schema(
                cls._cached_serializer
            )

        cls._initialized = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__class__._ensure_initialized()

    def get_serializer_context(self):
        """
        Return the serializer context for this request.

        Overrides DRF's default to tolerate programmatic invocation outside
        the request cycle (tests, inline usage): ``request``, ``view``, and
        ``format`` default to ``None`` if the viewset hasn't been dispatched.
        """
        return {
            "request": getattr(self, "request", None),
            "view": self,
            "format": getattr(self, "format_kwarg", None),
        }

    @contextmanager
    def _serializer_context_scope(self):
        """
        Populate the thread-local serializer context for the duration of a
        serialization pipeline, clearing it on exit. Re-entrant: nested
        scopes (e.g. ``serialize_queryset`` invoked from ``consolidate``)
        are no-ops, so the outer scope's context survives until its own
        exit.
        """
        already_set = bool(self._serializer_context)
        if not already_set:
            self._serializer_context.update(self.get_serializer_context())
        try:
            yield
        finally:
            if not already_set:
                self._serializer_context.clear()

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
        # {source: target} for plain renames, so values can be exposed
        # under the declared name.
        mapped_fields = self._field_map.plain_renames() if self._field_map else {}
        fields = []
        extra_kwargs = {}
        for value in self._values:
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
        # Generate a serializer for DRF schema/renderer compatibility.
        # Cached on _generated_serializer_class (not serializer_class) to
        # avoid leaking to child classes via MRO.
        cls = self.__class__
        generated = cls._get_own("_generated_serializer_class")
        if generated is None:
            generated = self.generate_serializer()
            cls._generated_serializer_class = generated
        return generated

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

    def annotate_queryset(self, queryset):
        return queryset

    def get_nested_serializer(self, path: str):
        """
        Resolve a dotted path to a nested serializer.

        Args:
            path: Dotted path like 'roles' or 'children__grandchildren'

        Returns:
            The nested serializer instance

        Raises:
            KeyError: If path doesn't resolve to a valid nested serializer
        """
        if self._cached_serializer is None:
            raise AttributeError(
                "get_nested_serializer requires serializer-derived values"
            )
        serializer = self._cached_serializer
        for part in path.split("__"):
            field = serializer.fields[part]
            # Handle many=True (ListSerializer wraps the actual serializer)
            if hasattr(field, "child"):
                serializer = field.child
            else:
                serializer = field

        return serializer

    def _group_items(
        self, items: List[Dict[str, Any]], group_by: str
    ) -> Dict[Any, List[Dict[str, Any]]]:
        """
        Group items by a field value.

        Args:
            items: List of dictionaries
            group_by: Field name to group by

        Returns:
            Dict mapping group_by values to lists of items
        """
        result: Dict[Any, List[Dict[str, Any]]] = defaultdict(list)
        for item in items:
            result[item.get(group_by)].append(item)
        return dict(result)

    @staticmethod
    def _serialize_flat(queryset, values, field_map):
        """Base serialization: values() call + field mapping."""
        queryset = field_map.annotate_queryset(queryset)
        if field_map.is_noop():
            return list(queryset.values(*values))
        return [field_map.map_row(item) for item in queryset.values(*values)]

    def serialize_queryset(
        self,
        queryset,
        serializer_path: Optional[str] = None,
        *,
        group_by: Optional[str] = None,
    ):
        """
        Serialize any queryset using a serializer's field definitions.

        Args:
            queryset: Any Django queryset
            serializer_path: Dotted path to nested serializer (e.g., 'roles'
                or 'files'); ``None`` selects the viewset's own top-level
                serializer.
            group_by: Optional field to group results by (returns dict of key -> [items])

        Returns:
            List of serialized items, or Dict {group_key: [items]} if group_by specified
        """
        if serializer_path is None:
            values = self._values
            field_map = self._field_map
            joined_many = self._joined_many
            pk_getter = self._pk_getter
            if pk_getter is None:
                # Class-level queryset wasn't resolvable at init time
                # (viewset uses get_queryset()); cache it now so subsequent
                # calls skip the lookup.
                pk_getter = operator.itemgetter(queryset.model._meta.pk.name)
                self.__class__._pk_getter = pk_getter
        else:
            if self._nested_derived_cache is None:
                raise AttributeError(
                    "serialize_queryset requires serializer-derived values"
                )
            values, field_map, joined_many = self._nested_derived_cache[serializer_path]
            pk_getter = operator.itemgetter(queryset.model._meta.pk.name)

        with self._serializer_context_scope():
            items = self._serialize_flat(queryset, values, field_map)
            items = self._auto_consolidate(items, joined_many, pk_getter)

        # Group if requested
        if group_by is not None:
            return self._group_items(items, group_by)

        return items

    @staticmethod
    def _build_validation_schema(serializer):
        """
        Build a cached validation schema from a serializer.

        Returns (expected_fields, nested_schemas) where:
        - expected_fields: frozenset of field names (excluding write_only)
        - nested_schemas: dict mapping field_name to nested schema tuples
        """
        expected_fields = set()
        nested_schemas = {}

        for field_name, field in serializer.fields.items():
            if getattr(field, "write_only", False):
                continue
            expected_fields.add(field_name)
            if hasattr(field, "child") and isinstance(field.child, Serializer):
                nested_schemas[field_name] = BaseValuesViewset._build_validation_schema(
                    field.child
                )
            elif isinstance(field, Serializer):
                nested_schemas[field_name] = BaseValuesViewset._build_validation_schema(
                    field
                )

        return (frozenset(expected_fields), nested_schemas)

    def _validate_output(self, items: List[Dict[str, Any]]) -> None:
        """
        Validate serialized output matches serializer contract.

        Only intended for use in DEBUG mode to catch drift between
        consolidate() implementation and serializer declarations.

        Uses the cached _validation_schema when available (built during
        _ensure_initialized), falling back to building from the serializer.

        Only applies to serializer-derived viewsets — legacy explicit-values
        viewsets may pair a write-oriented serializer with a different read
        shape, so the serializer is not their read contract.
        """
        if not items or not self._serializer_derived:
            return

        schema = self._validation_schema
        if schema is None:
            # Class was initialized under DEBUG=False; build from the
            # serializer cached during derivation.
            schema = self._build_validation_schema(self._cached_serializer)

        self._validate_items_against_schema(items, schema)

    @staticmethod
    def _validate_items_against_schema(
        items: List[Dict[str, Any]],
        schema,
    ) -> None:
        """
        Validate items against a cached validation schema.

        Only checks the first item since all rows from values() have
        uniform keys — one item is enough to catch schema drift.
        Recurses into nested schemas.
        """
        if not items:
            return

        expected_fields, nested_schemas = schema
        item = items[0]
        item_keys = set(item.keys())

        missing = expected_fields - item_keys
        if missing:
            raise ValueError(
                "Missing fields in output: {}. Expected: {}, Got: {}".format(
                    missing, expected_fields, item_keys
                )
            )

        extra = item_keys - expected_fields
        if extra:
            raise ValueError(
                "Unexpected fields in output: {}. Expected: {}, Got: {}".format(
                    extra, expected_fields, item_keys
                )
            )

        for field_name, nested_schema in nested_schemas.items():
            nested_value = item.get(field_name)
            if nested_value is None:
                continue
            if isinstance(nested_value, dict):
                nested_value = [nested_value]
            if isinstance(nested_value, list):
                BaseValuesViewset._validate_items_against_schema(
                    nested_value, nested_schema
                )

    @staticmethod
    def _get_nested_child_pk(field_name, nested_pk, val):
        """Extract a nested child's PK, raising on missing keys.

        When nested_pk is None the field is a scalar from a one-to-many
        relation (e.g. roles__kind); the value itself is the dedup key.
        """
        if nested_pk is None:
            return val
        try:
            return val[nested_pk]
        except KeyError:
            raise KeyError(
                "_auto_consolidate: nested field '{}' has no key "
                "'{}' for deduplication. Available keys: {}. "
                "Check that _resolve_nested_pk_output_name matches "
                "the field_map output.".format(field_name, nested_pk, list(val.keys()))
            )

    def _auto_consolidate(
        self,
        items: List[Dict[str, Any]],
        joined_many,
        pk_getter,
    ) -> List[Dict[str, Any]]:
        """
        Consolidate many=True nested fields using groupby.

        Nested extraction is already done by field_map callables during
        _serialize_flat. This method only handles groupby + list collection
        for many=True fields (converting per-row dicts to lists and deduplicating).

        Items must be sorted by PK for groupby, but original queryset
        ordering is restored afterwards.

        ``joined_many`` and ``pk_getter`` are passed by the caller so the
        same routine handles top-level and nested-path consolidation
        (``serialize_queryset`` reads them from the cache entry / nested
        queryset's model).
        """
        if not items or not joined_many:
            return items

        # dict.fromkeys deduplicates while preserving insertion order (a set
        # would not), so consolidated items can be returned in the original
        # queryset order.
        original_pk_order = list(dict.fromkeys(pk_getter(item) for item in items))
        # groupby only groups *consecutive* equal keys, so items must be
        # sorted by PK first or a custom queryset ordering could split one
        # PK's rows into multiple groups.
        items = sorted(items, key=pk_getter)
        consolidated: Dict[Any, Dict[str, Any]] = {}

        for pk, group in groupby(items, pk_getter):
            group_iter = iter(group)
            consolidated_item = next(group_iter)
            seen_child_pks: Dict[str, set] = {fn: set() for fn, _ in joined_many}

            # Convert per-row nested dicts to lists for the first item
            for field_name, nested_pk in joined_many:
                val = consolidated_item[field_name]
                if val is not None:
                    child_pk = self._get_nested_child_pk(field_name, nested_pk, val)
                    seen_child_pks[field_name].add(child_pk)
                    consolidated_item[field_name] = [val]
                else:
                    consolidated_item[field_name] = []

            for item in group_iter:
                for field_name, nested_pk in joined_many:
                    val = item[field_name]
                    if val is not None:
                        child_pk = self._get_nested_child_pk(field_name, nested_pk, val)
                        if child_pk not in seen_child_pks[field_name]:
                            seen_child_pks[field_name].add(child_pk)
                            consolidated_item[field_name].append(val)
            consolidated[pk] = consolidated_item

        return [consolidated[pk] for pk in original_pk_order]

    def consolidate(self, items, queryset):
        """
        Override point for custom consolidation logic.
        """
        return items

    def serialize(self, queryset):
        queryset = self.annotate_queryset(queryset)
        with self._serializer_context_scope():
            items = self.serialize_queryset(queryset)
            result = self.consolidate(items, queryset)

            # Dev-mode validation: check output matches serializer contract
            if settings.DEBUG:
                self._validate_output(result)

            return result

    def serialize_object(self, **filter_kwargs):
        try:
            filter_kwargs = filter_kwargs or self._get_lookup_filter()
            queryset = self.get_queryset().filter(**filter_kwargs)
            return self.serialize(self.filter_queryset(queryset))[0]
        except (IndexError, ValueError, TypeError):
            raise Http404(
                "No %s matches the given query." % queryset.model._meta.object_name
            )


class QueryParamRequest(Request):
    def __init__(self, query_params, *args, **kwargs):
        super().__init__(*args, **kwargs)
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


class ListModelMixin:
    def _get_list_queryset(self):
        queryset = self.filter_queryset(self.get_queryset())

        page_queryset = self.paginate_queryset(queryset)

        if page_queryset is not None:
            return page_queryset, True
        return queryset, False

    def list(self, request, *args, **kwargs):
        queryset, paginated = self._get_list_queryset()

        if paginated:
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


class RetrieveModelMixin:
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
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        return super().to_internal_value(data).hex

    def to_representation(self, value):
        if isinstance(value, uuid.UUID):
            return value.hex
        return value
