from collections import defaultdict
from typing import Any
from typing import Callable
from typing import Dict
from typing import Iterable
from typing import List
from typing import NamedTuple
from typing import Optional
from typing import Sequence
from typing import Tuple
from typing import Type
from typing import Union

from django.conf import settings
from django.db.models import F
from django.db.models import Model
from django.db.models import QuerySet
from rest_framework.serializers import Serializer

from kolibri.core.utils.values_viewset.fetch import AutoFetch
from kolibri.core.utils.values_viewset.fetch import filter_in
from kolibri.core.utils.values_viewset.fetch import ForwardAutoFetch
from kolibri.core.utils.values_viewset.fetch import Pk
from kolibri.core.utils.values_viewset.fetch import pk_key
from kolibri.core.utils.values_viewset.fetch import ScalarFetch
from kolibri.core.utils.values_viewset.field_map import _BaseFieldMap
from kolibri.core.utils.values_viewset.field_map import FrozenRow
from kolibri.core.utils.values_viewset.field_map import MethodFieldEntry
from kolibri.core.utils.values_viewset.field_map import normalize_field_map
from kolibri.core.utils.values_viewset.field_map import Row
from kolibri.core.utils.values_viewset.introspect import derive_values_from_serializer
from kolibri.core.utils.values_viewset.introspect import ValidationSchema
from kolibri.core.utils.values_viewset.method_fields import MethodContext

# Nested levels are keyed by their dotted-underscore serializer path; the top
# level has no path to name it.
TOP_LEVEL_PATH = ""

# One reverse-fetched child's own pk and the parent pk it buckets onto, the
# latter read from the child's back-reference FK column.
LinkPair = Tuple[Pk, Pk]


class ExpandResult(NamedTuple):
    """
    One level's expanded rows. ``pks``, ``link_pairs`` and ``raw_by_pk`` are
    empty unless the level keys by them — each specialized worker below fills
    only the ones its level needs.
    """

    items: List[Row]
    pks: List[Pk]
    # Index-aligned with ``items`` — ReverseAutoFetch zips the two positionally.
    link_pairs: List[LinkPair]
    raw_by_pk: Dict[Pk, Row]


# Maps one raw row to output shape, projecting out ``extra_cols``.
MapRow = Callable[[Row, Optional[MethodContext], Tuple[str, ...]], Row]
LevelExpander = Callable[[Iterable[Row], Optional[MethodContext]], ExpandResult]


class OutputValidationError(Exception):
    """
    DEBUG-only output-shape drift from the serializer's schema.

    Deliberately not a ``ValueError``: callers such as ``serialize_object`` catch
    ``ValueError``/``TypeError`` from a failed lookup and raise ``Http404``, so a
    ``ValueError`` here would be silently turned into a 404 instead of surfacing
    the drift.
    """


class DeferredForwardRef(NamedTuple):
    """
    A forward FK (or forward OneToOne) whose target is fetched in a later
    batched pass, then written back to ``item[field_name]``. Batching lets
    same-model targets from across the tree resolve in one query.
    """

    target_model: Type[Model]
    child_path: str
    target_pk: Pk
    item: Row
    field_name: str


# What one expanded level hands back: its items, their pks, the link pairs a
# reverse-fetched child carries, and the forward refs raised here and below.
LevelResult = Tuple[List[Row], List[Pk], List[LinkPair], List[DeferredForwardRef]]


class _LevelPlan(NamedTuple):
    """A level's serialization compiled to data and a specialized row worker."""

    fetch_values: Tuple[str, ...]  # columns to fetch (declared + keying)
    scalar_fetch: Tuple[ScalarFetch, ...]
    auto_fetch: Tuple[AutoFetch, ...]
    # Bound field_map.annotate_queryset: applies SQL renames (F() aliases)
    # before .values() runs.
    annotate_queryset: Callable[[QuerySet], QuerySet]
    # {target: F(source)} aliases this level pushes to SQL — merged across a
    # model's plans when forward fetches coalesce into one query.
    sql_renames: Dict[str, F]
    expand_rows: LevelExpander
    # False for explicit deferred_fields levels — the developer owns those.
    is_fetched_child: bool


