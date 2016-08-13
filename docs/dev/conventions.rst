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

- Keep most child-components stateless. In practice, this means using ``props`` but not ``data``.

- Avoid using Vue.js' camelCase-to-kebab-case mapping. Instead, use square brackets and strings to reference names.

- Use ``scoped`` styles where ever possible

- Name custom tags using kebab-case

- Components are placed in the *vue* directory. The root component file is called *vue/index.vue*, and is mounted on a tag called ``<rootvue>``.

- Components are defined either as a file with a ``.vue`` extension (*my-component.vue*) or as a directory with an *index.vue* file (*my-component/index.vue*). Both forms can be used with ``require('my-component')``.

- Put child components inside the directory of a parent component if they are *only* used by the parent. Otherwise, put shared child components in the *vue* director.

- Any user visisble interface text should be rendered translatable, this can be done by supplementing the Vue.js component definition with the following properties:
  - ``$trs``, an object of the form::

    {
      msgId: 'Message text',
    }

  - ``$trNameSpace``, a string that namespaces the messages.

- User visible strings should then either be rendered directly in the template with ``{{ $tr('msgId') }}`` or can be made available through computed properties (note, if you want to pass rendered strings into tag/component properties, this will be necessary as Vue.js does not evaluate Javascript expressions in these cases).

JavaScript Code
---------------

- We use the `AirBnB Javascript Style guide <https://github.com/airbnb/javascript>`_ for client-side ES6 code in Vue components.
- ``use strict`` is automatically inserted.
- Use CommonJS-style ``require`` and ``module.exports`` statements, not ES6 ``import``/``export`` statements.
- For logging statements we use a thin wrapper around the ``log-level`` JS library, that prefixes the log statements with information about the logging level and current file. To access the logger, simply include the following code snippet:

.. code-block:: javascript

  const logging = require('logging').getLogger(__filename);


Stylus and CSS
--------------

- clear out unused styles
- avoid using classes as JS identifiers, and prefix with ``js-`` if necessary


HTML
----

*attribute lists, semantic structure, accessibility...*
