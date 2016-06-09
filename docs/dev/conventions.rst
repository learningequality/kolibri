Project Conventions
===================

*TODO*


Documentation
-------------

*reStructuredText, docstrings, requirements for PRs to master...*


Git Workflow
------------

*stable master, develop, feature branches, tags, releases, hot fixes, internal vs external repos...*


Python Code
-----------

*PEP8, additional conventions and best practices...*


Vue.js Components
-----------------

Note that the top-level tags of `Vue.js components <https://vuejs.org/guide/components.html>`_ are ``<template>``, ``<script>``, and ``<style>``.

- Whitespace

  - an indent is 2 spaces
  - two blank lines between top-level tags
  - one blank line of padding within a top-level tag
  - one level of indent for the contents of all top-level tags

- As much as possible, keep components stateless. In practice, this means using ``props`` but not ``data``.

- Avoid using Vue.js' camelCase-to-kebab-case mapping. Instead, use square brackets and strings to reference names.

- Use ``scoped`` styles

- name custom tags using kebab-case

- The root component file is called *app-root.vue*, and is mounted on a tag called ``<app-root>``.


JavaScript Code
---------------

- We use the `AirBnB Javascript Style guide <https://github.com/airbnb/javascript>`_ for client-side ES6 code in Vue components.
- ``use strict`` is automatically inserted.
- Use CommonJS-style ``require`` and ``module.exports`` statements, not ES6 ``import``/``export`` statements.


Stylus and CSS
--------------

- clear out unused styles
- avoid using classes as JS identifiers, and prefix with ``js-`` if necessary


HTML
----

*attribute lists, semantic structure, accessibility...*
