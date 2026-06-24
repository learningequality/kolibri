"""
Compile-time introspection: read a DRF serializer into a fetch plan.

``derive_values_from_serializer`` is the entry point — runs once per viewset
class at engine construction, never per request.
"""

import logging
from typing import cast
from typing import Dict
from typing import FrozenSet
from typing import Iterable
from typing import Iterator
from typing import List
from typing import NamedTuple
from typing import Optional
from typing import Sequence
from typing import Tuple
from typing import Type
from typing import Union

from django.core.exceptions import FieldDoesNotExist
from django.db.models import Field
from django.db.models import Model
from django.db.models.fields.related import ForeignObjectRel
from rest_framework import serializers as drf_serializers
from rest_framework.fields import empty
from rest_framework.fields import Field as DrfField
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import Serializer
from rest_framework.serializers import SerializerMethodField
from rest_framework.utils.field_mapping import ClassLookupDict

from kolibri.core.utils.values_viewset.fetch import AutoFetch
from kolibri.core.utils.values_viewset.fetch import make_auto_fetch
from kolibri.core.utils.values_viewset.fetch import ParentPathScalarFetch
from kolibri.core.utils.values_viewset.fetch import ScalarFetch
from kolibri.core.utils.values_viewset.fetch import ScalarFetchEntry
from kolibri.core.utils.values_viewset.field_map import _FieldMap
from kolibri.core.utils.values_viewset.field_map import FieldMapEntry
from kolibri.core.utils.values_viewset.field_map import MethodFieldEntry
from kolibri.core.utils.values_viewset.field_map import SourceFieldEntry
from kolibri.core.utils.values_viewset.method_fields import ValuesMethodField

logger = logging.getLogger(__name__)

# DEBUG output-shape schema: every read field name, the subset whose absence is
# drift, and each nested-serializer field's own schema.
ValidationSchema = Tuple[FrozenSet[str], FrozenSet[str], Dict[str, "ValidationSchema"]]


class NestedCacheEntry(NamedTuple):
    """
    One nested serializer's per-level spec, keyed by dotted path in
    ``NestedCache``.

    ``model`` is this nested level's ``Meta.model``.
    """

    values: List[str]
    field_map: _FieldMap
    scalar_fetch: Tuple[ScalarFetch, ...]
    auto_fetch: Tuple[AutoFetch, ...]
    model: Optional[Type[Model]]


NestedCache = Dict[str, NestedCacheEntry]


class IntrospectionResult(NamedTuple):
    """
    Everything introspection learns from a serializer; the engine consumes
    this alone and never re-reads the serializer.

    ``model`` is the top serializer's ``Meta.model``. ``validation_schema`` is
    the DEBUG output-shape schema, ``None`` for nested levels.
    """

    values: List[str]
    field_map: _FieldMap
    scalar_fetch: Tuple[ScalarFetch, ...]
    auto_fetch: Tuple[AutoFetch, ...]
    nested_cache: NestedCache
    model: Optional[Type[Model]] = None
    validation_schema: Optional[ValidationSchema] = None


def _get_source_path(field: DrfField, field_name: str, prefix: str) -> Optional[str]:
    """
    Source path for a field, converted from DRF dot-notation to Django ORM
    ``__`` notation. ``None`` for ``source='*'`` or composite (list/tuple)
    sources.
    """
    source = getattr(field, "source", None)
    if source == "*" or isinstance(source, (list, tuple)):
        return None
    source_path = source if source else field_name
    source_path = source_path.replace(".", "__")
    return f"{prefix}{source_path}" if prefix else source_path


def _is_nested_model_serializer(field: DrfField) -> bool:
    """
    True for a nested ``ModelSerializer`` (or ``ListSerializer`` wrapping one).

    Plain ``Serializer`` subclasses (e.g. ``JSONField`` wrappers) are excluded.
    They have no ``Meta.model`` to introspect. The regular-field path handles
    them, running ``to_representation`` on the raw value.
    """
    if isinstance(field, drf_serializers.ListSerializer):
        return isinstance(field.child, ModelSerializer)
    return isinstance(field, ModelSerializer)


