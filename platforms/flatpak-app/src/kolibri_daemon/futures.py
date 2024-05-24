from __future__ import annotations

import typing
from concurrent.futures import Future
from functools import partial


def future_chain(
    from_future: typing.Any,
    to_future: typing.Optional[Future] = None,
    map_fn: typing.Optional[typing.Callable] = None,
) -> Future:
    """
    This is an attempt to build a simple way of chaining together Future
    objects, with an optional mapping function, to make it easier to deal with
    deeply nested async functions. It would be better to use asyncio properly,
    but at the moment that is problematic with pygobject and GLib.
    """

    if not isinstance(from_future, Future):
        _from_future_value = from_future
        from_future = Future()
        from_future.set_result(_from_future_value)

    if to_future is None:
        to_future = Future()

    from_future.add_done_callback(
        partial(_future_chain_from_future_done_cb, to_future=to_future, map_fn=map_fn)
    )

    return to_future


def _future_chain_from_future_done_cb(
    from_future: Future,
    to_future: Future,
    map_fn: typing.Optional[typing.Callable] = None,
):
    try:
        result = from_future.result()
    except Exception as error:
        to_future.set_exception(error)
    else:
        if callable(map_fn):
            result = map_fn(result)

        if isinstance(result, Future):
            future_chain(result, to_future)
        else:
            to_future.set_result(result)
