Front-end code conventions
==========================


Vue.js Components
-----------------

Note that the top-level tags of `Vue.js components <https://vuejs.org/guide/components.html>`_ are ``<template>``, ``<script>``, and ``<style>``.

- Whitespace

  - an indent is 2 spaces
  - two blank lines between top-level tags
  - one blank line of padding within a top-level tag
  - one level of indent for the contents of all top-level tags

- Keep most child-components stateless. In practice, this means using ``props`` but not ``data``.

- Avoid using Vue.js' camelCase-to-kebab-case mapping. Instead, use square brackets and strings to reference names.

- Use ``scoped`` styles where ever possible

- Name custom tags using kebab-case

- Components are placed in the *vue* directory. The root component file is called *vue/index.vue*, and is mounted on a tag called ``<rootvue>``.

- Components are defined either as a file with a ``.vue`` extension (*my-component.vue*) or as a directory with an *index.vue* file (*my-component/index.vue*). Both forms can be used with ``require('my-component')``.

- Put child components inside the directory of a parent component if they are *only* used by the parent. Otherwise, put shared child components in the *vue* director.

- Any user visisble interface text should be rendered translatable, see :doc:`i18n` for details.


Stylus and CSS
--------------

- clear out unused styles
- avoid using classes as JS identifiers, and prefix with ``js-`` if necessary


HTML
----

*attribute lists, semantic structure, accessibility...*
