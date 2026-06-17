from abc import ABCMeta
from abc import abstractmethod
from collections import Counter
from typing import Any
from typing import Callable
from typing import cast
from typing import Dict
from typing import List
from typing import Optional
from typing import Set
from typing import Tuple
from typing import Type
from typing import Union

from django.core.exceptions import FieldDoesNotExist
from django.db.models import F
from django.db.models import Field
from django.db.models import Model
from django.db.models.fields.related import ForeignObjectRel
from rest_framework import serializers as drf_serializers
from rest_framework.fields import empty
from rest_framework.fields import Field as DrfField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import SerializerMethodField
from rest_framework.utils.field_mapping import ClassLookupDict


class ValuesMethodField(SerializerMethodField):
    """
    ``SerializerMethodField`` variant for ``ValuesViewset``: declares the
    row columns the bound method reads.

    ``sources`` paths use DRF dot notation (``"dataset.id"``) and are
    translated internally to ORM double-underscore (``"dataset__id"``) for
    the ``values()`` query. The bound method receives a proxy over those
    declared sources:

        class MySerializer(ModelSerializer):
            status = ValuesMethodField(sources=("transfer_status", "last_synced"))

            def get_status(self, obj):
                if obj.transfer_status in IN_PROGRESS:
                    return SYNCING
                ...

    Sources that are not also declared as serializer output fields are
    fetched but stripped from the final row.
    """

    def __init__(self, *, sources=(), method_name=None, **kwargs):
        super().__init__(method_name=method_name, **kwargs)
        self.sources = tuple(sources)


class _SourcesProxy:
    """
    Attribute proxy over a raw ``values()`` row, scoped to the paths
    declared in a ``ValuesMethodField``'s ``sources``.

    Supports dotted traversal matching declared paths: for
    ``sources=("publisher.name",)``, ``obj.publisher.name`` walks down
    and returns ``raw["publisher__name"]``.

    Attribute access outside the declared set raises ``AttributeError``
    with the requested name and the declared sources in the message, so
    the boundary is discoverable.
    """

    __slots__ = ("_raw", "_sources", "_prefix")

    def __init__(self, raw, sources, prefix=""):
        self._raw = raw
        self._sources = sources
        self._prefix = prefix

    def __getattr__(self, name):
        # Let Python's internal machinery (repr, copy, pickle, etc.) see a
        # plain AttributeError for dunder and private attribute lookups
        # rather than the ValuesMethodField-framed message below.
        if name.startswith("_"):
            raise AttributeError(name)
        path = "{}__{}".format(self._prefix, name) if self._prefix else name
        if path in self._sources:
            return self._raw[path]
        sep = path + "__"
        if any(source.startswith(sep) for source in self._sources):
            return _SourcesProxy(self._raw, self._sources, path)
        declared = sorted(source.replace("__", ".") for source in self._sources)
        raise AttributeError(
            "{!r} not declared — ValuesMethodField exposes sources only: "
            "{}. Add to sources=, or inline the logic.".format(name, declared)
        )


# A row produced by ``queryset.values()`` — dict of flat path → value.
Row = Dict[str, Any]


class SourceFieldEntry:
    """
    Field map entry for a single-source rename, optionally transformed.

    ``to_repr=None`` means a plain rename. When ``to_repr`` is set and the
    raw value is ``None``, ``default`` is substituted — mirrors DRF's
    get_attribute fallback for missing relations.
    """

    __slots__ = ("source", "to_repr", "default")

    def __init__(
        self,
        source: str,
        to_repr: Optional[Callable] = None,
        default: Any = None,
    ):
        self.source = source
        self.to_repr = to_repr
        self.default = default

    def _represent(self, raw: Any) -> Any:
        if self.to_repr is None:
            return raw
        if raw is None:
            return self.default
        return self.to_repr(raw)

    def extract(self, row: Row) -> Any:
        """Produce the output value, reading ``row`` without mutating it."""
        return self._represent(row.get(self.source))

    def apply(self, key: str, row: Row) -> None:
        """Pop the source from ``row`` and write the value under ``key``."""
        row[key] = self._represent(row.pop(self.source))


