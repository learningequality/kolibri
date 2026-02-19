Composables
===========

Composables are reusable functions that encapsulate stateful logic using Vue's Composition API. They are the **preferred approach** for state management in Kolibri, replacing Vuex (which is deprecated).

They follow the naming convention ``use*`` (e.g., ``useChannels``, ``useTaskPolling``).

.. note::
  The Composition API is the preferred approach for all new Vue code in Kolibri, not just composables. New components should use ``setup()`` rather than the Options API. Existing Options API components do not need to be migrated, but new code should follow Composition API patterns.

.. seealso::
  For information about Vuex deprecation, see :doc:`vuex`.

Key benefits:

- **Reusability**: Share logic across components
- **Testability**: Easy to test in isolation
- **Simplicity**: No boilerplate compared to Vuex stores


When to Use Composables
------------------------

Use composables when you need to:

- Share state or logic between components
- Encapsulate complex stateful logic
- Implement reusable behaviors (e.g., polling, route tracking)

**Do not use Vuex** - it is deprecated. See :doc:`vuex` for migration guidance.


Composable Conventions
----------------------

File naming and location
~~~~~~~~~~~~~~~~~~~~~~~~

- **Name**: ``use*.js`` (e.g., ``useChannels.js``)
- **Location**:

  - Shared composables: ``packages/kolibri-common/composables/``
  - Plugin-specific: ``kolibri/plugins/<plugin>/frontend/composables/``
  - Component-specific: Co-located with component

Function structure
~~~~~~~~~~~~~~~~~~

.. code-block:: javascript

  /**
   * A composable function containing logic related to [feature]
   */
  import { ref, computed } from 'vue';

  export default function useFeatureName() {
    // Reactive state
    const items = ref([]);
    const isLoading = ref(false);

    // Computed properties
    const itemCount = computed(() => items.value.length);

    // Methods
    function addItem(item) {
      items.value.push(item);
    }

    // Return public API
    return {
      items,
      isLoading,
      itemCount,
      addItem,
    };
  }

Include JSDoc comments describing the composable's purpose.


Shared State Pattern
---------------------

For state that needs to be shared globally across components, define refs/reactive objects at the **module level** (outside the composable function):

.. code-block:: javascript

  import { ref, reactive } from 'vue';

  // Module-level state - shared across all consumers
  const channelsMap = reactive({});
  const localChannelsCache = ref([]);

  export default function useChannels() {
    // Functions that operate on shared state
    function fetchChannels(params) {
      // ...
    }

    return {
      channelsMap,       // Shared reactive state
      localChannelsCache, // Shared ref
      fetchChannels,
    };
  }

This pattern creates a lightweight shared store without Vuex overhead.

.. warning::
  Use module-level state sparingly. Most state should be local to components. Only use shared state when multiple components truly need to access the same data.


Provider/Inject Pattern
-----------------------

For state scoped to a component tree (not truly global), use Vue's provide/inject:

.. code-block:: javascript

  import { ref, provide, inject } from 'vue';

  /**
   * Composable for providing a route tracking context
   */
  export default function usePreviousRoute() {
    const previousRoute = ref(null);

    // Provide to child components
    provide('previousRoute', previousRoute);

    return previousRoute;
  }

  /**
   * Inject the previous route ref
   */
  export function injectPreviousRoute() {
    return inject('previousRoute');
  }

This keeps state scoped to a specific component hierarchy rather than global.


Testing Composables
-------------------

Tests for composables live in ``__tests__/`` directories following Jest conventions:

.. code-block:: text

  composables/
  ├── __tests__/
  │   └── useChannels.spec.js
  └── useChannels.js

Example test structure:

.. code-block:: javascript

  import { ref } from 'vue';
  import useChannels from '../useChannels';

  describe('useChannels', () => {
    beforeEach(() => {
      // Setup mocks
      jest.clearAllMocks();
    });

    it('should fetch channels', async () => {
      const { fetchChannels, channelsMap } = useChannels();
      await fetchChannels();
      expect(Object.keys(channelsMap).length).toBeGreaterThan(0);
    });
  });

See :doc:`unit_testing` for comprehensive testing guidance.


Common Composable Patterns
---------------------------

Resource fetching
~~~~~~~~~~~~~~~~~

.. code-block:: javascript

  import { ref } from 'vue';
  import ResourceAPI from './api';

  export default function useResource() {
    const data = ref(null);
    const loading = ref(false);
    const error = ref(null);

    async function fetch(id) {
      loading.value = true;
      error.value = null;
      try {
        data.value = await ResourceAPI.get(id);
      } catch (e) {
        error.value = e;
      } finally {
        loading.value = false;
      }
    }

    return { data, loading, error, fetch };
  }

Polling
~~~~~~~

.. code-block:: javascript

  import { ref, onMounted, onUnmounted } from 'vue';
  import { useTimeoutPoll } from '@vueuse/core';

  export default function useTaskPolling(queueName) {
    const tasks = ref([]);

    const { pause, resume } = useTimeoutPoll(
      async () => {
        tasks.value = await fetchTasks(queueName);
      },
      5000,
      { immediate: true }
    );

    onMounted(() => resume());
    onUnmounted(() => pause());

    return { tasks };
  }

Lifecycle management
~~~~~~~~~~~~~~~~~~~~

Composables can use lifecycle hooks just like components:

.. code-block:: javascript

  import { onMounted, onUnmounted } from 'vue';

  export default function useEventListener(target, event, handler) {
    onMounted(() => {
      target.addEventListener(event, handler);
    });

    onUnmounted(() => {
      target.removeEventListener(event, handler);
    });
  }


Using @vueuse/core
------------------

Kolibri uses utilities from `@vueuse/core <https://vueuse.org/>`__ which provides many useful composables:

- ``useTimeoutPoll`` - Polling with automatic cleanup
- ``get/set`` - Safe reactive ref access
- And many more utilities

Always check ``@vueuse/core`` before implementing common patterns yourself.


Migration from Vuex
-------------------

Vuex is deprecated in favor of composables. Here's a quick comparison:

.. list-table::
   :header-rows: 1

   * - Vuex
     - Composables
   * - ``store.state.items``
     - ``const items = ref([])``
   * - ``store.getters.itemCount``
     - ``const itemCount = computed(() => items.value.length)``
   * - ``store.commit('setItems', data)``
     - ``items.value = data``
   * - ``store.dispatch('fetchItems')``
     - ``async function fetchItems() { ... }``


Best Practices
--------------

1. **Keep composables focused**: Each composable should have a single, clear purpose
2. **Use module-level state sparingly**: Most state should be local to components
3. **Document with JSDoc**: Always include function and parameter documentation
4. **Return consistent interface**: Return an object with clear, named properties
5. **Handle cleanup**: Use ``onUnmounted`` for cleanup (event listeners, timers, etc.)
6. **Prefer composition over inheritance**: Compose multiple small composables rather than creating large ones
7. **Test in isolation**: Write unit tests for composables separate from components


Examples in the Codebase
------------------------

Good examples to reference:

- ``packages/kolibri-common/composables/useChannels.js`` - Shared state pattern
- ``packages/kolibri-common/composables/useTaskPolling.js`` - Polling pattern
- ``packages/kolibri-common/composables/usePreviousRoute.js`` - Provider/inject pattern
- ``packages/kolibri-common/composables/useBaseSearch.js`` - Complex state management

Browse ``packages/kolibri-common/composables/`` for more examples.
