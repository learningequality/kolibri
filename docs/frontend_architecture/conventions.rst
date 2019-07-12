Frontend code conventions
=========================

Establishing code conventions is important in order to keep a more consistent codebase. Therefore the goal for the tools and principles below is to help ensure any committed code is properly aligned with the conventions.

For design conventions, see the `Kolibri Design System <http://kolibribeta.learningequality.org/design>`__.

Linting and auto formatting
---------------------------

Many of our conventions are enforced through various linters including `ESLint <https://eslint.org/>`__, `ESLint Vue plugin <https://github.com/vuejs/eslint-plugin-vue>`__, `stylelint <https://stylelint.io/>`__, and `HTMLHint <https://htmlhint.io/>`__. The enforced rules are located in the ``.eslintrc.js``, ``.stylelintrc.js``, and ``.htmlhintrc`` files located at the root of the project.

Also available are options and tools that enable auto-formatting of ``.vue``, ``.js``, ``.scss``, and ``.py`` files to conform to code conventions. To facilitate this, we use `Black <https://github.com/ambv/black>`__ to auto-format ``.py`` files, and  `Prettier <https://prettier.io/>`__ to auto-format the others. Auto-formatting runs by default while running the dev server, otherwise be sure to run the dev server with ``-warn`` as described in :doc:`/getting_started` to prevent it from auto-formatting.

In addition, ``pre-commit`` hooks can be installed to perform linting and auto-formatting. To enable the hooks, be sure to follow the directions described in :doc:`/getting_started`.

You can also install the appropriate editor plugins for the various linters to see linting warnings/errors inline.


Vue.js components
-----------------

- Make sure to follow the official `Vue.js style guide <https://vuejs.org/v2/style-guide/>`__ when creating Vue components.
- Keep components stateless and declarative as much as possible
- For simple components, make *SomeComonent.vue*. For more complex components, make *SomeComponent/index.vue* and add private sub-components
- All user-visible app text should be internationalized. See :doc:`/i18n` for details
- Avoid direct DOM references and Vue component "lifecycle events" except in special cases
- Props, slots, and Vuex state/getters for communicating down the view hierarchy
- Events and Vuex actions for communicating up the view hierarchy
- If possible, use `<template/>` for conditionals to avoid extra unnecessary nested elements.


Styling anti-patterns
---------------------

- **Adding unnecessary new rules** - whenever possible, delete code to fix issues
- **Unscoped styles** - if absolutely necessary, use `deep selectors <https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors>`__ to style component children. SCSS supports ``/deep/``
- **Classes referenced in javascript** - if absolutely necessary, use `ref <https://vuejs.org/v2/api/#ref>`__ instead (also an anti-pattern)
- **References by ID** - use a ``class`` instead
- **HTML tag selectors** - define a ``class`` instead
- **Floats or flexbox for layout** - use ``KGrid`` instead
- **Media queries** - use ``responsive-window`` or ``responsive-element``
- **Nested selectors** - make a sub-component instead (more reading `here <https://csswizardry.com/2012/05/keep-your-css-selectors-short/>`__ and `here <http://thesassway.com/beginner/the-inception-rule>`__)
- **Dynamically-generated class names** - avoid patterns which fail the `grep test <http://jamie-wong.com/2013/07/12/grep-test/>`__
- **Complex pre-processor functionality** - use Vue `computed styles <https://vuejs.org/v2/guide/class-and-style.html>`__ instead
- **Hard-coded values** - rely on variables defined in the core theme
- **Left or right alignment on user-generated text** - use ``dir="auto"`` instead for RTL support