def _walk_source_fields(
    model: Optional[Type[Model]], source_path: str
) -> Iterator[Union[Field, ForeignObjectRel]]:
    """
    Yield each model field along a ``__``-split source path.

    Stops early at the first segment that doesn't resolve, or at a non-final
    segment that isn't a relation. The single place that encodes how a DRF
    source maps onto the ORM.
    """
    if model is None:
        return
    current_model: Type[Model] = model
    for part in source_path.split("__"):
        try:
            field = current_model._meta.get_field(part)  # type: ignore[attr-defined]
        except FieldDoesNotExist:
            return
        yield field
        related_model = getattr(field, "related_model", None)
        if related_model is None:
            return
        current_model = related_model


def _source_crosses_many_relation(
    model: Optional[Type[Model]], source_path: str
) -> bool:
    """
    Whether a source path crosses a one-to-many or many-to-many relation.

    ``roles__kind`` (reverse FK) multiplies rows and needs list consolidation.
    ``publisher__name`` (to-one) does not, so it stays a joined column.
    """
    return any(
        getattr(field, "one_to_many", False) or getattr(field, "many_to_many", False)
        for field in _walk_source_fields(model, source_path)
    )


def _reverse_link(relation: ForeignObjectRel) -> str:
    """
    Return the accessor on a to-many target that links back to its parent.

    Shared by scalar-fetch and auto-fetch resolution so the two can't disagree.
    """
    if isinstance(relation, ForeignObjectRel):
        return relation.field.name
    return relation.remote_field.get_accessor_name()


def _resolve_scalar_fetch_info(
    parent_model: Type[Model], source_path: str, field_name: str
) -> ScalarFetch:
    """
    Resolve a scalar field whose source crosses a to-many into a batched fetch.

    When the crossed relation is the first path segment (a reverse FK or M2M
    directly on the parent), anchor on the child via its reverse accessor. When
    the to-many is crossed below the first segment (``publisher.books.title``),
    anchor on the model owning the first crossed to-many so its default manager
    applies, and reach parents by the reversed relation path — inverting each
    segment up to and including the to-many, in reverse order.
    """
    relation_name, _, leaf_source = source_path.partition("__")
    relation = parent_model._meta.get_field(relation_name)
    if getattr(relation, "one_to_many", False) or getattr(
        relation, "many_to_many", False
    ):
        return ScalarFetchEntry(
            field_name, relation.related_model, _reverse_link(relation), leaf_source
        )
    fields = list(_walk_source_fields(parent_model, source_path))
    segments = source_path.split("__")
    many_index = next(
        index
        for index, field in enumerate(fields)
        if getattr(field, "one_to_many", False) or getattr(field, "many_to_many", False)
    )
    target_model = fields[many_index].related_model
    reverse_path = "__".join(
        _reverse_link(field) for field in reversed(fields[: many_index + 1])
    )
    leaf_suffix = "__".join(segments[many_index + 1 :])
    return ParentPathScalarFetch(field_name, target_model, reverse_path, leaf_suffix)


def _get_model_field_for_source(
    model: Optional[Type[Model]], source_path: str
) -> Optional[Union[Field, ForeignObjectRel]]:
    """
    Final model field for a source path like ``user__profile__name``, or ``None``
    if the path doesn't fully resolve.

    ``get_field`` returns a ``Field`` or a ``ForeignObjectRel`` (reverse
    accessor); callers use only ``related_model`` / ``choices``, common to both.
    """
    parts = source_path.split("__")
    fields = list(_walk_source_fields(model, source_path))
    # A full-length walk resolved every segment; its last field is the target.
    # A short walk hit an invalid or over-deep path.
    if len(fields) == len(parts):
        return fields[-1]
    return None


