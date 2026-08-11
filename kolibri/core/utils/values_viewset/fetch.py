"""
Deferred-fetch descriptors for ``ValuesEngine``.

``resolve`` is pure: it computes the per-item values to assign (aligned to
``pks``) and never touches the items — the engine owns that write. Reverse
fetches recurse through ``engine.expand_level``. Depends on neither serializer
introspection nor engine internals.
"""

from abc import ABC
from abc import abstractmethod
from collections import defaultdict
from typing import Any
from typing import Dict
from typing import Iterable
from typing import List
from typing import Optional
from typing import Sequence
from typing import Tuple
from typing import Type
from typing import TYPE_CHECKING
from typing import Union
from uuid import UUID

from django.db.models import Manager
from django.db.models import Model
from django.db.models import QuerySet

from kolibri.core.mixins import InlineIn
from kolibri.core.utils.values_viewset.field_map import Row
from kolibri.core.utils.values_viewset.method_fields import MethodContext

if TYPE_CHECKING:
    from kolibri.core.utils.values_viewset.engine import DeferredForwardRef
    from kolibri.core.utils.values_viewset.engine import ValuesEngine

# A model pk as ``values()`` yields it: str for morango's UUIDField (a CharField
# subclass) and CharField pks, int for AutoField, UUID for Django's own UUIDField.
Pk = Union[str, int, UUID]
# A ``Pk`` normalized by ``pk_key`` for cross-level joins.
PkKey = str
# What ``LevelFetch.resolve`` returns: the values to assign (aligned to ``pks``),
# forward refs a child recursion surfaced, and — for a forward fetch only — the
# per-parent target pks the engine batch-resolves.
ResolveResult = Tuple[List[Any], List["DeferredForwardRef"], Optional[List[Pk]]]


def filter_in(manager: Manager, path: str, pks: Sequence[Pk]) -> QuerySet:
    """
    Filter ``manager`` by ``path`` in ``pks``, inlining the pks as SQL literals.

    A deferred fetch's parent-pk list is unbounded where the join it replaced
    bound nothing at all, so a parameterized ``IN`` raises ``too many SQL
    variables`` on an unpaginated list. See ``InlineIn``, which binds instead
    for any pk it cannot safely inline.
    """
    return manager.filter(**{"{}__{}".format(path, InlineIn.lookup_name): pks})


def pk_key(pk: Pk) -> PkKey:
    """
    Normalize a pk to its cross-level bucket/join key.

    A parent's pk and a child's link-back value come from different ``values()``
    columns and can differ in type (UUID instance vs hex string), so every join
    keys on ``str(pk)``. Route all keying through here so the sites can't desync.
    """
    return str(pk)


class LevelFetch(ABC):
    """
    A relation fetched in a follow-up query and assembled onto a level's
    items under ``field_name``.
    """

    __slots__ = ()

    # Declared here because the engine reads them off any fetch; each concrete
    # subclass carries them in __slots__.
    field_name: str
    target_model: Type[Model]

    # True when resolve() reads the parent raw rows; the engine only
    # materializes raw_by_pk for a level that needs it.
    needs_raw_by_pk = False

    @abstractmethod
    def resolve(
        self,
        engine: "ValuesEngine",
        pks: Sequence[Pk],
        raw_by_pk: Dict[Pk, Row],
        method_context: Optional[MethodContext],
    ) -> ResolveResult:
        """Compute this relation's contribution, without mutating the items."""


def _dedupe_scalar_rows(
    rows: Iterable[Row], key_col: str, value_col: str
) -> Dict[PkKey, List[Any]]:
    """
    Bucket ``(key_col, value_col)`` rows into ``{pk_key: [distinct values]}``,
    dropping nulls. Shared by the two scalar-fetch shapes so their dedup can't
    drift.
    """
    buckets: Dict[PkKey, List[Any]] = defaultdict(list)
    seen: Dict[PkKey, set] = defaultdict(set)
    for row in rows:
        key = pk_key(row[key_col])
        value = row[value_col]
        if value is not None and value not in seen[key]:
            seen[key].add(value)
            buckets[key].append(value)
    return buckets


