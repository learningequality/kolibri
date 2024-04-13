Testing Template
================

This is a common template that should serve as a nice starter for any test file testing a ``Vue.js`` component, and also gives a brief description on mocking the various dependencies of a common.

The general template of a test file will be like:

.. code:: javascript

   import VueRouter from 'vue-router';
   import { render, screen } from '@testing-library/vue';
   import userEvent from '@testing-library/user-event'
   import YourExampleComponent from '../YourExampleComponent.vue';


   const samplePropA = "someTestingValue1"
   const samplePropB = "someTestingValue2"

   // Helper function to render the component with the provided props
   const renderComponent = props => {
     return render(YourExampleComponent, {
       routes: new VueRouter(),
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

Some quick notes about the code snippet:

1. You would need to replace the ``YourExampleComponent`` with the actual component you want to test.
2. It is usually a good practice to have the first test as a smoke test in all your components.
3. You can add describe blocks to add context to your tests. Remember to keep them as short as possible, and a test block should be responsible for testing only one functionality.
4. It is advisable to define the default props as global constants so they are easily accessible in the tests (though this may vary from file to file).
5. In case if you are using some particular text/value in your assertions because they are derived from the props that you pass in, then it is advisable to explicity pass them to the ``renderComponent`` as arguments to give the reader context of where they are coming from.

For example, in the ``describe some use case`` test, since we are querying on the value of ``samplePropA``, we are explicity passing it to the ``renderComponent`` even though it is the exact same as the default prop.

Mocking Examples
----------------

This section lists down some code snippets that can be used as reference to see how the different dependencies can be mocked. These are just example snippets, and you would need to refactor their style to match the needs of your components.

Vue Router
~~~~~~~~~~

All the components need to be associated with a Router to run successfully. The same can be mocked easily by passing a ``routes`` prop to the ``render`` function with the value as new ``VueRouter`` object. The same is included in the template by default (with no routes configured). To add additional routes to the name, you can pass it an array of objects containg the keys ``name`` and ``path`` for the required paths needed to be mocked.

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
`TotalPoints <https://github.com/learningequality/kolibri/blob/develop/kolibri/core/assets/src/views/TotalPoints.vue>`__ component, we need to mock some getters (``totalPoints``, ``currentUserId``, ``isUserLoggedIn``) and the ``fetchPoints`` action.

The same can be done via:

.. code:: javascript


   // Helper function to render the component with Vuex store
   const renderComponent = props => {
     return render(TotalPoints, {
       store: {
         getters: {
           totalPoints: () => props.totalPoints ?? 0,
           currentUserId: () => props.currentUserId ?? "user-01",
           isUserLoggedIn: () => props.isUserLoggedIn ?? true,
         },
         actions: {
           fetchPoints: () => props.points ?? 0,
         },
       },
       routes: new VueRouter(),
       props
     });
   };

Composables
~~~~~~~~~~~

Each composable (like `useUser <https://github.com/learningequality/kolibri/blob/develop/kolibri/core/assets/src/composables/useUser.js>`__) must have an associated mock file (like `useUserMock <https://github.com/learningequality/kolibri/blob/develop/kolibri/core/assets/src/composables/__mocks__/useUser.js>`__) that gives the required functionality, as well as the documentation of how to use it and what parameters does it support.

It any composable does not have an associated mock file, please do create one before using the same in tests. It would help in future maintainability and eaxe of testing. Here is small snippet of what a mock of composable would look like:

.. code:: javascript

   import useUser, { useUserMock } from 'kolibri.coreVue.composables.useUser';
   import YourSampleComponent from '../YourSampleComponent.vue';

   jest.mock('kolibri.coreVue.composables.useUser');

   ...

   // A helper function to render the component with the given props and some default mocks
   const renderComponent = props => {
     useUser.mockImplementation(() =>
       useUserMock({
         isAppContext: props.isAppContext || false,
       })
     );

     ...

     return render(YourSampleComponent, {
       routes: new VueRouter(),
       props
     });
   };

Mixins
~~~~~~

Sometimes the components make use of `mixins <https://v2.vuejs.org/v2/guide/mixins.html?redirect=true>`__ to reuse functionality across components, and may be required to be mocked sometimes. To overwrite the mixins passed to a component in testing, you can make use of the ``mixins`` property to the ``render`` function object, and pass it the array of your custom mocked mixins.

The following example mocks the `commonCoreStrings <https://github.com/learningequality/kolibri/blob/develop/kolibri/core/assets/src/mixins/commonCoreStrings.js>`__ mixin used in many components:

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
       routes: new VueRouter(),
       mixins: [commonCoreStrings],
     });
   };

Imports and Utility Functions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

It is common for the components to import some functions or objects from other files. If needed, these imports can be mocked with the help of Jest. We would not go into the detail of same here as it these use-cases can be very diverse, and are more related to Jest and testing specific in general, and thus follow no template. The `Jest documentation for mock functions <https://jestjs.io/docs/mock-functions>`__ does a great job of showing all the different use cases, along with code examples of how to configure functions and imports to return values, promises, or errors.
