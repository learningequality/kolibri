# Testing Template

This is a common template that should serve as a nice starter for any test file testing a `Vue.js` component, and also gives a brief description on mocking the various dependencies of a common. 

The general template of a test file will be like:

```javascript
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
```

Some quick notes about the code snippet:
- You would need to replace the `YourExampleComponent` with the actual component you want to test.
- It is usually a good practice to have the first test as a smoke test in all your components.
- You can add describe blocks to add context to your tests. Remember to keep them as short as possible, and a test block should be responsible for testing only one functionality. 
- It is advisable to define the default props as global constants so they are easily accessible in the tests (though this may vary from file to file).
- In case if you are using some particular text/value in your assertions because they are derived from the props that you pass in, then it is advisable to explicity pass them to the `renderComponent` as arguments to give the reader context of where they are coming from.

For example, in the `describe some use case` test, since we are querying on the value of `samplePropA`, we are explicity passing it to the `renderComponent` even though it is the exact same as the default prop.

## Mocking Examples

This section lists down some code snippets that can be used as reference to see how the different dependencies can be mocked. These are just example snippets, and you would need to refactor their style to match the needs of your components.

### Vue Router

All the components need to be associated with a Router to run successfully. 

### Store

A store object for a component can be mocked by simply providing the methods and properties accessed by the component as a `store` object. For example, in the [`TotalPoints`](https://github.com/learningequality/kolibri/blob/develop/kolibri/core/assets/src/views/TotalPoints.vue) component, we need to mock some getters (`totalPoints`, `currentUserId`, `isUserLoggedIn`) and the `fetchPoints` action. The same can be done via:

```javascript

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
```
