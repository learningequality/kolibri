.. _conventions:

Front-end code conventions
==========================

In general, follow the `style guide <http://kolibridemo.learningequality.org/style_guide>`_ and use built-in components and conventions when ever possible.

Most syntax conventions are enforced by our linters, so make sure you've set up `pre-commit` as described in :doc:`../start/getting_started`

Vue.js Components
-----------------

- Keep child-components stateless when possible. In practice, this means using ``props`` but not ``data``

- Put child components inside the directory of a parent component if they are *only* used by the parent. Otherwise, put shared child components in the *vue* directory

- Any user-visisble app text should be rendered translatable. See :doc:`i18n` for details


Styling code smells
-------------------

- Unused styles. Delete them
- Unscoped styles. If absolutely necessary, use `deep selectors <https://vue-loader.vuejs.org/guide/scoped-css.html#deep-selectors>`_
- Classes used javascript identifiers - ``ref`` instead (`see docs <https://vuejs.org/v2/api/#ref>`_)
- References by ``id``. Use a ``class`` instead
- HTML-based selectors. Define a ``class`` instead
- Floats or flexbox. Use ``k-grid``
- Media queries. Use ``responsive-window`` or ``responsive-element``
- Nested selectors. Make a sub-component instead (more reading `here <https://csswizardry.com/2012/05/keep-your-css-selectors-short/>`_ and `here <http://thesassway.com/beginner/the-inception-rule>`_)
- Dynamically-generated class names which fail the `grep test <http://jamie-wong.com/2013/07/12/grep-test/>`_
- Complex pre-processor functionality. Keep logic in javascript instead
- Hard-coded colors. Rely on global theme variables instead
- Left or right text-alignment on user-generated text. Use ``dir="auto"`` instead
