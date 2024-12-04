Testing template
================

This is a common template that should serve as a nice starter for any test file testing a ``Vue.js`` component, and also gives a brief description on mocking the various dependencies of a common.

The general template of a test file will be like:

.. code:: javascript

   import { render, screen } from '@testing-library/vue';
   import userEvent from '@testing-library/user-event'
   import YourExampleComponent from '../YourExampleComponent.vue';

   const samplePropA = "someTestingValue1"
   const samplePropB = "someTestingValue2"

   // Helper function to render the component with the provided props
   const renderComponent = props => {
     return render(YourExampleComponent, {
       props: {
           propA: samplePropA,
           propB: samplePropB,
           ...props
       }
     });
   };

   describe('YourExampleComponent', () => {
     test("smoke test", () => {
       renderComponent();

       // Make a basic assertion about the outermost container in the smoke test
       expect(screen.getByText("Sample Component")).toBeInTheDocument();
     })

     test('describe some use case', async () => {
       renderComponent({
           propA: samplePropA
       });

       // Perform some user interaction
       await userEvent.click(screen.getByRole("button", { name: "Click" }))

       expect(screen.getByText(samplePropA)).toBeInTheDocument();
     });
   });


Mocking Examples
----------------

This section lists down some code snippets that can be used as reference to see how the different dependencies can be mocked. These are just example snippets, and you would need to refactor their style to match the needs of your components.

Vue Router
~~~~~~~~~~

You can pass a ``routes`` prop to the ``render`` function with the value as a new ``VueRouter`` object to mock Vue Router and to test navigation in your components. The same is included in the template by default (with no routes configured). To add additional routes to the name, you can pass it an array of objects containing the keys ``name`` and ``path`` for the required paths needed to be mocked.

.. code:: javascript

   const renderComponent = props => {
     return render(YourExampleComponent, {
       routes: new VueRouter([
         {
           name: "MockPageA",
           path: "path/to/mock/page/A"
         },
         {
           name: "MockPageB",
           path: "path/to/mock/page/B"
         }
       ]),
     });
   };

Store
~~~~~

A store object for a component can be mocked by simply providing the methods and properties accessed by the component as a ``store`` object. For example, in the
`TotalPoints <https://github.com/learningequality/kolibri/blob/develop/packages/kolibri/components/pages/AppBarPage/internal/TotalPoints.vue>`__ component, we need to mock some getters (``totalPoints``, ``currentUserId``, ``isUserLoggedIn``) and the ``fetchPoints`` action.

The same can be done via:

.. code:: javascript

   // Helper function to render the component with Vuex store
   const renderComponent = props => {
     const { store = {}, ...componentProps } = props;
     return render(TotalPoints, {
       store: {
         getters: {
           totalPoints: () => store.totalPoints ?? 0,
           currentUserId: () => store.currentUserId ?? "user-01",
           isUserLoggedIn: () => store.isUserLoggedIn ?? true,
         },
         actions: {
           fetchPoints: () => store.points ?? 0,
         },
       },
       props: componentProps,
     });
   };

The ``props`` object passed to the render function can contain the store object, which can be used to mock the store in the component. All the other props can be passed as usual.

Composables
~~~~~~~~~~~

Each composable (like `useUser <https://github.com/learningequality/kolibri/blob/develop/packages/kolibri/composables/useUser.js>`__) must have an associated mock file (like `useUserMock <https://github.com/learningequality/kolibri/blob/develop/packages/kolibri/composables/__mocks__/useUser.js>`__) that gives the required functionality, as well as the documentation of how to use it and what parameters does it support.

It any composable does not have an associated mock file, please do create one before using the same in tests. It would help in future maintainability and eaxe of testing. Here is small snippet of what a mock of composable would look like:

.. code:: javascript

   import useUser, { useUserMock } from 'kolibri/composables/useUser';
   import YourSampleComponent from '../YourSampleComponent.vue';

   jest.mock('kolibri/composables/useUser');

   ...

   // A helper function to render the component with the given props and some default mocks
   const renderComponent = props => {
     const { useUserMock: useUserMockData, ...componentProps } = props;

     useUser.mockImplementation(() =>
       useUserMock({
         isAppContext: useUserMockData?.isAppContext ?? false,
       })
     );

     ...

     return render(YourSampleComponent, {
       props: componentProps,
     });
   };

   ...
   // A sample call to the renderComponent function
   renderComponent({
     useUserMock: {
       isAppContext: true,
     },
     propA: "someTestingValue1",
     propB: "someTestingValue2",
   });

As a design pattern, all the mock data for a composable should be passed as a named key in the props object, so that it is clear to the reader that which props are being used for the component, and which are being used for the composable. A neat way of doing this is to destructure the props object in the render function, and then pass the rest of the props to the component, and the named key to the composable as shown.

Mixins
~~~~~~

Sometimes the components make use of `mixins <https://v2.vuejs.org/v2/guide/mixins.html?redirect=true>`__ to reuse functionality across components, and may be required to be mocked sometimes. To overwrite the mixins passed to a component in testing, you can make use of the ``mixins`` property to the ``render`` function object, and pass it the array of your custom mocked mixins.

The following example mocks the `commonCoreStrings <https://github.com/learningequality/kolibri/blob/develop/packages/kolibri/uiText/commonCoreStrings.js>`__ mixin used in many components:

.. code:: javascript

   // Mock for the commonCoreStrings mixin
   const commonCoreStrings = {
       methods: {
         coreString: (x) => x
       },
     };

   const renderComponent = props => {
     return render(TriesOverview, {
       props,
       mixins: [commonCoreStrings],
     });
   };

Imports and Utility Functions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

It is common for the components to import some functions or objects from other files. If needed, these imports can be mocked with the help of Jest. We would not go into the detail of same here as it these use-cases can be very diverse, and are more related to Jest and testing specific in general, and thus follow no template. The `Jest documentation for mock functions <https://jestjs.io/docs/mock-functions>`__ does a great job of showing all the different use cases, along with code examples of how to configure functions and imports to return values, promises, or errors.
