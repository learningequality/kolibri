"""
Field-map data model: how one raw ``values()`` row becomes an output dict.

A ``FieldMapEntry`` produces one output field's value. ``_FieldMap`` (serializer-
derived) and ``_LegacyFieldMap`` (explicit ``values``/``field_map``) own the
row → output mapping. Runtime module — imported per request, no compile-time logic.
"""

from abc import ABC
from abc import ABCMeta
from abc import abstractmethod
from collections import Counter
from typing import Any
from typing import Callable
from typing import Dict
from typing import List
from typing import Optional
from typing import Set
from typing import Tuple
from typing import Type

from django.db.models import F
from django.db.models import Model
from django.db.models import QuerySet

from kolibri.core.utils.values_viewset.method_fields import _SourcesProxy
from kolibri.core.utils.values_viewset.method_fields import compile_sources
from kolibri.core.utils.values_viewset.method_fields import MethodContext

# A row produced by ``queryset.values()`` — dict of flat path → value.
Row = Dict[str, Any]


class FrozenRow(dict):
    """
    A fetched nested object under ``DEBUG``. One dict is serialized per target,
    so parents sharing it would all see an in-place edit. The engine's own
    writes go through ``dict.__setitem__``, bypassing the guard.
    """

    __slots__ = ()

    def _frozen(self, *args: Any, **kwargs: Any) -> None:
        raise TypeError(
            "This nested object is shared between parents — mutating it would "
            "change all of them. Copy it (dict(obj)) and assign the copy."
        )

    __setitem__ = _frozen
    __delitem__ = _frozen
    clear = _frozen
    pop = _frozen
    popitem = _frozen  # type: ignore[assignment]
    setdefault = _frozen
    update = _frozen


class FieldMapEntry(ABC):
    """
    Produces one output field's value from a raw ``values()`` row.

    - ``source``: backing DB column, or ``None`` for computed (callable/method)
      fields — source-introspecting consumers (ordering filter, serializer
      generation) skip ``source is None`` entries.
    - ``to_repr``: the raw-value transform, ``None`` for a passthrough.
    """

    __slots__ = ()

    source: Optional[str] = None
    to_repr: Optional[Callable] = None

    @property
    def read_columns(self) -> Tuple[str, ...]:
        """
        Raw row columns ``extract`` reads. Rename promotion drops a column from
        ``values()`` only when no other entry reads it, so an entry reading more
        than its ``source`` must say so here.
        """
        return () if self.source is None else (self.source,)

    @abstractmethod
    def extract(self, row: Row, method_context: Optional[MethodContext] = None) -> Any:
        """Produce the output value, reading ``row`` without mutating it."""

    def apply(
        self, key: str, row: Row, method_context: Optional[MethodContext] = None
    ) -> None:
        """
        Write ``extract``'s value under ``key``. Legacy maps drop consumed
        source columns after mapping (see ``_LegacyFieldMap``); others don't
        mutate the row.
        """
        row[key] = self.extract(row, method_context)


class SourceFieldEntry(FieldMapEntry):
    """
    Single-source rename, optionally transformed.

    ``to_repr=None`` is a plain rename. With ``to_repr`` set and a ``None`` raw
    value, ``default`` is substituted — mirrors DRF's get_attribute fallback for
    missing relations.
    """

    __slots__ = ("source", "to_repr", "default")

    # Narrows the base's Optional: this entry always has a backing column.
    source: str

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

    def extract(self, row: Row, method_context: Optional[MethodContext] = None) -> Any:
        # Strict lookup — a missing key means a misconfigured map. _represent
        # handles None (LEFT JOIN miss).
        return self._represent(row[self.source])


class _LegacyCallableFieldEntry(FieldMapEntry):
    """
    Legacy ``field_map`` callable reading only the row.

    Invoked 1-arg to avoid a per-row wrapper frame on the hot explicit-values
    path. ``source``/``to_repr`` stay ``None``, so source-introspecting consumers
    skip it.

    TODO(#14302): remove with the legacy explicit values/field_map path.
    """

    __slots__ = ("func",)

    def __init__(self, func: Callable[[Row], Any]):
        self.func = func

    def extract(self, row: Row, method_context: Optional[MethodContext] = None) -> Any:
        return self.func(row)


