Vue components
==============

We leverage `Vue.js components <https://vuejs.org/guide/components.html>`__ as the primary building blocks for our UI. For general UI development work, this is the most common tool a developer will use. It would be prudent to read through the `Vue.js guide <https://vuejs.org/guide/>`__ thoroughly.

Each component contains HTML with dynamic Vue.js directives, styling which is scoped to that component (written using `SCSS <https://sass-lang.com/>`__), and logic which is also scoped to that component (all code, including that in Vue components should be written using `Bublé compatible ES2015 JavaScript <https://buble.surge.sh/guide/#supported-features>`__).

Components allow us to define new custom tags that encapsulate a piece of self-contained, re-usable UI functionality. When composed together, they form a tree structure of parents and children. Each component has a well-defined interface used by its parent component, made up of `input properties <https://vuejs.org/guide/components.html#Props>`__, `events <https://vuejs.org/guide/components.html#Custom-Events>`__ and `content slots <https://vuejs.org/guide/components.html#Content-Distribution-with-Slots>`__. Components should never reference their parent.

Read through the :doc:`./conventions` for further guidelines on writing components.


Design system
-------------

Our `design system <http://kolibribeta.learningequality.org/design>`__ contains reusable patterns and components that should be used whenever possible to maintain UI consistency and avoid duplication of effort.


SVG Icons
---------

Most icons in Kolibri should be accessed through the ``<KIcon>`` component.

However if the desired icon is not available, we provide a mechanism to embed SVGs in components. Specifically, `Material Design Icon <https://material.io/tools/icons/>`__ SVGs or local SVGs can be inlined using the `svg-icon-inline-loader <https://github.com/learningequality/svg-icon-inline-loader>`__

.. code-block:: html

  <!--
    embed https://material.io/tools/icons/?search=fullscreen&icon=fullscreen&style=baseline
  -->
  <mat-svg category="navigation" name="fullscreen_exit"/>

  <!-- embed a file in the same folder as the vue component -->
  <file-svg src="./icon.svg"/>

Inlining an SVG allows it to be inserted directly into the outputted HTML. This allows aspects of the icon (e.g. fill) to be styled using CSS.

Attributes (such as vue directives like ``v-if`` and SVG attributes like ``viewbox``) can also be added to the svg tag.
