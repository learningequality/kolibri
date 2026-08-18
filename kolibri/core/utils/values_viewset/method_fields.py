"""
Method-field support for ``ValuesViewset``: the public ``ValuesMethodField``
plus the per-call runtime carriers (``MethodContext``, ``_SourcesProxy``) the
engine threads into a field's ``get_*`` method. Leaf module — no package deps.
"""

from typing import Any
from typing import Dict
from typing import List
from typing import Optional
from typing import Sequence
from typing import Tuple

from rest_framework.serializers import SerializerMethodField


class ValuesMethodField(SerializerMethodField):
    """
    ``SerializerMethodField`` for ``ValuesViewset``: declares the row columns
    the bound method reads.

    ``sources`` use DRF dot notation (``"dataset.id"``), translated to ORM
    double-underscore (``"dataset__id"``) for the ``values()`` query. The method
    receives a proxy over the declared sources; sources not also declared as
    output fields are fetched then stripped from the final row.

        status = ValuesMethodField(sources=("transfer_status", "last_synced"))

        def get_status(self, obj):
            if obj.transfer_status in IN_PROGRESS:
                return SYNCING
    """

    def __init__(
        self,
        *,
        sources: Sequence[str] = (),
        method_name: Optional[str] = None,
        **kwargs: Any,
    ):
        super().__init__(method_name=method_name, **kwargs)
        self.sources = tuple(sources)


class MethodContext:
    """
    Context carrier passed as ``self`` to ``ValuesMethodField`` ``get_*()``
    methods. Created per ``serialize()``, never stored on the shared engine, so
    concurrent requests don't share context.
    """

    __slots__ = ("context",)

    def __init__(self, context: Optional[Dict[str, Any]]):
        self.context = context


class _SourceSpec:
    """
    Compiled attribute lookup for one level of a ``ValuesMethodField``'s
    ``sources``: leaf attributes to their row column, and nested attributes to
    the spec one level down. Built once per field, so a proxy attribute access
    is a dict lookup rather than a path rebuild and scan.

    ``paths`` pairs each source's remaining segments with the column it ends at,
    so a level reads its own names off the head and hands the tail down.
    """

    __slots__ = ("columns", "nested", "declared")

    def __init__(self, paths: Sequence[Tuple[List[str], str]], declared: List[str]):
        # The whole field's sources, threaded down so the AttributeError names
        # them all whatever depth it is raised at.
        self.declared = declared
        self.columns: Dict[str, str] = {}
        branches: Dict[str, List[Tuple[List[str], str]]] = {}
        for segments, column in paths:
            head = segments[0]
            if len(segments) == 1:
                self.columns[head] = column
            else:
                branches.setdefault(head, []).append((segments[1:], column))
        self.nested: Dict[str, "_SourceSpec"] = {
            # Sources naming both a column and a path through it ("publisher",
            # "publisher__name") resolve to the column: the raw FK value cannot
            # also carry the traversal.
            head: _SourceSpec(branch, declared)
            for head, branch in branches.items()
            if head not in self.columns
        }


def compile_sources(sources: Sequence[str]) -> _SourceSpec:
    return _SourceSpec(
        [(source.split("__"), source) for source in sources if source],
        sorted(source.replace("__", ".") for source in sources if source),
    )


class _SourcesProxy:
    """
    Attribute proxy over a raw ``values()`` row, scoped to a
    ``ValuesMethodField``'s declared ``sources``.

    Dotted traversal matches declared paths: for ``sources=("publisher.name",)``,
    ``obj.publisher.name`` returns ``raw["publisher__name"]``. Access outside the
    declared set raises ``AttributeError`` naming the requested attr and the
    declared sources.
    """

    __slots__ = ("_raw", "_spec")

    def __init__(self, raw: Dict[str, Any], spec: _SourceSpec):
        self._raw = raw
        self._spec = spec

    def __getattr__(self, name: str) -> Any:
        # repr/copy/pickle etc. must see a plain AttributeError for `_`-names,
        # not the framed message below.
        if name.startswith("_"):
            raise AttributeError(name)
        spec = self._spec
        column = spec.columns.get(name)
        if column is not None:
            return self._raw[column]
        child = spec.nested.get(name)
        if child is not None:
            return _SourcesProxy(self._raw, child)
        raise AttributeError(
            "{!r} not declared — ValuesMethodField exposes sources only: "
            "{}. Add to sources=, or inline the logic.".format(name, spec.declared)
        )