class CallableFieldEntry:
    """
    Field map entry computed by a callable over the whole raw row: nested
    extractors, ``ValuesMethodField`` invokers, and legacy user-written
    callables.

    ``source`` and ``to_repr`` are ``None`` at the class level: the value
    doesn't map to a single DB column, so consumers that introspect sources
    (ordering filter, serializer generation) skip these entries.
    """

    __slots__ = ("func",)

    source = None
    to_repr = None

    def __init__(self, func: Callable[[Row], Any]):
        self.func = func

    def extract(self, row: Row) -> Any:
        """Produce the output value, reading ``row`` without mutating it."""
        return self.func(row)

    def apply(self, key: str, row: Row) -> None:
        """Write the value under ``key``; legacy callables may mutate ``row``
        themselves (e.g. popping consumed sources)."""
        row[key] = self.func(row)


# User-written legacy ``field_map = {"x": "source"}`` / ``{"x": callable}``
# entries are normalized to these classes at ingest by ``normalize_field_map``.
FieldMapEntry = Union[SourceFieldEntry, CallableFieldEntry]
FieldMap = Dict[str, FieldMapEntry]


class _BaseFieldMap(dict, metaclass=ABCMeta):
    """
    Base field map: a dict of output field name → entry producing its value,
    owning row mapping and source introspection over those entries.
    """

    @abstractmethod
    def map_row(self, row: Row) -> Row:
        """Produce the output row for a raw ``values()`` row."""

    def source_map(self) -> Dict[str, str]:
        """
        ``{target: source}`` pairs for fields backed by a single DB column.

        Callable entries are excluded (``source`` is ``None``) — they may do
        arbitrary transformations and don't map cleanly to a single column.
        """
        return {
            key: entry.source for key, entry in self.items() if entry.source is not None
        }

    def plain_renames(self) -> Dict[str, str]:
        """
        ``{source: target}`` pairs for plain renames (source set, no
        ``to_repr``), so raw values can be exposed under the declared name.
        """
        return {
            entry.source: key
            for key, entry in self.items()
            if entry.source is not None and entry.to_repr is None
        }

    def is_noop(self) -> bool:
        """True if every entry is a trivial passthrough: no transformation
        and no renaming. When True, ``_serialize_flat`` can return
        ``list(queryset.values(...))`` directly without building new dicts."""
        return all(
            isinstance(entry, SourceFieldEntry)
            and entry.source == key
            and entry.to_repr is None
            for key, entry in self.items()
        )

    def db_column_map(self) -> Dict[str, str]:
        """
        ``{api_name: db_column}`` for fields where the DB column differs from
        the API name. Passthroughs (source == key) are excluded.

        Used by ordering filters to translate API field names to DB columns
        and to resolve which DB column backs a given value in ``_values``.
        """
        return {
            key: entry.source
            for key, entry in self.items()
            if entry.source is not None and entry.source != key
        }

    def annotate_queryset(self, queryset: Any) -> Any:
        """No-op default: return queryset unchanged."""
        return queryset


