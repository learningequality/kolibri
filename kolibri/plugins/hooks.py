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

Registered hooks
    Are concrete hooks that inherit from abstract hooks, thus embodying the
    definitions of the abstract hook into a specific case.

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
    in other words: Never put registered hooks in ``<myapp>/hooks.py``. The
    non-abstract hooks should not be loaded unintentionally in case your
    application is not loaded but only used to import an abstract definition
    by an external component!


In which order are hooks used/applied?
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is entirely up to the registering class. By default, hooks are applied in
the same order that the registered hook gets registered! This most likely means
the order in which ``kolibri_plugin`` is loaded ``=>`` the order in which the
app is listed in ``INSTALLED_APPS``


An example of a plugin using a hook
-----------------------------------

.. note::

    The example shows a NavigationHook which is simplified for the sake of
    readability. The actual implementation in Kolibri will defer.


Example implementation
----------------------

Here is an example of how to use a hook in ``myplugin.kolibri_plugin.py``:


.. code-block:: python

    from django.db.models

    # This is where the actual abstract hook is defined
    from kolibri.core.hooks import NavigationHook

    # By inheriting NavigationHook, we tell that we are going to want our
    # plugin to be part of the hook's activities with the specified attributes.
    # We only define one navigation item, but defining another one is as simple
    # as adding another class definition.
    class MyPluginNavigationItem(NavigationHook):

        label = _("My Plugin")
        url = reverse_lazy("kolibri:my_plugin:index")


And here is the definition of that hook in kolibri.core.hooks:

.. code-block:: python

    from kolibri.plugins.hooks import KolibriHook


    class NavigationHook(KolibriHook):
        \"\"\"
        Extend this hook to define a new navigation item
        \"\"\"

        #: A string label for the menu item
        label = "Untitled"

        #: A string or lazy proxy for the url
        url = "/"

        @classmethod
        def get_menu(cls):
            menu = {}
            for hook in self.registered_hooks:
                menu[hook.label] = url
            return menu

        class Meta:

            abstract = True


Usage of the hook
-----------------

Inside our templates, we load a template tag from navigation_tags, and this
template tag definition looks like this:

.. code-block:: python

    from kolibri.core.hooks import NavigationHook

    @register.assignment_tag()
    def kolibri_main_navigation():

        for item in NavigationHook().get_menu():
            yield item


.. code-block:: html

    {% load kolibri_tags %}

    <ul>
    {% for menu_item in kolibri_main_navigation %}
        <li><a href="{{ menu_item.url }}">{{ menu_item.label }}</a></li>
    {% endfor %}
    </ul>


.. warning::

    Do not load registered hook classes outside of a plugin's
    ``kolibri_plugin``. Either define them there directly or import the modules
    that define them. Hook classes should all be seen at load time, and
    placing that logic in ``kolibri_plugin`` guarantees that things are
    registered correctly.


