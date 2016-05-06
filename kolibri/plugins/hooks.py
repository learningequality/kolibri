from __future__ import absolute_import, print_function, unicode_literals

__hook_index = -1


def __enumerate_hook():
    global __hook_index
    __hook_index += 1
    return __hook_index

# : Assign to a callable ``my_func(navigation)``.
NAVIGATION_POPULATE = __enumerate_hook()
USER_NAVIGATION_POPULATE = __enumerate_hook()
FRONTEND_PLUGINS = __enumerate_hook()
BASE_FRONTEND_SYNC = __enumerate_hook()
BASE_FRONTEND_ASYNC = __enumerate_hook()
URLCONF_POPULATE = __enumerate_hook()
# Add a hook for content renderer plugins to register themselves against.
CONTENT_RENDERER_ASYNC = __enumerate_hook()

REGISTERED_HOOKS = {
    x: [] for x in range(__hook_index + 1)
}


def register_hook(hook, getter_func):
    """
    Takes a hook identifier and adds it to the registry
    """
    if getter_func not in REGISTERED_HOOKS[hook]:
        REGISTERED_HOOKS[hook].append(getter_func)
    else:
        raise RuntimeError("function already registered")


def get_callables(hook):
    """
    :param hook: The hook identifier, either a constant from this module or an arbitrary string.
    :return: An iterable of getter functions.
    """
    return REGISTERED_HOOKS[hook]