class _FieldMap(_BaseFieldMap):
    """
    A field map built by serializer introspection, covering every declared
    output field (including trivial passthroughs).

    ``map_row`` builds a fresh output dict, reading raw values without
    mutating the input row, so the result contains exactly the declared
    outputs — method-field sources pulled in for invocation never leak into
    output because they're not field_map keys.

    ``_sql_renames`` holds F() aliases precomputed during introspection for
    plain source→target renames that can be pushed to SQL. ``annotate_queryset``
    applies them; no further computation is needed at serialization time.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._sql_renames: Dict[str, Any] = {}  # {target_key: F(source)}

    def map_row(self, row: Row) -> Row:
        return {key: entry.extract(row) for key, entry in self.items()}

    def db_column_map(self) -> Dict[str, str]:
        """
        ``{api_name: db_column}`` resolving SQL rename aliases to their
        original source columns.

        For SQL-promoted renames the field_map entry was updated to a
        passthrough (source == key), so the original column is read from
        ``_sql_renames`` instead. Non-promoted renames and passthroughs
        fall back to the base implementation.
        """
        result = {}
        for key, entry in self.items():
            if key in self._sql_renames:
                result[key] = self._sql_renames[key].name
            elif entry.source is not None and entry.source != key:
                result[key] = entry.source
        return result

    def annotate_queryset(self, queryset: Any) -> Any:
        """Apply pre-computed SQL-level F() aliases to the queryset."""
        if self._sql_renames:
            return queryset.annotate(**self._sql_renames)
        return queryset

    def promote_renames_to_sql_aliases(
        self, values: List[str], model: Type[Model]
    ) -> List[str]:
        """
        Precompute SQL-level F() aliases for plain source→target renames.

        Promotes a rename when:
        - source and target differ (not a trivial passthrough)
        - source is referenced by exactly one entry — removing it from the
          values() call is safe because no other entry reads that column
        - target name does not conflict with a model field (Django raises
          ValueError if an annotation shadows a real column)

        Mutates self in place: updates promoted entries to passthroughs and
        populates ``_sql_renames`` with ``{target: F(source)}``.
        Returns an updated values list with source names replaced by target names
        for promoted renames.
        """
        model_field_names: Set[str] = {f.name for f in model._meta.get_fields()}  # type: ignore[attr-defined]
        source_refcount = Counter(
            entry.source for entry in self.values() if entry.source is not None
        )

        for target_key, map_entry in list(self.items()):
            if (
                isinstance(map_entry, SourceFieldEntry)
                and map_entry.source is not None
                and map_entry.to_repr is None
                and map_entry.source != target_key
                and source_refcount[map_entry.source] == 1
                and target_key not in model_field_names
            ):
                self._sql_renames[target_key] = F(map_entry.source)
                self[target_key] = SourceFieldEntry(target_key)

        if self._sql_renames:
            promoted_sources = {
                f_expr.name: target for target, f_expr in self._sql_renames.items()
            }
            return [promoted_sources.get(v, v) for v in values]
        return values


class _LegacyFieldMap(_BaseFieldMap):
    """
    A field map normalized from a legacy explicit ``values`` / ``field_map``
    viewset definition.

    ``map_row`` mutates the row in place, popping sources and writing
    targets. Required for back-compat with viewsets that rely on
    ``values()`` keys passing through to the output when not claimed by a
    ``field_map`` entry.
    """

    def map_row(self, row: Row) -> Row:
        for key, entry in self.items():
            entry.apply(key, row)
        return row


# A ``joined_many`` entry: (field_name, nested_pk_output_name) per many=True
# nested serializer, used by _auto_consolidate for dedup. nested_pk_name is
# None for scalar-many fields (dedup by value itself).
JoinedMany = Tuple[Tuple[str, Optional[str]], ...]

# Nested cache entries keyed by dotted path, built during introspection so
# deferred nested serializers can be serialized separately via the
# ``serialize_queryset`` API.
NestedCacheEntry = Tuple[List[str], _FieldMap, JoinedMany]
NestedCache = Dict[str, NestedCacheEntry]

# Return shape of the top-level introspection call.
IntrospectionResult = Tuple[List[str], _FieldMap, JoinedMany, NestedCache]


def _get_source_path(field: DrfField, field_name: str, prefix: str) -> Optional[str]:
    """Extract the source path for a serializer field.

    Converts DRF dot-notation sources (e.g. "parent.name") to Django ORM
    double-underscore notation (e.g. "parent__name") for use in values() queries.
    """
    source = getattr(field, "source", None)
    if source == "*" or isinstance(source, (list, tuple)):
        return None
    source_path = source if source else field_name
    # DRF uses dot notation for relationship traversal (e.g. "parent.name"),
    # but Django ORM values() requires double-underscore notation ("parent__name").
    source_path = source_path.replace(".", "__")
    return f"{prefix}{source_path}" if prefix else source_path


def _is_nested_model_serializer(field: DrfField) -> bool:
    """Check if a field is a nested ``ModelSerializer`` (or ``ListSerializer``
    wrapping one).

    Plain ``Serializer`` subclasses (e.g. structural wrappers around a
    ``JSONField``) are intentionally excluded — they have no ``Meta.model``
    to introspect and are handled by the regular-field path, where
    ``field.to_representation`` runs on the raw value.
    """
    if isinstance(field, drf_serializers.ListSerializer):
        return isinstance(field.child, ModelSerializer)
    return isinstance(field, ModelSerializer)


def _source_crosses_many_relation(
    model: Optional[Type[Model]], source_path: str
) -> bool:
    """
    Check whether a source path crosses a one-to-many or many-to-many relation.

    Used to detect fields like ``roles__kind`` where ``roles`` is a reverse FK,
    so the values() query produces multiple rows that need list consolidation.
    """
    if model is None:
        return False
    parts = source_path.split("__")
    current_model: Type[Model] = model
    for part in parts:
        try:
            field = current_model._meta.get_field(part)  # type: ignore[attr-defined]
        except FieldDoesNotExist:
            return False
        if getattr(field, "one_to_many", False) or getattr(
            field, "many_to_many", False
        ):
            return True
        related_model = getattr(field, "related_model", None)
        if related_model is None:
            return False
        current_model = related_model
    return False


def _get_model_field_for_source(
    model: Optional[Type[Model]], source_path: str
) -> Optional[Union[Field, ForeignObjectRel]]:
    """
    Walk a source path like 'user__profile__name' to get the final model field.

    Returns the final model field, or None if the path is invalid or doesn't
    resolve to a concrete model field. ``_meta.get_field`` returns either a
    ``models.Field`` subclass or a ``ForeignObjectRel`` for reverse accessors;
    callers only need the ``related_model`` / ``choices`` attributes common
    to both.
    """
    if model is None:
        return None

    parts = source_path.split("__")
    current_model: Type[Model] = model

    for i, part in enumerate(parts):
        try:
            field = current_model._meta.get_field(part)  # type: ignore[attr-defined]
        except FieldDoesNotExist:
            return None

        # If this is the last part, return the field
        if i == len(parts) - 1:
            return field

        # Otherwise, it must be a relation - get the related model
        related_model = getattr(field, "related_model", None)
        if related_model is None:
            # Not a relation, but we expected more path segments
            return None
        current_model = related_model
    return None


def _field_matches_inferred_type(
    declared_field: DrfField,
    source_path: str,
    serializer_class: Type[ModelSerializer],
    model: Optional[Type[Model]],
) -> bool:
    """
    Check if a declared field matches what DRF's ModelSerializer would auto-generate.

    Returns True if the declared field type is exactly what ModelSerializer
    would have inferred for the given model field, meaning we can skip calling
    to_representation (it would be effectively a no-op for simple types).
    """
    model_field = _get_model_field_for_source(model, source_path)
    if model_field is None:
        # Field is likely a queryset annotation (no corresponding model field).
        # For primitive DRF fields with no explicit default, to_representation
        # is a trivial type coercion (int, float, bool) that is identity when the
        # DB annotation already returns the correct Python type via output_field.
        # Skip to_representation to avoid unnecessary per-row overhead.
        if declared_field.default is empty and isinstance(
            declared_field,
            (
                drf_serializers.IntegerField,
                drf_serializers.FloatField,
                drf_serializers.BooleanField,
                drf_serializers.CharField,
            ),
        ):
            return True
        return False

    # For relation fields, check against the serializer's related field class
    # (typically PrimaryKeyRelatedField). values() returns the raw FK value
    # (e.g. a UUID string), and PrimaryKeyRelatedField.to_representation
    # expects a model instance — so when they match, we skip to_representation
    # and pass the raw value through, which is already the PK.
    # No default check needed here: FK columns always have a value in output;
    # any default on the serializer field is for input (deserialization) only.
    if getattr(model_field, "related_model", None) is not None:
        return type(declared_field) is serializer_class.serializer_related_field

    # Fields with an explicit default need the 3-tuple path so that
    # None values (e.g. from a LEFT JOIN miss) get the default substituted.
    # The simple rename path doesn't handle None → default.
    if declared_field.default is not empty:
        return False

    # Special case: fields with choices become ChoiceField
    if getattr(model_field, "choices", None):
        inferred_class = serializer_class.serializer_choice_field
    else:
        field_mapping = ClassLookupDict(serializer_class.serializer_field_mapping)
        try:
            inferred_class = field_mapping[model_field]
        except KeyError:
            return False

    # UUIDField(format="hex") on a CharField model field: morango's UUIDField
    # extends models.CharField (not Django's UUIDField), so DRF's ClassLookupDict
    # maps it to CharField via MRO on all backends — including PostgreSQL, even
    # though the DB column is native UUID there. morango.UUIDField.from_db_value
    # always converts to a 32-char hex string before the value reaches Python, so
    # no to_representation transformation is needed regardless of backend.
    if (
        inferred_class is drf_serializers.CharField
        and isinstance(declared_field, drf_serializers.UUIDField)
        and declared_field.uuid_format == "hex"
    ):
        return True

    # Exact class match only - subclasses may override to_representation
    return type(declared_field) is inferred_class


def _resolve_nested_null_check_key(
    child: ModelSerializer, source: str
) -> Optional[str]:
    """
    Resolve the prefixed PK key for a nested serializer's model.

    Used for LEFT JOIN null detection: if the PK is null, the entire nested
    object is null (no related row exists).

    Returns the prefixed PK key (e.g., 'child_set__id') or None if the nested
    serializer has no model.
    """
    child_model = getattr(getattr(type(child), "Meta", None), "model", None)
    if child_model is None:
        return None
    return "{}__{}".format(source, child_model._meta.pk.name)


def _resolve_nested_pk_output_name(
    null_check_key: str, prefix: str, child_field_map: _FieldMap
) -> str:
    """
    Find the output field name of the nested PK, for deduplication in
    _auto_consolidate. The null_check_key is the prefixed source name
    (e.g. 'child_set__id'); we need to find what child_field_map renames
    it to (e.g. 'id' -> 'identifier'), or fall back to the source name.
    """
    pk_source = null_check_key[len(prefix) :]
    for out_name, map_val in child_field_map.items():
        if map_val.source == pk_source:
            return out_name
    return pk_source


def _make_nested_extractor(
    null_check_key: str,
    value_pairs: Tuple[Tuple[str, str], ...],
    child_field_map: _FieldMap,
) -> Callable[[Row], Optional[Row]]:
    """
    Create a field_map callable that extracts a nested item from a raw row.

    Reads all prefixed keys from the raw row without mutating it, builds a
    child dict keyed by unprefixed source names, then applies the child's
    field_map for renames and transforms. Returns the nested dict or None
    if the FK is null.
    """

    def extract(row: Row) -> Optional[Row]:
        if row.get(null_check_key) is None:
            return None

        nested_item: Row = {}
        for source_name, prefixed_key in value_pairs:
            nested_item[source_name] = row.get(prefixed_key)
        if child_field_map:
            nested_item = child_field_map.map_row(nested_item)
        return nested_item

    return extract


def _deep_nesting_error(
    field_name: str,
    child: ModelSerializer,
    deferred_in_child: Set[str],
) -> Optional[str]:
    """Return a deep-nesting error message if ``child`` has further nested
    serializers (excluding any deferred at the child level), else ``None``.
    """
    if any(
        _is_nested_model_serializer(f) and gn not in deferred_in_child
        for gn, f in cast(Dict[str, DrfField], child.fields).items()
    ):
        return (
            "Nested serializer field '{}' contains further nested "
            "serializers. Deep nesting is not supported for "
            "auto-consolidation. Use deferred_fields to fetch '{}' "
            "separately and implement a custom consolidate() "
            "method.".format(field_name, field_name)
        )
    return None


def _check_serializer_constraints(
    serializer: ModelSerializer, deferred_fields: Tuple[str, ...] = ()
) -> List[str]:
    """
    DEBUG-only preflight: validate serializer structure before introspection.

    Returns a list of error messages (empty if no issues). The caller is
    responsible for raising; collecting lets a single run surface every
    violation across the (possibly recursive) tree at once.

    Checks at this level (and recursively into deferred nested children):
    - No deep nesting (nested serializers within nested serializers,
      unless the inner one is itself deferred via a nested-path entry)
    - At most one many=True nested serializer (multiple cause cartesian products)
    """
    unnested_deferred_fields = {p for p in deferred_fields if "__" not in p}
    nested_deferred_by_child: Dict[str, List[str]] = {}
    for path in deferred_fields:
        if "__" in path:
            head, tail = path.split("__", 1)
            nested_deferred_by_child.setdefault(head, []).append(tail)

    errors: List[str] = []
    many_fields: List[str] = []
    # cast: ``fields`` is a ``cached_property`` that Pyright can't resolve
    # to the underlying BindingDict.
    for field_name, field in cast(Dict[str, DrfField], serializer.fields).items():
        if not _is_nested_model_serializer(field):
            continue
        child = cast(
            ModelSerializer,
            field.child if isinstance(field, drf_serializers.ListSerializer) else field,
        )
        if field_name in unnested_deferred_fields:
            # Recurse into deferred nested so deep-level violations surface too.
            nested_errors = _check_serializer_constraints(
                child, tuple(nested_deferred_by_child.get(field_name, ()))
            )
            errors.extend("{}: {}".format(field_name, e) for e in nested_errors)
            continue
        if getattr(field, "write_only", False):
            continue
        unnested_deferred_in_child = {
            p for p in nested_deferred_by_child.get(field_name, ()) if "__" not in p
        }
        deep_err = _deep_nesting_error(field_name, child, unnested_deferred_in_child)
        if deep_err is not None:
            errors.append(deep_err)
        if isinstance(field, drf_serializers.ListSerializer):
            many_fields.append(field_name)
    if len(many_fields) > 1:
        field_names = ", ".join(sorted(many_fields))
        errors.append(
            "Multiple many=True nested serializers cannot be joined in a "
            "single query (cartesian product). Found: {}. Move all but one "
            "to deferred_fields and handle them in consolidate().".format(field_names)
        )
    return errors


def _introspect_regular_field(
    field_name: str,
    field: DrfField,
    declared_fields: Dict[str, DrfField],
    serializer_class: Type[ModelSerializer],
    model: Optional[Type[Model]],
) -> Tuple[Union[str, Tuple[str, ...], None], Optional[FieldMapEntry]]:
    """
    Introspect a regular (non-nested) serializer field.

    Returns ``(source_path, entry)``:

    - ``source_path``: value(s) to fetch via ``values()``. ``None`` to skip
      the field entirely (e.g. ``source='*'``). For a ``ValuesMethodField``,
      a tuple of the declared source paths (caller extends ``values`` with
      all of them).
    - ``entry``: the field_map entry producing the output value. A
      ``CallableFieldEntry`` wrapping an invoker closure for method fields
      (wraps the row dict in a ``_SourcesProxy`` and calls the bound
      method); a ``SourceFieldEntry`` otherwise, with ``to_repr`` set when
      the field transforms its raw value.
    """
    if isinstance(field, ValuesMethodField):
        source_paths = tuple(source.replace(".", "__") for source in field.sources)
        # Capture the bound ``to_representation`` once at introspection time
        # so subclass overrides are honoured (and we skip a per-row attribute
        # lookup on the field instance).
        to_representation = field.to_representation

        def invoke(row: Row) -> Any:
            proxy = _SourcesProxy(row, source_paths)
            return to_representation(proxy)

        return source_paths, CallableFieldEntry(invoke)

    if isinstance(field, SerializerMethodField):
        raise TypeError(
            "{}.{}: ValuesViewset does not support plain "
            "SerializerMethodField. Use ValuesMethodField(sources=(...)) "
            "to declare which row columns the method reads, or a typed "
            "field with source= for simple traversals.".format(
                serializer_class.__name__, field_name
            )
        )

    source_path = _get_source_path(field, field_name, "")
    if source_path is None:
        return None, None

    if field_name in declared_fields and not _field_matches_inferred_type(
        field, source_path, serializer_class, model
    ):
        default = field.default if field.default is not empty else None
        return source_path, SourceFieldEntry(
            source_path, field.to_representation, default
        )
    # Trivial passthrough (source == name, matching type) still emits an
    # entry so the field_map is a complete spec of output fields.
    return source_path, SourceFieldEntry(source_path)


def _introspect_deferred_nested(
    field_name: str,
    child: ModelSerializer,
    nested_deferred: Tuple[str, ...] = (),
) -> NestedCache:
    """
    Introspect a deferred nested serializer (one listed in deferred_fields).

    Introspects as top-level so the child's own nested serializers are
    processed, but does not add values to the parent query.

    Returns a dict of nested_cache entries keyed by path.
    """
    (
        child_values,
        child_field_map,
        child_joined_many,
        child_nested,
    ) = _introspect_serializer_fields(child, deferred_fields=nested_deferred)
    entries: NestedCache = {
        field_name: (child_values, child_field_map, child_joined_many),
    }
    for sub_path, sub_info in child_nested.items():
        entries[f"{field_name}__{sub_path}"] = sub_info
    return entries


def _introspect_joined_nested(
    field_name: str,
    field: DrfField,
    child: ModelSerializer,
    is_many: bool,
    nested_deferred: Tuple[str, ...] = (),
) -> Tuple[List[str], FieldMap, NestedCache, List[Tuple[str, Optional[str]]]]:
    """
    Introspect a joined (non-deferred) nested serializer.

    Returns ``(prefixed_values, field_map_updates, nested_entries,
    joined_many_entries)``. ``joined_many_entries`` is empty for single FK
    fields or a one-item list of ``(field_name, nested_pk_name)`` for
    many=True fields.
    """
    (
        child_values,
        child_field_map,
        _,
        child_nested,
    ) = _introspect_serializer_fields(
        child, deferred_fields=nested_deferred, _is_nested=True
    )
    nested_entries: NestedCache = {
        field_name: (child_values, child_field_map, ()),
    }
    for sub_path, sub_info in child_nested.items():
        nested_entries[f"{field_name}__{sub_path}"] = sub_info

    # Prefix child values for the parent's values() call
    source = getattr(field, "source", None) or field_name
    prefix = f"{source}__"
    prefixed_values = [f"{prefix}{v}" for v in child_values]

    extractor: Optional[Callable[[Row], Optional[Row]]] = None
    joined_many_entry: Optional[Tuple[str, Optional[str]]] = None

    if prefixed_values:
        value_pairs: Tuple[Tuple[str, str], ...] = tuple(
            zip(child_values, prefixed_values)
        )

        null_check_key = _resolve_nested_null_check_key(child, source)
        if null_check_key is None:
            null_check_key = prefixed_values[0]

        extractor = _make_nested_extractor(
            null_check_key,
            value_pairs,
            child_field_map,
        )

        if is_many:
            nested_pk_name = _resolve_nested_pk_output_name(
                null_check_key,
                prefix,
                child_field_map,
            )
            joined_many_entry = (field_name, nested_pk_name)

    field_map_updates: FieldMap = {}
    if extractor is not None:
        field_map_updates[field_name] = CallableFieldEntry(extractor)
    joined_many_entries: List[Tuple[str, Optional[str]]] = []
    if joined_many_entry is not None:
        joined_many_entries.append(joined_many_entry)

    return prefixed_values, field_map_updates, nested_entries, joined_many_entries


def _introspect_serializer_fields(  # noqa: C901
    serializer: ModelSerializer,
    deferred_fields: Tuple[str, ...] = (),
    _is_nested: bool = False,
) -> IntrospectionResult:
    """
    Introspect a serializer to derive values tuple and field transformations.

    Args:
        serializer: The DRF serializer to introspect
        deferred_fields: Field names that should be fetched separately (not joined)
        _is_nested: Internal flag; True when recursing into a nested serializer
            so that further nested fields are skipped.

    Returns:
        - values: Fields to fetch via queryset.values()
        - field_map: Transforms for fields to map from values call
        - joined_many: many=True nested fields as (field_name, nested_pk_name) for dedup.
          nested_pk_name is None for scalar many-relation fields (dedup by value).
        - nested_cache: path-keyed dict of (values, field_map, joined_many) for
          all nested serializers encountered (deferred and joined alike)
    """
    values: List[str] = []
    field_map = _FieldMap()
    joined_many_fields: List[Tuple[str, Optional[str]]] = []
    nested_cache: NestedCache = {}
    declared_fields: Dict[str, DrfField] = getattr(serializer, "_declared_fields", {})

    # Get serializer class and model for type inference
    serializer_class = type(serializer)
    model: Optional[Type[Model]] = getattr(
        getattr(serializer_class, "Meta", None), "model", None
    )

    serializer_fields: Dict[str, DrfField] = cast(
        Dict[str, DrfField], serializer.fields
    )
    for field_name, field in serializer_fields.items():
        if getattr(field, "write_only", False):
            continue

        if _is_nested_model_serializer(field):
            # --- Nested ModelSerializer fields ---
            is_many = isinstance(field, drf_serializers.ListSerializer)
            child = cast(ModelSerializer, field.child if is_many else field)
            nested_deferred = tuple(
                p.split("__", 1)[1]
                for p in deferred_fields
                if "__" in p and p.split("__", 1)[0] == field_name
            )

            if field_name in deferred_fields:
                nested_cache.update(
                    _introspect_deferred_nested(field_name, child, nested_deferred)
                )
                continue

            # Skip further joining when already inside a nested serializer
            # (deep JOIN); deferred grand-children are handled above.
            if _is_nested:
                continue

            # Joined nested field — introspect and build extractor
            (
                prefixed,
                fm_updates,
                nested_entries,
                many_entries,
            ) = _introspect_joined_nested(
                field_name, field, child, is_many, nested_deferred
            )
            values.extend(prefixed)
            field_map.update(fm_updates)
            nested_cache.update(nested_entries)
            joined_many_fields.extend(many_entries)
            continue

        if field_name in deferred_fields:
            continue

        source_path, entry = _introspect_regular_field(
            field_name, field, declared_fields, serializer_class, model
        )
        if source_path is None:
            continue

        # ValuesMethodField returns a tuple of source paths and an
        # invoker entry. Extend values() with all of them.
        if isinstance(source_path, tuple):
            values.extend(source_path)
            field_map[field_name] = entry
            continue

        # Detect fields whose source crosses a one-to-many relation
        # (e.g. roles__kind where roles is a reverse FK). These produce
        # multiple rows in values() and need list consolidation — a plain
        # rename here, consolidation collects the list.
        if _source_crosses_many_relation(model, source_path):
            entry = SourceFieldEntry(source_path)
            joined_many_fields.append((field_name, None))

        values.append(source_path)
        field_map[field_name] = entry
        continue

    # Dedupe values() paths: method-field sources can overlap with declared
    # field sources, and the same path only needs to be fetched once.
    # Sorted so the column order (and hence the generated SQL) is
    # consistent across runs — set iteration order varies per process.
    values = sorted(set(values))

    # Not applied inside inline-joined nested serializers (_is_nested=True):
    # their values are fetched with a "{parent}__" prefix and annotation
    # names cannot contain "__".
    if not _is_nested and model is not None:
        values = field_map.promote_renames_to_sql_aliases(values, model)

    return values, field_map, tuple(joined_many_fields), nested_cache


def derive_values_from_serializer(
    serializer: ModelSerializer,
    deferred_fields: Tuple[str, ...] = (),
    *,
    check_constraints: bool = False,
) -> IntrospectionResult:
    """
    Public entry point: derive values tuple and field mappings from a DRF serializer.

    Args:
        serializer: The DRF serializer to introspect
        deferred_fields: Field names that should be fetched separately (not joined)
        check_constraints: When True, runs DEBUG preflight checks before introspection

    Returns:
        - values: Fields to fetch via queryset.values()
        - field_map: Transforms for fields to map from values call
        - joined_many: many=True nested fields as (field_name, nested_pk_name) for dedup
        - nested_cache: path-keyed dict of (values, field_map, joined_many) for
          all nested serializers encountered during introspection
    """
    if check_constraints:
        errors = _check_serializer_constraints(serializer, deferred_fields)
        if errors:
            raise TypeError("\n".join(errors))
    return _introspect_serializer_fields(serializer, deferred_fields=deferred_fields)


def normalize_field_map(field_map: Dict[str, Any]) -> _LegacyFieldMap:
    """
    Normalize a user-written legacy field_map to canonical entry objects.

    Converts str shorthand entries (``{"name": "source"}``) to
    ``SourceFieldEntry`` plain renames and bare callables to
    ``CallableFieldEntry``. Returns a new ``_LegacyFieldMap`` with
    mutate-in-place ``map_row`` semantics; the input is not mutated.
    """
    return _LegacyFieldMap(
        (
            key,
            (
                SourceFieldEntry(value)
                if isinstance(value, str)
                else CallableFieldEntry(value)
            ),
        )
        for key, value in field_map.items()
    )