class MethodFieldEntry(FieldMapEntry):
    """
    Invokes a ``ValuesMethodField``'s unbound ``get_*`` with a per-call
    ``MethodContext`` as ``self`` and a ``_SourcesProxy`` over its sources as
    ``obj``.

    Threading context per call (not binding a shared serializer) keeps the engine
    free of per-request state, so one engine serializes concurrent requests safely.
    """

    __slots__ = ("method_func", "sources", "spec")

    def __init__(self, method_func: Callable, sources: Tuple[str, ...]):
        self.method_func = method_func
        self.sources = sources
        self.spec = compile_sources(sources)

    @property
    def read_columns(self) -> Tuple[str, ...]:
        return self.sources

    def extract(self, row: Row, method_context: Optional[MethodContext] = None) -> Any:
        # method_context is never None here: the engine builds one whenever any
        # level has a method field.
        return self.method_func(method_context, _SourcesProxy(row, self.spec))


FieldMap = Dict[str, FieldMapEntry]


class _BaseFieldMap(dict, metaclass=ABCMeta):
    """Dict of output field name → entry; owns row mapping and source introspection."""

    # Set by finalize(): True when every entry is a trivial passthrough.
    is_noop = False

    # Set by finalize(): columns read only to produce other fields, which
    # map_row drops itself. The engine leaves these out of its keying columns.
    dropped_columns: Tuple[str, ...] = ()

    def finalize(self) -> None:
        """Precompute ``is_noop`` after all entries are added."""
        self.is_noop = all(
            isinstance(entry, SourceFieldEntry)
            and entry.source == key
            and entry.to_repr is None
            for key, entry in self.items()
        )

    @abstractmethod
    def map_row(
        self,
        row: Row,
        method_context: Optional[MethodContext] = None,
        extra_cols: Tuple[str, ...] = (),
    ) -> Row:
        """
        Produce the output row for a raw ``values()`` row, dropping the
        engine's keying columns (``extra_cols``) that aren't declared output.
        """

    def plain_renames(self) -> Dict[str, str]:
        """
        ``{source: target}`` for plain renames (source set, no ``to_repr``),
        exposing raw values under the declared name.
        """
        return {
            entry.source: key
            for key, entry in self.items()
            if entry.source is not None and entry.to_repr is None
        }

    def db_column_map(self) -> Dict[str, str]:
        """
        ``{api_name: db_column}`` where they differ (passthroughs excluded).

        Ordering filters use it to map API field names to DB columns.
        """
        return {
            key: entry.source
            for key, entry in self.items()
            if entry.source is not None and entry.source != key
        }

    def annotate_queryset(self, queryset: QuerySet) -> QuerySet:
        """No-op default: return queryset unchanged."""
        return queryset

    def sql_renames(self) -> Dict[str, F]:
        """``{target: F(source)}`` aliases pushed to SQL; none by default."""
        return {}


