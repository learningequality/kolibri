"""
Method-field support for ``ValuesViewset``: the public ``ValuesMethodField``
plus the per-call runtime carriers (``MethodContext``, ``_SourcesProxy``) the
engine threads into a field's ``get_*`` method. Leaf module — no package deps.
"""

from typing import Any
from typing import Dict
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


class _SourcesProxy:
    """
    Attribute proxy over a raw ``values()`` row, scoped to a
    ``ValuesMethodField``'s declared ``sources``.

    Dotted traversal matches declared paths: for ``sources=("publisher.name",)``,
    ``obj.publisher.name`` returns ``raw["publisher__name"]``. Access outside the
    declared set raises ``AttributeError`` naming the requested attr and the
    declared sources.
    """

    __slots__ = ("_raw", "_sources", "_prefix")

    def __init__(
        self,
        raw: Dict[str, Any],
        sources: Tuple[str, ...],
        prefix: str = "",
    ):
        self._raw = raw
        self._sources = sources
        self._prefix = prefix

    def __getattr__(self, name: str) -> Any:
        # repr/copy/pickle etc. must see a plain AttributeError for `_`-names,
        # not the framed message below.
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