class _LevelExpander:
    """
    Expands one level's raw rows, filling only the keying that level asks for:
    ``pks`` once it has fetches, ``link_pairs`` for a reverse-fetched child
    (``r[link]`` being the parent pk it buckets onto), and ``raw_by_pk`` when a
    forward fetch reads its FK column back out.

    The keying is fixed for every row, so it is bound once here.
    """

    __slots__ = ("_map_row", "_extra_cols", "_raw_pk_name", "_link", "_needs_raw")

    def __init__(
        self,
        field_map: _BaseFieldMap,
        extra_cols: Tuple[str, ...],
        raw_pk_name: Optional[str],
        link: Optional[str],
        needs_raw_by_pk: bool,
    ):
        self._map_row = field_map.map_row
        self._extra_cols = extra_cols
        self._raw_pk_name = raw_pk_name
        self._link = link
        self._needs_raw = needs_raw_by_pk

    def __call__(
        self, raw_rows: Iterable[Row], mc: Optional[MethodContext]
    ) -> ExpandResult:
        # Read to locals once: the loop below runs per row, attribute lookups
        # would not.
        map_row = self._map_row
        extra_cols = self._extra_cols
        raw_pk_name = self._raw_pk_name
        link = self._link
        needs_raw = self._needs_raw

        items, pks, link_pairs = [], [], []
        raw_by_pk: Dict[Pk, Row] = {}
        for r in raw_rows:
            items.append(map_row(r, mc, extra_cols))
            if raw_pk_name is None:
                continue
            pk = r[raw_pk_name]
            pks.append(pk)
            if needs_raw:
                raw_by_pk.setdefault(pk, r)
            if link is not None:
                link_pairs.append((pk, r[link]))
        return ExpandResult(items, pks, link_pairs, raw_by_pk)