def _field_matches_inferred_type(
    declared_field: DrfField,
    source_path: str,
    serializer_class: Type[ModelSerializer],
    model: Optional[Type[Model]],
) -> bool:
    """
    True when ``declared_field`` is exactly what ``ModelSerializer`` would infer
    for the model field, so ``to_representation`` can be skipped as a no-op.
    """
    model_field = _get_model_field_for_source(model, source_path)
    if model_field is None:
        # No model field → likely a queryset annotation. A primitive DRF field
        # with no default does an identity type-coercion (the annotation's
        # output_field already returns the right Python type), so skip
        # to_representation.
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

    # Relation field: values() returns the raw FK value (already the PK), but
    # PrimaryKeyRelatedField.to_representation expects a model instance. So when
    # the declared field is the plain related field, skip it and pass the raw PK
    # through. No default check: an FK column always has a value; a serializer
    # default is input-only.
    if getattr(model_field, "related_model", None) is not None:
        return type(declared_field) is serializer_class.serializer_related_field

    # An explicit default needs the transform path to substitute the default for
    # None (e.g. a LEFT JOIN miss), which the plain rename can't.
    if declared_field.default is not empty:
        return False

    if getattr(model_field, "choices", None):
        inferred_class = serializer_class.serializer_choice_field
    else:
        field_mapping = ClassLookupDict(serializer_class.serializer_field_mapping)
        try:
            inferred_class = field_mapping[model_field]
        except KeyError:
            return False

    # morango's UUIDField extends models.CharField (not Django's UUIDField), so
    # DRF maps it to CharField via MRO on every backend — even PostgreSQL with a
    # native UUID column. from_db_value already yields a 32-char hex string, so no
    # to_representation is needed regardless of backend.
    if (
        inferred_class is drf_serializers.CharField
        and isinstance(declared_field, drf_serializers.UUIDField)
        and declared_field.uuid_format == "hex"
    ):
        return True

    # Exact class match only - subclasses may override to_representation
    return type(declared_field) is inferred_class


def _introspect_nested_field(
    field_name: str,
    field: DrfField,
    parent_model: Optional[Type[Model]],
    explicit_deferred: Sequence[str],
) -> Tuple[NestedCache, Optional[AutoFetch], Optional[str]]:
    """
    Introspect one nested ``ModelSerializer`` field — always deferred, never
    joined.

    Normally auto-defers. If the dev listed it in ``deferred_fields``, they own
    the fetch (via ``consolidate()``) and we record only the nested spec.

    Returns ``(nested_cache, auto_fetch, forward_value)``:

    - ``nested_cache``: subtree specs.
    - ``auto_fetch``: the ``AutoFetch`` instance (``None`` when dev-deferred).
    - ``forward_value``: parent FK column for a forward FK, else ``None``.
    """
    is_many = isinstance(field, drf_serializers.ListSerializer)
    child = cast(ModelSerializer, field.child if is_many else field)
    child_explicit = tuple(_child_paths(explicit_deferred, field_name))
    nested_cache = _introspect_deferred_nested(field_name, child, child_explicit)

    if field_name in explicit_deferred:
        return nested_cache, None, None

    if parent_model is None:
        raise TypeError(
            "Auto-defer requires a Meta.model on the parent serializer to "
            "resolve the fetch relation for '{}'.".format(field_name)
        )
    info = _resolve_auto_fetch_info(parent_model, field, field_name)
    auto_fetch = make_auto_fetch(
        is_forward=info.is_forward,
        field_name=field_name,
        target_model=info.target_model,
        link=info.link,
        is_many=info.is_many,
        child_path=field_name,
        shares_parents=info.shares_parents,
    )
    # A forward fetch keys on the target pk, so the parent must fetch that column.
    forward_value = info.link if info.is_forward else None
    return nested_cache, auto_fetch, forward_value


class AutoFetchInfo(NamedTuple):
    """How an auto-deferred nested field reaches its children."""

    # Forward means the parent row carries the target pk; otherwise children are
    # filtered by the parent's pk.
    is_forward: bool
    target_model: Type[Model]
    # Reverse: the child column pointing back at the parent. Forward: the parent
    # column holding the target pk.
    link: str
    is_many: bool
    # M2M only — one child can appear under several parents, so its link pairs
    # need deduping.
    shares_parents: bool


