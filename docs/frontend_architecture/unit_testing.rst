Unit testing
============

Unit testing is carried out using `Jest <https://facebook.github.io/jest/>`__. All JavaScript code should have unit tests for all object methods and functions. All the tests are written in JavaScript. An example test is shown below:

.. code-block:: javascript

  // Testing a JavaScript module
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

  // Testing a UI component
  import { render, screen } from '@testing-library/vue';
  import Heading from './Heading.vue';

  describe('Heading', () => {
    it('renders a heading', async () => {
      render(Heading, {
        props: {
          text: 'Hello, world!',
        },
      });

      expect(screen.getByRole('heading')).toHaveTextContent('Hello, world!');
    });
  });


We use `Vue Testing Library (VTL) <https://testing-library.com/docs/vue-testing-library/intro/>`__ and its associated ecosystem to test Vue components, as it allows us to test UI components in a user-centric way.

It is based on the philosophy that “The more your tests resemble the way your software is used, the more confidence they can give you." Rather than dealing with instances of rendered Vue components, it allows our tests to work with actual DOM nodes and simulate interactions the same way the user would. We earlier made use of `Vue Test Utils <https://v1.test-utils.vuejs.org/>`__ for the frontend testing, but have been transitioning to VTL for the same.

To learn more about VTL, you can check it's `examples page <https://testing-library.com/docs/vue-testing-library/examples>`__. You can also check out our `testing templates <testing_layout.html>`__ and our style guide to start writing new test suites in Kolibri.

Style Guide
-----------

Here are some of the conventions that we prefer to follow while testing so that uniformity is maintained across the codebase:

Naming Conventions
~~~~~~~~~~~~~~~~~~

Each folder is expected to have a ``__tests__`` folder, which would contain all the test files for the files in the same (whether ``.js`` or ``.vue``). The test files are expected to follow the naming convention ``<Name of the file being tested>.spec.js``.

Use of ``renderComponent`` function
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To avoid repeating boilerplate code while testing Vue components, define a ``renderComponent`` function to set up all the necessary mocks, stubs, and default props values to render the component to test. It can also revieve an optional argument ``props``, which can be used to overwrite:

-  The default props passed to the component being rendered
-  Configuration passed to other mocks/stubs (like the values the getters for store mock should return, arguments to Vue Router etc) according to the test case

Queries
~~~~~~~

VTL provides a number of `queries <https://testing-library.com/docs/vue-testing-library/cheatsheet#queries>`__ that can be used to query the DOM nodes. There are primarily three types of queries: ``get``, ``query`` and ``find``. All of these queries have different variants, which are used to query the DOM nodes based on different criteria. Some examples of the same include: ``getByText``, ``queryByRole``, ``findByText`` etc. These queries also have a recommened priority based on what the user would most likely interact with. You can read more about the same `here <https://testing-library.com/docs/queries/about#priority>`__.

Making use of ``screen``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Instead of importing the query functions from the object returned by the ``render`` function, you should import the ``screen`` object for the same. The ``screen`` object is a global object that is provided by the ``@testing-library/vue`` package, and it contains all the query functions as properties. This ensures that we do not have to import the query functions in test, and can call them directly.

``userEvent`` over ``fireEvent``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

`@testing-library/user-event <https://testing-library.com/docs/user-event/intro/>`__ is a package that's built on top of `fireEvent <https://testing-library.com/docs/dom-testing-library/api-events/#fireevent>`__, but it provides several methods that resemble the user interactions more closely. You should use ``userEvent`` to mock the user interactions by default, and only fallback to ``fireEvent`` when you need more granular control.

For example, using ``fireEvent.change`` on an text input will simply trigger a single change event on the input. However using the ``userEvent.type`` function, it will trigger ``keyDown``, ``keyPress``, and ``keyUp`` events for each character as well. It's much closer to the user's actual interactions. This has the benefit of working well with libraries that you may use which don't actually listen for the change event.

Using ``testing-library/jest-dom``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

`testing-library/jest-dom <https://github.com/testing-library/jest-dom>`__ provides a set of custom jest matchers that extend jest to common usecases for frontend testing, like checking classes, attributes text content, CSS properties etc. The use of these matchers helps to make the tests more declarative and clear to read and maintain. Please make sure you use the appropiate matcher from the same, and not just the regular default matchers. The library is already imported as a part of the setup, so you needn't import it your test files. You would also get help from your editor in the same due to the configured `Jest DOM ESLint plugin <https://github.com/testing-library/eslint-plugin-jest-dom>`__!

More References
---------------

The following are some resources that have greatly influenced the above described design philosphy as well as are great resources in themselves to learn more about frontend testing:

-  `Testing Library Documentation <https://testing-library.com/docs/>`__
-  `Vue Testing Library Documentation <https://testing-library.com/docs/vue-testing-library/api>`__
-  `Querying Methods <https://testing-library.com/docs/queries/about>`__
-  `Query Priorities <https://testing-library.com/docs/queries/about#priority>`__
-  `User Interaction Documentation <https://testing-library.com/docs/user-event/intro>`__
-  `Common Mistakes with Testing Library <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>`__