class ScalarFetch(LevelFetch):
    """
    A scalar output field whose source reaches *through* a to-many relation to a
    plain column — e.g. ``books.title`` on an author. Joining would multiply the
    parent's rows by its related count, so the values are pulled in a follow-up
    query and assembled as a deduplicated list per parent.

    Not an ``AutoFetch``: it yields flat scalars rather than a nested object, and
    has no child level, so no ``child_fetch_link`` and never any forward refs.

    Both subclasses anchor on the to-many's own model, so its default manager
    filters the values.
    """

    __slots__ = ()


class ScalarFetchEntry(ScalarFetch):
    """
    To-many as the first source segment (``books.title``): the parent reaches
    the values over a reverse relation, so query the child model directly and
    bucket each row back onto the parent by ``link`` — the child's FK column
    pointing at the parent.
    """

    __slots__ = ("field_name", "target_model", "link", "leaf_source")

    def __init__(
        self,
        field_name: str,
        target_model: Type[Model],
        link: str,
        leaf_source: str,
    ):
        self.field_name = field_name
        self.target_model = target_model  # related model holding the values
        self.link = link  # accessor on the target back to the parent's pk
        self.leaf_source = leaf_source  # the value column on the target

    def resolve(
        self,
        engine: "ValuesEngine",
        pks: Sequence[Pk],
        raw_by_pk: Dict[Pk, Row],
        method_context: Optional[MethodContext],
    ) -> ResolveResult:
        rows = filter_in(self.target_model._default_manager, self.link, pks).values(
            self.link, self.leaf_source
        )
        buckets = _dedupe_scalar_rows(rows, self.link, self.leaf_source)
        return [buckets.get(pk_key(pk), []) for pk in pks], [], None


class ParentPathScalarFetch(ScalarFetch):
    """
    To-many crossed *below* the first segment (``publisher.books.title``).

    Anchor on the model owning the first crossed to-many (``Book``) so its
    default manager filters the values — a soft-deleted child's value drops out,
    matching Django's related manager — and reach parents through the reversed
    relation path (``publisher__authors``). To-one hops after the anchor stay
    plain joins, i.e. base-manager semantics, matching a forward FK.
    """

    __slots__ = ("field_name", "target_model", "reverse_path", "leaf_source")

    def __init__(
        self,
        field_name: str,
        target_model: Type[Model],
        reverse_path: str,
        leaf_source: str,
    ):
        self.field_name = field_name
        self.target_model = target_model  # model owning the first crossed to-many
        self.reverse_path = reverse_path  # ORM path from target back to parent pk
        self.leaf_source = leaf_source  # value column on / reachable from target

    def resolve(
        self,
        engine: "ValuesEngine",
        pks: Sequence[Pk],
        raw_by_pk: Dict[Pk, Row],
        method_context: Optional[MethodContext],
    ) -> ResolveResult:
        rows = filter_in(
            self.target_model._default_manager, self.reverse_path, pks
        ).values(self.reverse_path, self.leaf_source)
        buckets = _dedupe_scalar_rows(rows, self.reverse_path, self.leaf_source)
        return [buckets.get(pk_key(pk), []) for pk in pks], [], None


class AutoFetch(LevelFetch):
    """
    A deferred nested-serializer relation: a child level the engine fetches
    and assembles onto its parents.
    """

    __slots__ = ()

    # The path its child level's plan is keyed by.
    child_path: str

    @property
    @abstractmethod
    def child_fetch_link(self) -> Optional[str]:
        """
        The accessor the child level is filtered by, or ``None`` when the
        child is fetched by its own pk (a forward target).
        """

    @abstractmethod
    def with_child_path(self, child_path: str) -> "AutoFetch":
        """A copy of this entry whose child level lives at ``child_path``."""