"""
from __future__ import absolute_import, print_function, unicode_literals

import functools
import logging

import six

logger = logging.getLogger(__name__)


# : Inspired by how Django's Model Meta option settings work, we define a simple
# : list of valid options for Meta classes.
DEFAULT_NAMES = ('abstract', 'replace_parent')


def abstract_method(func):
    @functools.wraps(func)
    def inner(instance, *args, **kwargs):
        assert \
            instance._meta.abstract, \
            "Method call only valid for an abstract hook"
        return func(instance, *args, **kwargs)

    return inner


def registered_method(func):
    @functools.wraps(func)
    def inner(instance, *args, **kwargs):
        assert \
            not instance._meta.abstract, \
            "Method call only valid for a registered, non-abstract hook"
        return func(instance, *args, **kwargs)

    return inner


class Options(object):
    """
    Stores instance of options for Hook.Meta classes
    """

    def __init__(self, meta):
        self.abstract = False
        self.replace_parent = False
        self.meta = meta
        self.registered_hooks = set()
        if meta:
            # Deep copy because options may be immutable, and so we shouldn't
            # have one object manipulate an instance of an option and that
            # propagates to other objects.
            meta_attrs = self.meta.__dict__.copy()
            for attr_name in DEFAULT_NAMES:
                if attr_name in meta_attrs:
                    setattr(self, attr_name, meta_attrs.pop(attr_name))

        assert not (self.abstract and self.replace_parent), "Cannot replace abstract hooks"


class KolibriHookMeta(type):
    """
    This is the base meta class of all hooks in Kolibri. A lot of the code is
    lifted from django.db.models.ModelBase.

    We didn't end up like this because of bad luck, rather it fitted perfectly
    to how we want plugin functionality to be /plugged into/ in an explicit
    manner:

        Metaclasses are deeper magic than 99% of users should ever worry about.
        If you wonder whether you need them, you don't (the people who actually
        need them know with certainty that they need them, and don't need an
        explanation about why).

        - Tim Peters

    """

    def __new__(cls, name, bases, attrs):
        """
        Inspired by Django's ModelBase, we create a dynamic type for each hook
        definition type class and add it to the global registry of hooks.
        """

        super_new = super(KolibriHookMeta, cls).__new__

        # Parent classes of cls up until and including KolibriHookMeta
        parents = [b for b in bases if isinstance(b, KolibriHookMeta)]

        # If there isn't any parents, it's the main class of everything
        # ...and we just set some empty options
        if not parents:
            base_class = super_new(cls, name, bases, attrs)
            base_class.add_to_class('_meta', Options(None))
            base_class.add_to_class('_parents', [])
            return base_class

        # Create the class.
        module = attrs.pop('__module__')
        new_class = super_new(cls, name, bases, {'__module__': module})

        attr_meta = attrs.pop('Meta', None)
        abstract = getattr(attr_meta, 'abstract', False)
        # Commented out because it sets the meta properties of the parent
        # if not attr_meta:
        #     meta = getattr(new_class, 'Meta', None)
        # else:
        #     meta = attr_meta
        meta = attr_meta

        # Meta of the base object can be retrieved by looking at the currently
        # set _meta object... but we don't use it...
        # base_meta = getattr(new_class, '_meta', None)

        # Add all attributes to the class.
        for obj_name, obj in attrs.items():
            new_class.add_to_class(obj_name, obj)

        new_class.add_to_class('_meta', Options(meta))
        new_class.add_to_class('_parents', parents)

        if not abstract:
            logger.debug("Registered hook class {}".format(new_class))
            for parent in new_class._parents:
                parent.register_hook(new_class)

            if new_class._meta.replace_parent:
                immediate_parent = parents[-1]
                for parent in parents:
                    parent.unregister_hook(immediate_parent)

        return new_class

    def add_to_class(cls, name, value):
        setattr(cls, name, value)

    def unregister_hook(cls, child_hook):
        if child_hook in cls._meta.registered_hooks:
            cls._meta.registered_hooks.remove(child_hook)
        for parent in cls._parents:
            parent.unregister_hook(child_hook)

    def register_hook(cls, child_hook):
        cls._meta.registered_hooks.add(child_hook)
        for parent in cls._parents:
            parent.register_hook(child_hook)


class KolibriHook(six.with_metaclass(KolibriHookMeta)):
    """
    WIP!!!

    To use it, extend it. All hooks in kolibri extends from this.
    Example is in the main description of ``kolibri.plugins.hooks``.
    """

    def __init__(self):
        # We have been initialized. A noop. But inheriting hooks might want to
        # pay attention when they are initialized, since it's an event in itself
        # signaling that whatever that hook was intended for is now being
        # yielded or rendered.
        pass

    @property
    def registered_hooks(self):
        """
        Always go through this method. This should guarantee that every time a
        hook is accessed, it's also instantiated, giving it a chance to re-do
        things that it wants done on every event.
        """
        for HookClass in self._meta.registered_hooks:
            yield HookClass()

    class Meta:
        abstract = True
