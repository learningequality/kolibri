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
-  Configuration passed to other mocks/stubs (like the values the getters for store mock should return, arguments to Vue Router etc.) according to the test case. This is especially useful when you have a lot of tests that need to render the same component with the same configuration. Here is an example of how you can define a ``renderComponent`` function:

.. code:: javascript

   // Helper function to render the component with Vuex store
   const renderComponent = props => {
     const { store = {}, ...componentProps } = props;

     return render(TotalPoints, {
       store: {
         getters: {
           totalPoints: () => store.totalPoints ?? 0,
           currentUserId: () => store.currentUserId ?? "user-01",
         },
       },
       props: componentProps,
     });
   };

   ...

    // Usage in the test
    it('renders the total points', async () => {
      renderComponent({
        store: { totalPoints: 10 }
        isActive: true,
        showPoints: true,
      });

      expect(screen.getByText('10')).toBeInTheDocument();
    });

In this example, the ``renderComponent`` function is used to render the ``TotalPoints`` component. All the keys in the ``props`` object are passed as props to the component, and the ``store`` object is used to mock the Vuex store. To see more such mocking examples, you can check out the `testing layout documentation <testing_layout.html>`__.

Add smoke tests
~~~~~~~~~~~~~~~

Add a smoke test to every test suites that only renders the most basic example of a component, where the only thing about assert is that the simplest render does not throw an error. This is useful to ensure that the component is not broken due to some basic error like a missing import or a syntax error.

Use describe blocks
~~~~~~~~~~~~~~~~~~~

Use ``describe`` blocks to group unit tests that test similar functionality. Nest describe blocks to group tests that are more closely related. This helps in organizing the tests and makes it easier to understand the test suite, specially in the case of larger components.

Avoid long and complex unit tests
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A unit test should be kept simple and test a single execution flow, so that it is easy for someone else to read the test and understand the functionality of the component. You can always group related execution flows together using a ``describe`` block so that the test suite is organized.

Use default props
~~~~~~~~~~~~~~~~~

Use default props that are not relevant to your unit test: within your ``renderComponent`` functions declare default props so that you do not have to define them in unit tests where they are not relevant.

For example, if a component has two props, ``dataList`` and ``isActive``, if might be a good idea to define the ``isActive`` prop as a default prop in the ``renderComponent`` function with a default value of ``true``. This way, you can avoid defining the ``isActive`` prop in most of the unit tests testing how the component handles the ``dataList`` prop. For the cases where you want to test the component with ``isActive`` set to ``false``, you can always override the default prop in the unit test.

Explicitly declare props that are relevant to your unit test
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Avoid using default props for inputs that are relevant to your unit tests, and instead declare them explicitly in your test. For example, if we are testing the rendering of a list, then let's explicitly declare the list in the unit test. Let's not wait until someone else reading the test has to go to the ``renderComponent`` function to see what the unit test input was.

Queries
~~~~~~~

VTL provides a number of `queries <https://testing-library.com/docs/vue-testing-library/cheatsheet#queries>`__ that can be used to query the DOM nodes. There are primarily three types of queries: ``get``, ``query`` and ``find``. All of these queries have different variants, which are used to query the DOM nodes based on different criteria. Some examples of the same include: ``getByText``, ``queryByRole``, ``findByText`` etc. These queries also have a recommened priority based on what the user would most likely interact with. You can read more about the same `here <https://testing-library.com/docs/queries/about#priority>`__.

Making use of VTL ``screen`` object
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For querying DOM nodes, the preferred way is to use the ``screen`` object provided by ``@testing-library/vue``. So instead of destructuring the queries functions from the object returned by the VTL ``render`` function, you can use the VTL ``screen`` object for faster access to all its queries:

.. code-block:: javascript

  // ❌
  const {getByRole} = render(Example)
  const errorMessage = getByRole('alert')

  // ✅
  render(<Example />)
  const errorMessage = screen.getByRole('alert')

Prefer the ``userEvent`` package over ``fireEvent`` to simulate user interactions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

`@testing-library/user-event <https://testing-library.com/docs/user-event/intro/>`__ is a package that's built on top of `fireEvent <https://testing-library.com/docs/dom-testing-library/api-events/#fireevent>`__, but it provides several methods that resemble the user interactions more closely. You should use ``userEvent`` to mock the user interactions by default, and only fallback to ``fireEvent`` when you need more granular control.

For example, using ``fireEvent.change`` on an text input will simply trigger a single change event on the input. However using the ``userEvent.type`` function, it will trigger ``keyDown``, ``keyPress``, and ``keyUp`` events for each character as well. It's much closer to the user's actual interactions. This has the benefit of working well with libraries that you may use which don't actually listen for the change event.

Using ``testing-library/jest-dom``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

`testing-library/jest-dom <https://github.com/testing-library/jest-dom>`__ provides a set of custom jest matchers that extend jest to common usecases for frontend testing, like checking classes, attributes text content, CSS properties etc. The use of these matchers helps to make the tests more declarative and clear to read and maintain. Please make sure you use the appropiate matcher from the same, and not just the regular default matchers. The library is already imported as a part of the setup, so you needn't import it your test files. You would also get help from your editor in the same due to the configured `Jest DOM ESLint plugin <https://github.com/testing-library/eslint-plugin-jest-dom>`__!

Here are some examples of the matchers provided by the library, and how they make the tests more readable and declarative:

.. code-block:: javascript

  // ❌
  expect(inputElement).disabled.toBeTruthy()
  expect(sampleElement.classList.contains('active')).toBeTruthy()
  expect(sampleElement.textContent).toBe('Hello, world!')

  // ✅
  expect(inputElement).toBeDisabled()
  expect(sampleElement).toHaveClass('active')
  expect(sampleElement).toHaveTextContent('Hello, world!')

More References
---------------

The following are some resources that have greatly influenced the above described design philosphy as well as are great resources in themselves to learn more about frontend testing:

-  `Testing Library Documentation <https://testing-library.com/docs/>`__
-  `Vue Testing Library Documentation <https://testing-library.com/docs/vue-testing-library/api>`__
-  `Querying Methods <https://testing-library.com/docs/queries/about>`__
-  `Query Priorities <https://testing-library.com/docs/queries/about#priority>`__
-  `User Interaction Documentation <https://testing-library.com/docs/user-event/intro>`__
-  `Common Mistakes with Testing Library <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>`__