def _resolve_auto_fetch_info(
    parent_model: Type[Model], field: DrfField, field_name: str
) -> AutoFetchInfo:
    """
    Resolve how to fetch children for an auto-deferred nested field.

    Raises ``TypeError`` when the source isn't a resolvable relation on
    ``parent_model``.
    """
    source = getattr(field, "source", None) or field_name
    try:
        relation = parent_model._meta.get_field(source)
    except FieldDoesNotExist:
        raise TypeError(
            "Cannot resolve auto-fetch for nested field '{}': source '{}' "
            "is not a relation on {}. Add '{}' to deferred_fields explicitly "
            "and implement consolidate() to handle the fetch.".format(
                field_name, source, parent_model.__name__, field_name
            )
        )

    if getattr(relation, "one_to_many", False):
        return AutoFetchInfo(
            is_forward=False,
            target_model=relation.related_model,
            link=_reverse_link(relation),
            is_many=True,
            shares_parents=False,
        )
    if isinstance(relation, ForeignObjectRel) and getattr(
        relation, "one_to_one", False
    ):
        return AutoFetchInfo(
            is_forward=False,
            target_model=relation.related_model,
            link=_reverse_link(relation),
            is_many=False,
            shares_parents=False,
        )
    if getattr(relation, "many_to_many", False):
        return AutoFetchInfo(
            is_forward=False,
            target_model=relation.related_model,
            link=_reverse_link(relation),
            is_many=True,
            shares_parents=True,
        )
    if getattr(relation, "many_to_one", False) or getattr(
        relation, "one_to_one", False
    ):
        return AutoFetchInfo(
            is_forward=True,
            target_model=relation.related_model,
            link=relation.name,
            is_many=False,
            shares_parents=False,
        )

    raise TypeError(
        "Cannot auto-defer nested field '{}': source '{}' on {} did not "
        "resolve to a supported relation. Add '{}' to deferred_fields "
        "explicitly and implement consolidate() to handle the fetch.".format(
            field_name, source, parent_model.__name__, field_name
        )
    )


class RegularField(NamedTuple):
    """
    One regular (non-nested) field's fetch and mapping spec.

    ``source_path`` is a tuple for a ``ValuesMethodField`` — the caller extends
    ``values`` with every declared source — and a single column otherwise.
    """

    source_path: Union[str, Tuple[str, ...]]
    entry: FieldMapEntry


def _introspect_regular_field(
    field_name: str,
    field: DrfField,
    declared_fields: Dict[str, DrfField],
    serializer_class: Type[ModelSerializer],
    model: Optional[Type[Model]],
) -> Optional[RegularField]:
    """
    Introspect a regular (non-nested) serializer field. ``None`` skips the field
    entirely (e.g. ``source='*'``).
    """
    if isinstance(field, ValuesMethodField):
        source_paths = tuple(source.replace(".", "__") for source in field.sources)
        # field.method_name is populated from the instantiated serializer;
        # capture the unbound method off the class.
        method_func = getattr(serializer_class, field.method_name)
        return RegularField(source_paths, MethodFieldEntry(method_func, source_paths))

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
        return None

    if field_name in declared_fields and not _field_matches_inferred_type(
        field, source_path, serializer_class, model
    ):
        default = field.default if field.default is not empty else None
        return RegularField(
            source_path, SourceFieldEntry(source_path, field.to_representation, default)
        )
    # Trivial passthrough (source == name, matching type) still emits an
    # entry so the field_map is a complete spec of output fields.
    return RegularField(source_path, SourceFieldEntry(source_path))


def _child_paths(paths: Iterable[str], head: str) -> List[str]:
    """Sub-paths of `paths` nested under `head`, head segment stripped."""
    return [
        p.split("__", 1)[1] for p in paths if "__" in p and p.split("__", 1)[0] == head
    ]


def _prefix_auto_fetch_paths(
    prefix: str, auto_fetch: Iterable[AutoFetch]
) -> Tuple[AutoFetch, ...]:
    """Prepend ``prefix__`` to each auto-fetch entry's child_path."""
    return tuple(
        entry.with_child_path("{}__{}".format(prefix, entry.child_path))
        for entry in auto_fetch
    )


