"""
Kolibri Hooks API
-----------------

What are hooks
~~~~~~~~~~~~~~

Hooks are classes that define *something* that happens. It means that you can
"hook into a component" in Kolibri and have it do a predefined and
parameterized *thing*. For instance, Kolibri could ask all its plugins who
wants to add something to the user settings panel, and its then up to the
plugins to inherit from that specific hook and feed back the parameters that
the hook definition expects.

The consequences of a hook callback are located anywhere in Kolibri. Each hook
is defined through a class inheriting from ``KolibriHook``. But how the
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
            for inheritor in cls.inheritors:
                menu[inheritor.label] = url
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

        for label, url in NavigationHook.get_menu().items():
            yield label, url


.. code-block:: html

    {% load kolibri_tags %}

    <ul>
    {% for navigation in kolibri_main_navigation %}
        <li><a href="{{ navigation.menu_url }}">{{ navigation.menu_name }}</a></li>
    {% endfor %}
    </ul>


.. warning::

    Do not register callbacks for hooks outside of a plugin's
    ``kolibri_plugin``. Callbacks should all be registered at load time, and
    placing that logic in ``kolibri_plugin`` guarantees that things are
    registered correctly.


"""
from __future__ import absolute_import, print_function, unicode_literals

import six


class KolibriHookMeta(type):
    """
    WIP!!!

    This is the base meta class of all hooks in Kolibri.

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

        # Also ensure initialization is only performed for subclasses of Model
        # (excluding Model class itself).
        parents = [b for b in bases if isinstance(b, KolibriHookMeta)]
        if not parents:
            return super_new(cls, name, bases, attrs)

        # Create the class.
        module = attrs.pop('__module__')
        new_class = super_new(cls, name, bases, {'__module__': module})

        HOOKS_REGISTRY.add(new_class)

        return new_class


class KolibriHook(six.with_metaclass(KolibriHookMeta)):
    """
    WIP!!!

    To use it, extend it. All hooks in kolibri extends from this.
    Example is in the main description of ``kolibri.plugins.hooks``.
    """

    def __init__(self):
        self.callbacks = []

    def register_callback(self, cb):
        if cb not in self.callbacks:
            self.callbacks.append(cb)
        else:
            raise RuntimeError("Callback already registered")


# Keeps track of all the hooks discovered (hopefully at load time!)
HOOKS_REGISTRY = set()