class ReverseAutoFetch(AutoFetch):
    """
    A reverse FK / M2M: one batched child query filtered by the parents' pks,
    bucketed back onto each parent (a list when ``is_many``, else one object).
    """

    __slots__ = (
        "field_name",
        "target_model",
        "link",
        "is_many",
        "child_path",
        "shares_parents",
    )

    def __init__(
        self,
        field_name: str,
        target_model: Type[Model],
        link: str,
        is_many: bool,
        child_path: str,
        shares_parents: bool,
    ):
        self.field_name = field_name
        self.target_model = target_model
        self.link = link  # accessor on the child back to the parent
        self.is_many = is_many
        self.child_path = child_path
        # True only for M2M: a child can appear under several parents, so link
        # pairs need deduping. A reverse FK/1:1 child has exactly one parent.
        self.shares_parents = shares_parents

    @property
    def child_fetch_link(self) -> Optional[str]:
        return self.link

    def with_child_path(self, child_path: str) -> "ReverseAutoFetch":
        return ReverseAutoFetch(
            self.field_name,
            self.target_model,
            self.link,
            self.is_many,
            child_path,
            self.shares_parents,
        )

    def resolve(
        self,
        engine: "ValuesEngine",
        pks: Sequence[Pk],
        raw_by_pk: Dict[Pk, Row],
        method_context: Optional[MethodContext],
    ) -> ResolveResult:
        # Mirror Django's relation descriptors: a reverse OneToOne (to-one) loads
        # through the base manager, so a target hidden by its default manager
        # isn't nulled out; reverse FK / M2M (to-many) use the default manager,
        # so a filtered target model drops its hidden children.
        manager = (
            self.target_model._default_manager
            if self.is_many
            else self.target_model._base_manager
        )
        child_qs = filter_in(manager, self.link, pks)
        child_items, child_pks, link_pairs, nested_forward_refs = engine.expand_level(
            child_qs, self.child_path, method_context
        )
        buckets = defaultdict(list)
        if self.shares_parents:
            # An M2M child shared across parents has a link pair per parent; dedup
            # so a grandchild fan-out doesn't double-count under one parent. The
            # pairs no longer align with child_items, so index the items by pk.
            items_by_pk = dict(zip(child_pks, child_items))
            seen_pairs = set()
            for child_pk, parent_pk in link_pairs:
                if (child_pk, parent_pk) in seen_pairs:
                    continue
                seen_pairs.add((child_pk, parent_pk))
                buckets[pk_key(parent_pk)].append(items_by_pk[child_pk])
        else:
            # One pair per child row, built in child_items order — pair them
            # positionally rather than round-tripping through a pk-keyed dict.
            for item, (_child_pk, parent_pk) in zip(child_items, link_pairs):
                buckets[pk_key(parent_pk)].append(item)

        values = []
        for pk in pks:
            bucket = buckets.get(pk_key(pk), [])
            values.append(bucket if self.is_many else (bucket[0] if bucket else None))
        return values, nested_forward_refs, None


class ForwardAutoFetch(AutoFetch):
    """
    A forward FK / OneToOne: the parent row carries the target pk. Surfaces a
    target pk per parent so same-model targets across the tree merge into one
    query, resolved later by ``engine._resolve_deferred_forward_refs``.
    """

    __slots__ = ("field_name", "target_model", "link", "child_path")

    # resolve() reads the parent's FK column out of the raw row.
    needs_raw_by_pk = True

    def __init__(
        self,
        field_name: str,
        target_model: Type[Model],
        link: str,
        child_path: str,
    ):
        self.field_name = field_name
        self.target_model = target_model
        self.link = link  # the FK column on the parent holding the target pk
        self.child_path = child_path

    @property
    def child_fetch_link(self) -> Optional[str]:
        return None

    def with_child_path(self, child_path: str) -> "ForwardAutoFetch":
        return ForwardAutoFetch(
            self.field_name, self.target_model, self.link, child_path
        )

    def resolve(
        self,
        engine: "ValuesEngine",
        pks: Sequence[Pk],
        raw_by_pk: Dict[Pk, Row],
        method_context: Optional[MethodContext],
    ) -> ResolveResult:
        # Seed every field to None; the engine raises a need for each non-null
        # target and fills it in once the batched forward query runs. Strict:
        # _make_plan guarantees the link is fetched, so a missing key is a plan
        # bug, not a null FK.
        targets = [raw_by_pk[pk][self.link] for pk in pks]
        return [None] * len(pks), [], targets


def make_auto_fetch(
    is_forward: bool,
    field_name: str,
    target_model: Type[Model],
    link: str,
    is_many: bool,
    child_path: str,
    shares_parents: bool,
) -> AutoFetch:
    """Build the entry class matching the relation direction."""
    if is_forward:
        return ForwardAutoFetch(field_name, target_model, link, child_path)
    return ReverseAutoFetch(
        field_name, target_model, link, is_many, child_path, shares_parents
    )
