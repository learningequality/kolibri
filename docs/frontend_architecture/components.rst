Vue components
==============

We leverage `Vue.js components <https://v2.vuejs.org/v2/guide/components>`__ as the primary building blocks for our UI. For general UI development work, this is the most common tool a developer will use. It would be prudent to read through the `Vue.js guide <https://v2.vuejs.org/v2/guide/>`__ thoroughly.

Each component contains HTML with dynamic Vue.js directives, styling which is scoped to that component (written using `SCSS <https://sass-lang.com/>`__), and logic which is also scoped to that component (all code, including that in Vue components should be written using `Bublé compatible ES2015 JavaScript <https://buble.surge.sh/guide/#supported-features>`__).

Components allow us to define new custom tags that encapsulate a piece of self-contained, re-usable UI functionality. When composed together, they form a tree structure of parents and children. Each component has a well-defined interface used by its parent component, made up of `input properties <https://v2.vuejs.org/v2/guide/components#Passing-Data-to-Child-Components-with-Props>`__, `events <https://v2.vuejs.org/v2/guide/components#Listening-to-Child-Components-Events>`__ and `content slots <https://v2.vuejs.org/v2/guide/components#Content-Distribution-with-Slots>`__. Components should never reference their parent.

Read through the :doc:`./conventions` for further guidelines on writing components.


Component Reuse Hierarchy
--------------------------

Before creating new components, check for existing ones in this order:

1. **Kolibri Design System** (``kolibri-design-system``) — Always prefer KDS components first. Browse the catalog at https://design-system.learningequality.org/
2. **Kolibri package** (``packages/kolibri/components/``) — Core application components such as ``AuthMessage``, ``CoreTable``, ``BottomAppBar``, and ``DownloadButton``
3. **Kolibri-Common package** (``packages/kolibri-common/components/``) — Shared components used across plugins, such as ``AccordionContainer``, ``BaseToolbar``, and ``MetadataChips``

Only create a new component if none of the above provide what you need.


SVG Icons
---------

Icons in Kolibri should be accessed through the ``<KIcon>`` component. The icons available can be found and searched at `Kolibri Design System <https://kolibri-design-system.netlify.app/icons/>`__.

Each icon is associated with a token, which is passed to ``<KIcon>`` and other Kolibri Design System components which accept an ``icon`` or ``iconAfter`` prop such as ``KIconButton``.

.. code-block:: html

  <!--
    embed https://material.io/resources/icons/?search=add_circl&icon=add_circle_outline&style=baseline
  -->
  <KIcon :icon="add" />