class ValuesEngine:
    """
    Turns a Django queryset into plain dicts via ``values()`` instead of DRF's
    per-instance serialization. ``serialize()`` is the entry point.

    Built once per viewset by ``from_serializer()`` (derived) or
    ``from_explicit()`` (legacy ``values``/``field_map``) and reused across
    requests: instances carry no per-request state.

    Each level fetches its joinable columns in one query and maps the raw rows
    to output shape; relations that can't be joined are handed to their fetch
    descriptors, which batch one follow-up query per relation. Under ``DEBUG``
    the output is validated against the serializer's schema.
    """

    # Fixed instance shape — the two factories fill these in, nothing else is set.
    __slots__ = (
        "_serializer_derived",
        "_values",
        "_field_map",
        "_scalar_fetch",
        "_auto_fetch",
        "_nested_cache",
        "_top_model",
        "_validation_schema",
        "_has_method_fields",
        "_plans",
    )

    def __init__(self):
        self._serializer_derived = False
        self._values = ()
        self._field_map = None
        self._scalar_fetch = ()
        self._auto_fetch = ()
        self._nested_cache = {}
        self._top_model = None
        self._validation_schema = None
        self._has_method_fields = False
        self._plans = {}

    @classmethod
    def from_serializer(
        cls,
        serializer_class: Type[Serializer],
        deferred_fields: Sequence[str] = (),
    ) -> "ValuesEngine":
        self = cls()
        self._serializer_derived = True
        # Instantiate only for introspection (not retained); the result carries
        # everything the engine needs, so the serializer is never re-read.
        result = derive_values_from_serializer(
            serializer_class(), deferred_fields=deferred_fields
        )
        self._values = tuple(result.values)
        self._field_map = result.field_map
        self._scalar_fetch = result.scalar_fetch
        self._auto_fetch = result.auto_fetch
        self._nested_cache = result.nested_cache
        self._top_model = result.model
        self._validation_schema = result.validation_schema
        self._has_method_fields = self._check_has_method_fields()
        self._plans = self._compile_plans()
        return self

    @classmethod
    def from_explicit(
        cls, values: Sequence[str], field_map: Optional[Dict[str, Any]]
    ) -> "ValuesEngine":
        # TODO(#14302): remove with the legacy explicit values/field_map path.
        self = cls()
        self._values = tuple(values)
        self._field_map = normalize_field_map(field_map or {})
        self._plans = self._compile_plans()
        return self

    def _make_plan(
        self,
        values: Sequence[str],
        field_map: _BaseFieldMap,
        scalar_fetch: Tuple[ScalarFetch, ...],
        auto_fetch: Tuple[AutoFetch, ...],
        model: Optional[Type[Model]],
        link: Optional[str],
        is_fetched_child: bool,
    ) -> _LevelPlan:
        """
        Compile one level's plan. ``is_fetched_child`` is True for a level the
        engine fetches as a child (it always keys by pk); ``link`` set ⇒
        reverse-fetched child, and is the child's back-reference FK column.
        """
        carry_pk = is_fetched_child or bool(scalar_fetch) or bool(auto_fetch)
        raw_pk_name = model._meta.pk.name if (carry_pk and model is not None) else None
        fetch_values = list(values)
        extra_cols = []
        if link is not None and link not in fetch_values:
            fetch_values.append(link)
            extra_cols.append(link)
        if raw_pk_name is not None and raw_pk_name not in fetch_values:
            fetch_values.append(raw_pk_name)
            extra_cols.append(raw_pk_name)
        # A forward FK's source column is fetched only to key its deferred fetch.
        # When the serializer doesn't also declare it as a field, it's a keying
        # column, not output — mark it so map_row projects it out instead of
        # leaking it (the all-passthrough noop path would otherwise keep it).
        for entry in auto_fetch:
            if (
                isinstance(entry, ForwardAutoFetch)
                and entry.link not in field_map
                and entry.link not in extra_cols
            ):
                extra_cols.append(entry.link)
        return _LevelPlan(
            fetch_values=tuple(fetch_values),
            scalar_fetch=scalar_fetch,
            auto_fetch=auto_fetch,
            annotate_queryset=field_map.annotate_queryset,
            sql_renames=field_map.sql_renames(),
            expand_rows=_LevelExpander(
                field_map,
                tuple(extra_cols),
                raw_pk_name,
                link,
                needs_raw_by_pk=any(f.needs_raw_by_pk for f in auto_fetch),
            ),
            is_fetched_child=is_fetched_child,
        )

    def _compile_plans(self) -> Dict[str, _LevelPlan]:
        """
        One plan per level, keyed by serializer path. A
        nested level's reach (``link``, carry-pk) is fixed by the ``AutoFetch``
        that fetches it. A path deferred explicitly via ``deferred_fields`` is
        fetched by the developer through ``serialize_queryset``.
        """
        plans = {
            TOP_LEVEL_PATH: self._make_plan(
                self._values,
                self._field_map,
                self._scalar_fetch,
                self._auto_fetch,
                self._top_model,
                link=None,
                is_fetched_child=False,
            )
        }
        entries = list(self._auto_fetch)
        for nested in self._nested_cache.values():
            entries.extend(nested.auto_fetch)
        for entry in entries:
            nested = self._nested_cache[entry.child_path]
            plans[entry.child_path] = self._make_plan(
                nested.values,
                nested.field_map,
                nested.scalar_fetch,
                nested.auto_fetch,
                entry.target_model,
                entry.child_fetch_link,
                is_fetched_child=True,
            )
        # Explicit deferred_fields paths, not auto-fetched, get a plan here.
        for path, nested in self._nested_cache.items():
            if path not in plans:
                plans[path] = self._make_plan(
                    nested.values,
                    nested.field_map,
                    nested.scalar_fetch,
                    nested.auto_fetch,
                    nested.model,
                    link=None,
                    is_fetched_child=False,
                )
        return plans

    def _check_has_method_fields(self) -> bool:
        """
        True if any level (top or nested-cache) has a method field, so
        ``serialize()`` only builds the context carrier when one is needed.
        """
        field_maps = [self._field_map] + [
            nested.field_map for nested in self._nested_cache.values()
        ]
        return any(
            isinstance(entry, MethodFieldEntry)
            for fm in field_maps
            for entry in fm.values()
        )

    @property
    def values(self) -> Tuple[str, ...]:
        return self._values

    @property
    def db_column_map(self) -> Dict[str, str]:
        return self._field_map.db_column_map()

    @property
    def plain_renames(self) -> Dict[str, str]:
        return self._field_map.plain_renames()

    def validate_output(self, items: Sequence[Row]) -> None:
        """No-op unless serializer-derived; validates output in DEBUG mode."""
        if not items or not self._serializer_derived:
            return
        self._validate_items_against_schema(items, self._validation_schema)

    def serialize(
        self,
        queryset: QuerySet,
        *,
        context: Optional[Dict[str, Any]] = None,
        group_by: Optional[str] = None,
        path: str = TOP_LEVEL_PATH,
    ) -> Union[List[Row], Dict[Any, List[Row]]]:
        """
        Return ``queryset``'s rows as output dicts, or as
        ``{group_by value: [dicts]}`` when ``group_by`` names an output field.

        ``context`` is the serializer context method fields are given; ``path``
        selects which level's plan to serialize under.
        """
        # Per-call, never stored on the shared engine — isolates concurrent requests.
        method_context = MethodContext(context) if self._has_method_fields else None
        items, _pks, _link_pairs, deferred_forward_refs = self.expand_level(
            queryset, path, method_context
        )
        self._resolve_deferred_forward_refs(deferred_forward_refs, method_context)
        if group_by is not None:
            return self._group_items(items, group_by)
        return items

    def _group_items(self, items: List[Row], group_by: str) -> Dict[Any, List[Row]]:
        """
        Group items into ``{group_by value: [items]}``. Strict lookup: a
        ``group_by`` naming no output field is a caller error, not a silent
        bucket under ``None``.
        """
        # Key type is whatever the grouped field holds, so genuinely Any.
        result: Dict[Any, List[Row]] = defaultdict(list)
        for item in items:
            result[item[group_by]].append(item)
        return dict(result)

    def expand_level(
        self,
        queryset: QuerySet,
        serializer_path: str,
        method_context: Optional[MethodContext],
    ) -> LevelResult:
        """Serialize one level and apply its deferred fetches."""
        plan = self._plans.get(serializer_path)
        if plan is None:
            raise ValueError(
                "No serialization plan for path {!r} — serialize_queryset needs "
                "a serializer-derived viewset with that nested path.".format(
                    serializer_path
                )
            )
        raw_rows = plan.annotate_queryset(queryset).values(*plan.fetch_values)
        return self._expand_plan_rows(raw_rows, plan, method_context)

    def _expand_plan_rows(
        self,
        raw_rows: Iterable[Row],
        plan: _LevelPlan,
        method_context: Optional[MethodContext],
    ) -> LevelResult:
        """
        Serialize already-materialized ``raw_rows`` under ``plan`` and apply its
        deferred fetches. The forward path uses this to serialize each shape from
        a model's shared fetch; ``expand_level`` uses it after its own
        ``.values()`` call.
        """
        items, pks, link_pairs, raw_by_pk = plan.expand_rows(raw_rows, method_context)
        if plan.is_fetched_child and settings.DEBUG:
            items = [FrozenRow(item) for item in items]

        # The engine is the sole writer of nested fields: fetches only compute
        # values.
        deferred_forward_refs = []
        for entry in (*plan.scalar_fetch, *plan.auto_fetch):
            values, nested_forward_refs, forward_targets = entry.resolve(
                self, pks, raw_by_pk, method_context
            )
            for item, value in zip(items, values):
                dict.__setitem__(item, entry.field_name, value)
            deferred_forward_refs += nested_forward_refs
            if forward_targets is None:
                continue
            # Only a forward auto-fetch returns targets, so this narrows rather
            # than filters — it is what makes entry.child_path reachable.
            if not isinstance(entry, ForwardAutoFetch):
                raise TypeError(
                    "{} returned forward targets but is not a forward fetch".format(
                        type(entry).__name__
                    )
                )
            for item, target_pk in zip(items, forward_targets):
                if target_pk is not None:
                    deferred_forward_refs.append(
                        DeferredForwardRef(
                            entry.target_model,
                            entry.child_path,
                            target_pk,
                            item,
                            entry.field_name,
                        )
                    )

        return items, pks, link_pairs, deferred_forward_refs

    def _resolve_deferred_forward_refs(
        self,
        deferred_forward_refs: List[DeferredForwardRef],
        method_context: Optional[MethodContext],
    ) -> None:
        """
        Resolve recorded forward-FK references with a worklist fixpoint,
        separating the two concerns the old shape key conflated:

        - Fetch is keyed by model: every reference to a model — whatever the
          serializer — is pulled in one query over the union of pks and columns.
          Paths whose SQL-rename annotations conflict can't share a ``.values()``
          and fetch separately (see ``_coalesce_fetches``).
        - Serialize is keyed by ``child_path``: each path owns one plan, so a
          plan is never applied to another shape's rows. Mismerge is impossible
          by construction — no signature needed.

        Expanding a target collects its own forward refs into the next round, so
        deep chains converge level by level. Items embed live (no copy), so a
        later round's mutation of an embedded target lands on the same object.
        """
        # Terminates: one nesting level per round; serializers acyclic.
        while deferred_forward_refs:
            next_refs: List[DeferredForwardRef] = []
            by_path: Dict[str, List[DeferredForwardRef]] = defaultdict(list)
            for ref in deferred_forward_refs:
                by_path[ref.child_path].append(ref)

            for paths in self._coalesce_fetches(by_path):
                next_refs += self._fetch_and_serialize(paths, by_path, method_context)

            deferred_forward_refs = next_refs

    def _coalesce_fetches(
        self, by_path: Dict[str, List[DeferredForwardRef]]
    ) -> List[List[str]]:
        """
        Group the pending child_paths into one fetch each: same target model,
        and SQL-rename annotations that don't collide on a target name. A
        collision (same alias from a different source) can't share one
        ``.values()`` call, so those paths fetch on their own.
        """
        by_model: Dict[Type[Model], List[str]] = defaultdict(list)
        for path, refs in by_path.items():
            by_model[refs[0].target_model].append(path)

        groups: List[List[str]] = []
        for paths in by_model.values():
            buckets: List[Tuple[Dict[str, F], List[str]]] = []
            for path in paths:
                renames = self._plans[path].sql_renames
                for merged, members in buckets:
                    if all(
                        merged[k].name == v.name
                        for k, v in renames.items()
                        if k in merged
                    ):
                        merged.update(renames)
                        members.append(path)
                        break
                else:
                    buckets.append((dict(renames), [path]))
            groups.extend(members for _merged, members in buckets)
        return groups

    def _fetch_and_serialize(
        self,
        paths: Sequence[str],
        by_path: Dict[str, List[DeferredForwardRef]],
        method_context: Optional[MethodContext],
    ) -> List[DeferredForwardRef]:
        """
        One DB fetch for ``paths`` (same model, mergeable annotations), then
        serialize each path's rows under its own plan and assign to its refs.

        Parents sharing a forward target embed the *same* item dict by identity
        (one serialized row per target pk); harmless for the read-only JSON path,
        but a ``consolidate()`` override that mutates one in place writes it to
        every parent sharing that target.
        """
        model = by_path[paths[0]][0].target_model
        pk_name = model._meta.pk.name
        all_cols = sorted({c for p in paths for c in self._plans[p].fetch_values})
        merged_renames: Dict[str, F] = {}
        for p in paths:
            merged_renames.update(self._plans[p].sql_renames)
        all_pks = list({ref.target_pk for p in paths for ref in by_path[p]})

        # Forward FK / OneToOne is always to-one; load through the base manager
        # (as Django's ForwardManyToOneDescriptor does) so a target hidden by its
        # default manager still resolves rather than becoming a spurious null.
        qs = filter_in(model._base_manager, "pk", all_pks)
        if merged_renames:
            qs = qs.annotate(**merged_renames)
        rows_by_pk = {pk_key(row[pk_name]): row for row in qs.values(*all_cols)}

        next_refs: List[DeferredForwardRef] = []
        for path in paths:
            plan = self._plans[path]
            refs = by_path[path]
            keys = {pk_key(ref.target_pk) for ref in refs}
            # Project the shared rows to this plan's own columns, so expansion is
            # identical to a dedicated .values(*plan.fetch_values) fetch.
            rows = [
                {c: rows_by_pk[k][c] for c in plan.fetch_values}
                for k in keys
                if k in rows_by_pk
            ]
            items, item_pks, _lp, nested_forward_refs = self._expand_plan_rows(
                rows, plan, method_context
            )
            next_refs += nested_forward_refs
            items_by_pk = {pk_key(pk): item for pk, item in zip(item_pks, items)}
            for ref in refs:
                dict.__setitem__(
                    ref.item, ref.field_name, items_by_pk.get(pk_key(ref.target_pk))
                )
        return next_refs

    @staticmethod
    def _validate_items_against_schema(
        items: Sequence[Row],
        schema: ValidationSchema,
    ) -> None:
        """
        Validate items against a cached schema; recurses into nested schemas.

        Checks only the first item — values() rows share uniform keys, so one
        catches schema drift.
        """
        if not items:
            return

        expected_fields, present_fields, nested_schemas = schema
        item = items[0]
        item_keys = set(item.keys())

        missing = present_fields - item_keys
        if missing:
            raise OutputValidationError(
                "Missing fields in output: {}. Expected: {}, Got: {}".format(
                    missing, expected_fields, item_keys
                )
            )

        extra = item_keys - expected_fields
        if extra:
            raise OutputValidationError(
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
                ValuesEngine._validate_items_against_schema(nested_value, nested_schema)