def _introspect_deferred_nested(
    field_name: str,
    child: ModelSerializer,
    child_explicit: Tuple[str, ...] = (),
) -> NestedCache:
    """
    Recurse into a nested serializer and key its per-level specs by path.

    Introspects ``child`` as a top-level serializer — its own nested fields
    auto-defer in turn — then prefixes every resulting path with ``field_name``.
    Adds nothing to the parent query.
    """
    child_result = _introspect_serializer_fields(child, deferred_fields=child_explicit)
    entries: NestedCache = {
        field_name: NestedCacheEntry(
            child_result.values,
            child_result.field_map,
            child_result.scalar_fetch,
            _prefix_auto_fetch_paths(field_name, child_result.auto_fetch),
            child_result.model,
        ),
    }
    for sub_path, sub_info in child_result.nested_cache.items():
        entries[f"{field_name}__{sub_path}"] = NestedCacheEntry(
            sub_info.values,
            sub_info.field_map,
            sub_info.scalar_fetch,
            _prefix_auto_fetch_paths(field_name, sub_info.auto_fetch),
            sub_info.model,
        )
    return entries


class _LevelBuilder:
    """
    Accumulates one serializer level's introspection results, then assembles the
    ``IntrospectionResult``. Field handlers tell it what each field contributes;
    it owns the value dedupe, SQL-rename promotion, and field-map finalize.
    """

    def __init__(self, model: Optional[Type[Model]]) -> None:
        self._model = model
        self._values: List[str] = []
        self._field_map = _FieldMap()
        self._scalar_fetch: List[ScalarFetch] = []
        self._auto_fetch: List[AutoFetch] = []
        self._nested_cache: NestedCache = {}

    def add_column(
        self, field_name: str, source_path: str, entry: FieldMapEntry
    ) -> None:
        self._values.append(source_path)
        self._field_map[field_name] = entry

    def add_method_field(
        self, field_name: str, source_paths: Tuple[str, ...], entry: FieldMapEntry
    ) -> None:
        self._values.extend(source_paths)
        self._field_map[field_name] = entry

    def add_scalar_fetch(self, entry: ScalarFetch) -> None:
        self._scalar_fetch.append(entry)

    def add_nested(
        self,
        nested_cache: NestedCache,
        auto_fetch: Optional[AutoFetch],
        forward_value: Optional[str],
    ) -> None:
        self._nested_cache.update(nested_cache)
        if auto_fetch is not None:
            self._auto_fetch.append(auto_fetch)
        if forward_value is not None:
            self._values.append(forward_value)

    def build(self) -> IntrospectionResult:
        # Dedupe: method-field sources can overlap declared sources. Sorted so
        # column (and SQL) order is stable — set iteration order varies per run.
        values = sorted(set(self._values))
        if self._model is not None:
            values = self._field_map.promote_renames_to_sql_aliases(values, self._model)
        self._field_map.finalize()
        return IntrospectionResult(
            values,
            self._field_map,
            tuple(self._scalar_fetch),
            tuple(self._auto_fetch),
            self._nested_cache,
            self._model,
        )


def _classify_regular_field(
    field_name: str,
    field: DrfField,
    declared_fields: Dict[str, DrfField],
    serializer_class: Type[ModelSerializer],
    model: Optional[Type[Model]],
    builder: _LevelBuilder,
) -> None:
    """Route one non-nested field to the right ``builder`` slot."""
    resolved = _introspect_regular_field(
        field_name, field, declared_fields, serializer_class, model
    )
    if resolved is None:
        return
    source_path, entry = resolved
    # ValuesMethodField yields a tuple of source paths and an invoker entry.
    if isinstance(source_path, tuple):
        builder.add_method_field(field_name, source_path, entry)
        return
    # A source crossing a to-many (e.g. books__title) becomes a batched fetch —
    # joining would multiply parent rows by the related count. Only a model-backed
    # level can cross one, so the None check is the same condition, not a guard.
    if model is not None and _source_crosses_many_relation(model, source_path):
        builder.add_scalar_fetch(
            _resolve_scalar_fetch_info(model, source_path, field_name)
        )
        return
    builder.add_column(field_name, source_path, entry)


