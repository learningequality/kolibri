"""
Kolibri Hooks API
-----------------

What are hooks
~~~~~~~~~~~~~~

Hooks are classes that define *something* that happens at one or more places
where the hook is looked for and applied. It means that you can
"hook into a component" in Kolibri and have it do a predefined and
parameterized *thing*. For instance, Kolibri could ask all its plugins who
wants to add something to the user settings panel, and its then up to the
plugins to inherit from that specific hook and feed back the parameters that
the hook definition expects.

The consequences of a hook being applied can happen anywhere in Kolibri. Each
hook is defined through a class inheriting from ``KolibriHook``. But how the
inheritor of that class deals with plugins using it, is entirely up to each
specific implementation and can be applied in templates, views, middleware -
basically everywhere!

That's why you should consult the class definition and documentation of the
hook you are adding plugin functionality with.

We have two different types of hooks:

Abstract hooks
    Are definitions of hooks that are implemented by *implementing hooks*.
    These hooks are Python abstract base classes, and can use the @abstractproperty
    and @abstractmethod decorators from the abc module in order to define which
    properties and methods their descendant registered hooks should implement.

Registered hooks
    Are concrete hooks that inherit from abstract hooks, thus embodying the
    definitions of the abstract hook into a specific case. If the abstract parent hook
    has any abstract properties or methods, the hook being registered as a descendant
    must implement those properties and methods, or an error will occur.

So what's "a hook"?
    Simply referring to "a hook" is okay, it can be ambiguous on purpose. For
    instance, in the example, we talk about "a navigation hook". So we both
    mean the abstract definition of the navigation hook and everything that
    is registered for the navigation.


Where can I find hooks?
~~~~~~~~~~~~~~~~~~~~~~~

All Kolibri core applications and plugins alike should *by convention* define
their abstract hooks inside ``<myapp>/hooks.py``. Thus, to see which hooks
a Kolibri component exposes, you can refer to its ``hooks`` module.

.. note::
    Defining abstract hooks in ``<myapp>/hooks.py`` isn't mandatory, but
    *loading* a concrete hook in ``<myapp>/kolibri_plugin.py`` is.

.. warning::
    Do not define abstract and registered hooks in the same module. Or to put it
    in other words: Always put registered hooks in ``<myapp>/kolibri_plugin.py``. The
    registered hooks will only be initialized for use by the Kolibri plugin registry
    if they are registered inside the kolibri_plugin.py module for the plugin.


In which order are hooks used/applied?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is entirely up to the registering class. By default, hooks are applied in
the same order that the registered hook gets registered! While it could be the
case that plugins could be enabled in a certain order to get a specific ordering
of hooks - it is best not to depend on this behaviour as it could result in brittleness.


An example of a plugin using a hook
-----------------------------------

.. note::

    The example shows a NavigationHook which is simplified for the sake of
    readability. The actual implementation in Kolibri will differ.


Example implementation
----------------------

Here is an example of how to use a hook in ``myplugin.kolibri_plugin.py``:


.. code-block:: python

    from kolibri.core.hooks import NavigationHook
    from kolibri.plugins.hooks import register_hook

    @register_hook
    class MyPluginNavItem(NavigationHook):
        bundle_id = "side_nav"


The decorator ``@register_hook`` signals that the wrapped class is intended to be registered
against any abstract KolibriHook descendants that it inherits from. In this case, the hook
being registered inherits from NavigationHook, so any hook registered will be available on
the ``NavigationHook.registered_hooks`` property.

Here is the definition of the abstract NavigatonHook in kolibri.core.hooks:

.. code-block:: python

    from kolibri.core.webpack.hooks import WebpackBundleHook
    from kolibri.plugins.hooks import define_hook


    @define_hook
    class NavigationHook(WebpackBundleHook):

        # Set this to True so that the resulting frontend code will be rendered inline.
        inline = True

As can be seen from above, to define an abstract hook, instead of using the ``@register_hook``
decorator, the ``@define_hook`` decorator is used instead, to signal that this instance of
inheritance is not intended to register anything against the parent ``WebpackBundleHook``.
However, because of the inheritance relationship, any hook registered against ``NavigationHook``
(like our example registered hook above), will also be registered against the ``WebpackBundleHook``,
so we should expect to see our plugin's nav item listed in the ``WebpackBundleHook.registered_hooks``
property as well as in the ``NavigationHook.registered_hooks`` property.


Usage of the hook
-----------------

The hook can then be used to collect all the information from the hooks, as per this usage
of the ``NavigationHook`` in ``kolibri/core/kolibri_plugin.py``:

.. code-block:: python

    from kolibri.core.hooks import NavigationHook

    ...
        def navigation_tags(self):
            return [
                hook.render_to_page_load_sync_html()
                for hook in NavigationHook.registered_hooks
            ]

Each registered hook is iterated over and its appropriate HTML for rendering into
the frontend are returned. When iterating over ``registered_hooks`` the returned
objects are each instances of the hook classes that were registered.


.. warning::

    Do not load registered hook classes outside of a plugin's
    ``kolibri_plugin``. Either define them there directly or import the modules
    that define them. Hook classes should all be seen at load time, and
    placing that logic in ``kolibri_plugin`` guarantees that things are
    registered correctly.


"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
from abc import abstractproperty
from functools import partial
from inspect import isabstract

import six

from kolibri.plugins import SingletonMeta

logger = logging.getLogger(__name__)


def _make_singleton(subclass):
    original_new = subclass.__new__

    def new(cls, *args, **kwds):
        if cls._instance is None:
            cls._instance = original_new(cls, *args, **kwds)
        return cls._instance

    subclass._instance = None
    subclass.__new__ = new


def define_hook(subclass=None, only_one_registered=False):
    """
    This method must be used as a decorator to define a new hook inheriting from
    the hook class that this is called from, this will return an abstract base
    class, which distinguishes is from the classes returned by register_hook
    which can be instantiated. Only abstract base classes track registered hooks.
    """

    # Allow optional arguments to be passed to define_hook when used as a decorator
    if subclass is None:
        return partial(define_hook, only_one_registered=only_one_registered)

    subclass = six.add_metaclass(KolibriHookMeta)(subclass)

    subclass._setup_base_class(only_one_registered=only_one_registered)

    return subclass


def register_hook(subclass):
    """
    This method must be used as a decorator to register a hook against this hook
    class and all parent abstract classes - can only be called on an abstract
    base class.
    """
    if not any(
        hasattr(base, "_registered_hooks")
        and base.abstract
        and issubclass(base, KolibriHook)
        for base in subclass.__bases__
    ):
        raise TypeError(
            "register_hook decorator used on a class that does not inherit from any abstract KolibriHook subclasses"
        )
    if not subclass.__module__.endswith("kolibri_plugin"):
        raise RuntimeError(
            "register_hook decorator invoked outside of a kolibri_plugin.py module - this hook will not be initialized"
        )
    attrs = dict(subclass.__dict__)
    attrs.update({"_not_abstract": True})
    subclass = type(subclass.__name__, subclass.__bases__, attrs)
    subclass._registered = True

    return subclass


class KolibriHookMeta(SingletonMeta):
    """
    We use a metaclass to define class level properties and methods in a simple way.
    We could define the classmethods on the KolibriHook object below, but this keeps
    the logic contained into one definition.
    """

    # : Sets a flag so that we can check that the hook class has properly gone through
    # : the register_hook function above.
    _registered = False

    @property
    def abstract(cls):
        """
        Check if the class object is an abstract base class or not.
        """
        return isabstract(cls)

    @property
    def registered_hooks(cls):
        """
        A generator of all registered hooks.
        """
        if not cls.abstract:
            raise TypeError("registered_hooks property accessed on a non-abstract hook")
        for hook in cls._registered_hooks.values():
            yield hook

    def _setup_base_class(cls, only_one_registered=False):
        """
        Do any setup required specifically if this class is being setup as a hook definition
        abstract base class.
        """
        cls._registered_hooks = {}
        cls._only_one_registered = only_one_registered

    def add_hook_to_registries(cls):
        """
        Add a concrete hook class to all relevant abstract hook registries.
        """
        if not cls.abstract and cls._registered:
            hook = cls()
            for parent in cls.__mro__:
                if (
                    isabstract(parent)
                    and issubclass(parent, KolibriHook)
                    and parent is not KolibriHook
                    and hasattr(parent, "_registered_hooks")
                ):
                    parent.add_hook_to_class_registry(hook)

    def add_hook_to_class_registry(cls, hook):
        """
        Add a concrete hook instance to the hook registry on this abstract hook
        """
        if not cls.abstract:
            raise TypeError("add_hook_to_registry method used on a non-abstract hook")
        if (
            cls._only_one_registered
            and cls._registered_hooks
            and hook not in cls.registered_hooks
        ):
            raise RuntimeError(
                "Attempted to register more than one instance of {}".format(
                    hook.__class__
                )
            )
        cls._registered_hooks[hook.unique_id] = hook

    def get_hook(cls, unique_id):
        """
        Fetch a registered hook instance by its unique_id
        """
        if not cls.abstract:
            raise TypeError("get_hook method used on a non-abstract hook")
        return cls._registered_hooks.get(unique_id, None)


class KolibriHook(six.with_metaclass(KolibriHookMeta)):
    @abstractproperty
    def _not_abstract(self):
        """
        A dummy property that we set on classes that are not intended to be abstract in the register_hook function above.
        """
        pass

    @property
    def unique_id(self):
        """
        Returns a globally unique id for the frontend module bundle.
        This is created by appending the locally unique bundle_id to the
        Python module path. This should give a globally unique id for the module
        and prevent accidental or malicious collisions.
        """
        return "{}.{}".format(self._module_path, self.__class__.__name__)

    @property
    def _module_path(self):
        return ".".join(self.__module__.split(".")[:-1])