class _FieldMap(_BaseFieldMap):
    """
    Serializer-introspected field map covering every declared output field.

    ``map_row`` writes the mapped fields over the raw row wherever that is
    equivalent to rebuilding it, then drops the columns read only to produce
    them, so method-field sources never leak into output.
    ``_sql_renames`` holds F() aliases for plain renames, applied to SQL by
    ``annotate_queryset``.
    """

    # Set by finalize().
    _column_renames: Tuple[Tuple[str, str], ...] = ()
    _column_transforms: Tuple[Tuple[str, str, Callable], ...] = ()
    _computed_fields: Tuple[Tuple[str, FieldMapEntry], ...] = ()
    _in_place = False

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._sql_renames: Dict[str, F] = {}

    def finalize(self) -> None:
        super().finalize()
        keys = set(self.keys())
        # Split the entries by how map_row must produce them, so the per-row
        # loops carry no per-field type dispatch. A passthrough appears in none
        # of them: the row already holds it under its own name.
        renames = []
        transforms = []
        computed = []
        written = set()
        for key, entry in self.items():
            if not isinstance(entry, SourceFieldEntry):
                computed.append((key, entry))
            elif entry.to_repr is not None:
                transforms.append((key, entry.source, entry._represent))
            elif entry.source != key:
                renames.append((key, entry.source))
            else:
                continue
            written.add(key)
        self._column_renames = tuple(renames)
        self._column_transforms = tuple(transforms)
        self._computed_fields = tuple(computed)
        self.dropped_columns = tuple(
            {column for entry in self.values() for column in entry.read_columns} - keys
        )
        # Writing an output field over the row it was read from is only
        # equivalent to building a fresh dict while no *other* entry reads that
        # column: otherwise the entry that ran second would see the mapped value
        # in place of the raw one. Reading a column an entry writes under its own
        # name is fine — the read happens before the write.
        self._in_place = not any(
            column in written
            for key, entry in self.items()
            for column in entry.read_columns
            if column != key
        )

    def map_row(
        self,
        row: Row,
        method_context: Optional[MethodContext] = None,
        extra_cols: Tuple[str, ...] = (),
    ) -> Row:
        if self.is_noop:
            for column in extra_cols:
                del row[column]
            return row
        # Write the mapped fields over the row rather than rebuilding it: a wide
        # row is mostly passthrough, and rebuilding costs a lookup and a store
        # per column of every row. Drops run last so an entry still reads its
        # raw source.
        output = row if self._in_place else dict(row)
        for key, source in self._column_renames:
            output[key] = row[source]
        for key, source, represent in self._column_transforms:
            output[key] = represent(row[source])
        for key, entry in self._computed_fields:
            output[key] = entry.extract(row, method_context)
        for column in self.dropped_columns:
            del output[column]
        for column in extra_cols:
            del output[column]
        return output

    def db_column_map(self) -> Dict[str, str]:
        """
        ``{api_name: db_column}`` resolving SQL-rename aliases back to source.

        - A promoted rename's entry is now a passthrough (source == key), so its
          original column comes from ``_sql_renames``.
        - Other renames and passthroughs fall back to the base.
        """
        result = {}
        for key, entry in self.items():
            if key in self._sql_renames:
                result[key] = self._sql_renames[key].name
            elif entry.source is not None and entry.source != key:
                result[key] = entry.source
        return result

    def annotate_queryset(self, queryset: QuerySet) -> QuerySet:
        """Apply pre-computed SQL-level F() aliases to the queryset."""
        if self._sql_renames:
            return queryset.annotate(**self._sql_renames)
        return queryset

    def sql_renames(self) -> Dict[str, F]:
        return self._sql_renames

    def promote_renames_to_sql_aliases(
        self, values: List[str], model: Type[Model]
    ) -> List[str]:
        """
        Precompute SQL-level F() aliases for plain source→target renames.

        Performance optimization: doing the rename in SQL (an ``F()`` alias)
        rather than in Python lets the entry become a passthrough. When every
        entry is a passthrough the field map is a no-op and ``map_row`` returns
        the raw ``values()`` row as-is, skipping the per-row dict rebuild.

        Promotes a rename when:
        - source and target differ (not a passthrough)
        - source is read by exactly one entry (safe to drop from values())
        - target doesn't shadow a model field (Django raises ValueError otherwise)

        Mutates self in place (promoted entries → passthroughs, populates
        ``_sql_renames``) and returns ``values`` with promoted sources renamed to
        targets.
        """
        model_field_names: Set[str] = {f.name for f in model._meta.get_fields()}  # type: ignore[attr-defined]
        source_refcount = Counter(
            column for entry in self.values() for column in entry.read_columns
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
    Field map normalized from a legacy explicit ``values``/``field_map`` viewset.

    ``map_row`` mutates the row in place — writing each target, then dropping
    rename-consumed source columns — so unclaimed ``values()`` keys pass through.
    Required for back-compat with viewsets relying on that passthrough.

    TODO(#14302): remove with the legacy explicit values/field_map path.
    """

    # Set by finalize(): rename sources to drop after mapping, minus output keys.
    _drop_sources: Tuple[str, ...] = ()

    def finalize(self) -> None:
        super().finalize()
        keys = set(self.keys())
        self._drop_sources = tuple(
            {
                entry.source
                for key, entry in self.items()
                if entry.source is not None and entry.source != key
            }
            - keys
        )

    def map_row(
        self,
        row: Row,
        method_context: Optional[MethodContext] = None,
        extra_cols: Tuple[str, ...] = (),
    ) -> Row:
        # Legacy maps never receive engine keying columns.
        for key, entry in self.items():
            entry.apply(key, row, method_context)
        for source in self._drop_sources:
            row.pop(source, None)
        return row


def normalize_field_map(field_map: Dict[str, Any]) -> _LegacyFieldMap:
    """
    Normalize a user-written legacy field_map to canonical entry objects.

    Str shorthand → ``SourceFieldEntry``; bare callable → ``_LegacyCallableFieldEntry``
    (invoked with ``row`` only). Returns a fresh ``_LegacyFieldMap``; input untouched.

    TODO(#14302): remove with the legacy explicit values/field_map path.
    """

    def wrap(value: Any) -> FieldMapEntry:
        if isinstance(value, str):
            return SourceFieldEntry(value)
        return _LegacyCallableFieldEntry(value)

    result = _LegacyFieldMap((key, wrap(value)) for key, value in field_map.items())
    result.finalize()
    return result