def _introspect_serializer_fields(
    serializer: ModelSerializer,
    deferred_fields: Sequence[str] = (),
) -> IntrospectionResult:
    """
    Introspect a serializer into a fetch plan for one level, in a single pass:

    - every nested ``ModelSerializer`` defers — auto, unless the dev listed it
      in ``deferred_fields``.
    - every other field becomes a joined column, a method-field invoker, or a
      batched scalar fetch.

    :param serializer: the DRF serializer to introspect.
    :param deferred_fields: the dev's explicit fetch-separately paths at this
        level. Auto-deferred paths are *not* passed in — they are found here.
    :return: an :class:`IntrospectionResult`.
    """
    serializer_class = type(serializer)
    model: Optional[Type[Model]] = getattr(
        getattr(serializer_class, "Meta", None), "model", None
    )
    declared_fields: Dict[str, DrfField] = getattr(serializer, "_declared_fields", {})
    builder = _LevelBuilder(model)

    serializer_fields: Dict[str, DrfField] = cast(
        Dict[str, DrfField], serializer.fields
    )
    for field_name, field in serializer_fields.items():
        if getattr(field, "write_only", False):
            continue
        if _is_nested_model_serializer(field):
            builder.add_nested(
                *_introspect_nested_field(field_name, field, model, deferred_fields)
            )
            continue
        if field_name in deferred_fields:
            continue
        _classify_regular_field(
            field_name, field, declared_fields, serializer_class, model, builder
        )

    return builder.build()


def _iter_auto_deferred_paths(result: IntrospectionResult) -> Iterator[str]:
    """
    Every auto-deferred dotted path in ``result`` — one per ``AutoFetch``,
    already prefixed to its full path from the top serializer.
    """
    for entry in result.auto_fetch:
        yield entry.child_path
    for nested in result.nested_cache.values():
        for entry in nested.auto_fetch:
            yield entry.child_path


def build_validation_schema(serializer: Serializer) -> ValidationSchema:
    """
    Build the DEBUG output-shape schema from a serializer.

    A model-backed level is assembled field by field, so every declared field must
    be present — ``read_only`` included, since DRF makes those ``required=False``
    and they are exactly the deferred fields ``consolidate()`` must fill.

    A plain ``Serializer`` level (a JSON column's schema) runs DRF's
    ``to_representation``, which drops a ``required=False`` field the stored data
    lacks, so absence there is legitimate.
    """
    expected_fields = set()
    required_fields = set()
    nested_schemas = {}
    for field_name, field in serializer.fields.items():
        if getattr(field, "write_only", False):
            continue
        expected_fields.add(field_name)
        if getattr(field, "required", False):
            required_fields.add(field_name)
        if hasattr(field, "child") and isinstance(field.child, Serializer):
            nested_schemas[field_name] = build_validation_schema(field.child)
        elif isinstance(field, Serializer):
            nested_schemas[field_name] = build_validation_schema(field)
    present_fields = (
        expected_fields if isinstance(serializer, ModelSerializer) else required_fields
    )
    return (frozenset(expected_fields), frozenset(present_fields), nested_schemas)


def derive_values_from_serializer(
    serializer: ModelSerializer,
    deferred_fields: Sequence[str] = (),
) -> IntrospectionResult:
    """
    Introspect ``serializer`` into a fetch plan, auto-deferring every nested
    serializer relation. Logs each auto-defer decision at DEBUG.
    """
    result = _introspect_serializer_fields(serializer, deferred_fields=deferred_fields)
    result = result._replace(validation_schema=build_validation_schema(serializer))
    serializer_name = type(serializer).__name__
    for path in sorted(_iter_auto_deferred_paths(result)):
        logger.debug(
            "Auto-deferring nested serializer field '%s' on %s", path, serializer_name
        )
    return result
