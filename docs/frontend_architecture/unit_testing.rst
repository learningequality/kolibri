Unit testing
============

Unit testing is carried out using `Jest <https://facebook.github.io/jest/>`__. All JavaScript code should have unit tests for all object methods and functions.

Tests are written in JavaScript, and placed in the 'assets/test' folder. An example test is shown below:

.. code-block:: javascript

  var assert = require('assert');

  var SearchModel = require('../src/search/search_model.js');

  describe('SearchModel', function() {
    describe('default result', function() {
      it('should be empty an empty array', function () {
        var test_model = new SearchModel();
        assert.deepEqual(test_model.get("result"), []);
      });
    });
  });


For the frontend testing of ``Vue.js`` components, we make use of ```Vue Testing Library`` <https://testing-library.com/docs/vue-testing-library/intro/>`__
and the associated ecosystem.

It is based on the philosphy that “The more your tests resemble the way your software is used, the more confidence they can give you." Rather than dealing with instances of rendered Vue components, it allows our tests to work with actual DOM nodes in the same way the user would. This deals to more user centric and a better quality of tests generally, and thus we have been making efforts to use the same (in constrast to the earlier used ```Vue Test Utils`` <https://v1.test-utils.vuejs.org/>`__).

If you have never worked with Vue Testing Library's (VTL) before, it is highly recommeed to the `VTL examples page <https://testing-library.com/docs/vue-testing-library/examples>`__ to see the library in action and understand it's use. If you're comfortable with the same, you can either:

-  Read some of the exisiting tests in Kolibri to see how we make use of the same.
-  Checkout the `test template <TODO>`__ and the `style guide <TODO>`__ to start writing your own!

Style Guide
-----------

Here are some of the conventions that we prefer to follow while testing so that uniformity is maintained across the codebase:

Naming Conventions
~~~~~~~~~~~~~~~~~~

Each folder is expected to have a ``__tests__`` folder, which would contain all the test files for the files in the same (whether ``.js`` or ``.vue``). The test files are expected to follow the naming convention ``<Name of the file being tested>.spec.js``.

Use of ``renderComponent`` function
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

All the files testing ``Vue.js`` components are expected to have their first function as ``renderComponent``. The job of this function should be to setup all the necesary mocks to render the component in the testing environment properly. It can also revieve an optional argument ``props``, which can be used to overwrite:

-  The default props passed to the component being rendered
-  Configuration passed to other mocks/stubs (like the values the getters for store mock should return, arguments to Vue Router etc)

Queries
~~~~~~~

VTL provides a number of `queries <https://testing-library.com/docs/vue-testing-library/cheatsheet#queries>`__ that can be used to query the DOM nodes. There are primarily three types of queries: ``get``, ``query`` and ``find``. All three of them have two variants: one to query just a single DOM node, and the other to query multiple. Please ensure that you are using the correct kind of the query according to the particular usecase.

The queries also have a recommened priority, so that we can ensure our tests exactly mock the behaviour like a typical user:

1. ``getByRole``: This can be used to query every element that is exposed in the accessibility tree. With the “name” option you can filter the returned elements by their accessible name.
2. ``getByLabelText``: It is mostly used form fields.
3. ``getByPlaceholderText``: Not a substitute for labels, but if that's all you have, then it's better than alternatives.
4. ``getByText``: Outside of forms, text content is the main way users find elements. This can be used to find non-interactive elements (e.g. divs, spans, and paragraphs).
5. ``getByDisplayValue``: Querying by the current value of a form element can be useful when navigating a page with filled-in values.
6. ``getByAltText``: If your element is one which supports alt text (``img``, ``area``, ``input``), then you make use of this query.
7. ``getByTitle``: The title attribute is not consistently read by screenreaders, and is not visible by default for sighted users. Thus is it not the best option, but better than ``getByTestId``

The last and less-recommended priority:

8. ``getByTestId``: The user cannot see (or hear) these, so this is only recommended for cases where you can't match by role or text or it doesn't make sense (e.g. the text is dynamic). Using this would involve adding a ``data-testid`` attribute to the particular node, and then using that value as the argument to
``getByTestId`` function.

Making use of ``screen``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Instead of importing the query functions from the object returned by the ``render`` function, you should import the ``screen`` object for the same. The ``screen`` object is a global object that is provided by the ``@testing-library/vue`` package, and it contains all the query functions as properties. This ensures that we do not have to import the query functions in test, and can call them directly.

``userEvent`` over ``fireEvent``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

```@testing-library/user-event`` <https://testing-library.com/docs/user-event/intro/>`__ is a package that's built on top of `fireEvent <https://testing-library.com/docs/dom-testing-library/api-events/#fireevent>`__, but it provides several methods that resemble the user interactions more closely. You should use ``userEvent`` to mock the user interactions by default, and only fallback to ``fireEvent`` when you need more granular control.

For example, using ``fireEvent.change`` on an text input will simply trigger a single change event on the input. However using the ``userEvent.type`` function, it will trigger ``keyDown``, ``keyPress``, and ``keyUp`` events for each character as well. It's much closer to the user's actual interactions. This has the benefit of working well with libraries that you may use which don't actually listen for the change event.

Using ``testing-library/jest-dom``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

```testing-library/jest-dom`` <https://github.com/testing-library/jest-dom>`__ provides a set of custom jest matchers that extend jest to common usecases for frontend testing, like checking classes, attributes text content, CSS properties etc. The use of these matchers helps to make the tests more declarative and clear to read and maintain. Please make sure you use the appropiate matcher from the same, and not just the regular default matchers. The library is already imported as a part of the setup, so you needn't import it your test files. You would also get help from your editor in the same due to the configured `Jest DOM ESLint plugin <https://github.com/testing-library/eslint-plugin-jest-dom>`__!

More References
---------------

The following are some resources that have greatly influenced the above described design philosphy as well as are great resources in themselves to learn more about frontend testing:

-  `Testing Library Documentation <https://testing-library.com/docs/>`__
-  `Vue Testing Library Documentation <https://testing-library.com/docs/vue-testing-library/api>`__
-  `Querying Methods <https://testing-library.com/docs/queries/about>`__
-  `Query Priorities <https://testing-library.com/docs/queries/about#priority>`__
-  `User Interaction Documentation <https://testing-library.com/docs/user-event/intro>`__
-  `Common Mistakes with Testing Library <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>`__
