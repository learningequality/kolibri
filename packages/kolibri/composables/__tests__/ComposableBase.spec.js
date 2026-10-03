import { inject, markRaw, nextTick, onUnmounted, ref, watch } from 'vue';
import { render } from '@testing-library/vue';
import ComposableBase from '../ComposableBase';
import GlobalStore from '../GlobalStore';
import { hooks } from '../internal/composableRuntime';

class PaginationComposable extends ComposableBase {
  items = null;
  perPage = 2;
  page = 1;
  _visits = 0;
  options = markRaw({ calls: 0 });

  init(items, perPage = 2) {
    this.items = items;
    this.perPage = perPage;
    onUnmounted(() => this.onUnmount());
  }

  get pageCount() {
    return Math.ceil(this.items.length / this.perPage);
  }

  next() {
    this.page = Math.min(this.page + 1, this.pageCount);
  }

  onUnmount() {}
}

class ThemedComposable extends ComposableBase {
  static dependencies = { theme: () => ({ name: inject('themeName') }) };

  get themeName() {
    return this.theme.name;
  }
}

class FacilityFetcher extends ComposableBase {
  static dependencies = { selection: () => ({ facilityId: ref('facility-1') }) };

  init() {
    watch(() => this.selection.facilityId, this.fetch, { immediate: true });
  }

  fetch() {}
}

function renderInComponent(use, options = {}) {
  let composable;
  const result = render(
    {
      setup() {
        composable = use();
        return composable;
      },
      template: options.template || '<p></p>',
    },
    { provide: options.provide },
  );
  return { ...result, composable };
}

function renderPagination(items) {
  const { composable, ...result } = renderInComponent(() => PaginationComposable.use(items), {
    template: '<p>page {{ page }} of {{ pageCount }}</p>',
  });
  return { ...result, pagination: composable };
}

describe('ComposableBase', () => {
  it('creates an instance per call, passing use() arguments to init', async () => {
    const items = ref([1, 2, 3]);
    const { pagination, container } = renderPagination(items);
    expect(container).toHaveTextContent('page 1 of 2');
    pagination.next();
    await nextTick();
    expect(container).toHaveTextContent('page 2 of 2');
    expect(PaginationComposable.use(items).page.value).toBe(1);
  });

  it('binds use to each subclass, not to the class it inherits from', () => {
    class Parent extends ComposableBase {
      kind = 'parent';
    }
    class Child extends Parent {
      kind = 'child';
    }
    expect(Parent.use().kind.value).toBe('parent');
    expect(Child.use().kind.value).toBe('child');
  });

  it('tracks refs passed to init', async () => {
    const items = ref([1, 2, 3]);
    const { container } = renderPagination(items);
    items.value = [1, 2, 3, 4, 5];
    await nextTick();
    expect(container).toHaveTextContent('page 1 of 3');
  });

  it('lets consumers write refs', () => {
    const { pagination } = renderPagination(ref([1, 2, 3]));
    pagination.page.value = 2;
    expect(pagination.page.value).toBe(2);
  });

  it('keeps underscored members and init from consumers', () => {
    const { pagination } = renderPagination(ref([]));
    expect(pagination).not.toHaveProperty('_visits');
    expect(pagination).not.toHaveProperty('init');
  });

  it('runs lifecycle hooks registered in init', () => {
    const { pagination, unmount } = renderPagination(ref([]));
    unmount();
    expect(pagination.onUnmount).toHaveBeenCalled();
  });

  it('gives init its dependencies and exposed methods', () => {
    const { composable } = renderInComponent(() => FacilityFetcher.use());
    expect(composable.fetch.mock.calls[0][0]).toBe('facility-1');
  });

  it('rejects fields that init assigns without declaring them', () => {
    class Undeclared extends ComposableBase {
      init() {
        this.undeclared = 1;
      }
    }
    expect(() => Undeclared.use()).toThrow(TypeError);
  });

  it('passes markRaw fields to consumers as they are, not as refs', () => {
    const { pagination } = renderPagination(ref([]));
    expect(pagination.options).toEqual({ calls: 0 });
    expect(() => PaginationComposable.mock({ options: {} })).toThrow(
      'PaginationComposable has no ref or computed named options',
    );
  });

  it('resolves dependencies while its component is set up', () => {
    const { composable } = renderInComponent(() => ThemedComposable.use(), {
      provide: { themeName: 'dark' },
    });
    expect(composable.themeName.value).toBe('dark');
  });
});

const userSource = jest.fn(() => ({ isSuperuser: ref(false) }));

class CounterStore extends GlobalStore {
  count = 0;
  _secret = 'hidden';

  get doubled() {
    return this.count * 2;
  }

  get label() {
    return `count ${this.count}`;
  }

  set label(value) {
    this.count = Number(value.split(' ')[1]);
  }

  increment() {
    this.count++;
  }

  incrementTwice() {
    this.increment();
    this.increment();
  }
}

class TodoStore extends GlobalStore {
  static dependencies = { counter: CounterStore, user: userSource };

  todos = [];

  get canAdd() {
    return this.user.isSuperuser || this.counter.count > 0;
  }

  add(todo) {
    this.todos.push(todo);
    this.counter.increment();
  }
}

class StubbedStore extends GlobalStore {
  items = [];

  get size() {
    return this.items.length;
  }

  load() {
    return 'real';
  }
}

StubbedStore.stub();

const persisted = [];

function usePersisted() {
  const value = ref(null);
  watch(value, newValue => persisted.push(newValue), { flush: 'sync' });
  return value;
}

class PersistedStore extends GlobalStore {
  _value = usePersisted();

  save(value) {
    this._value = value;
  }
}

const capturedAtImport = CounterStore.use();
PersistedStore.use();

describe('GlobalStore', () => {
  it('returns the same instance from every call', () => {
    expect(CounterStore.use()).toBe(CounterStore.use());
    expect(CounterStore.use).toBe(CounterStore.use);
  });

  it('shares refs written by one consumer with every other consumer', () => {
    CounterStore.use().count.value = 5;
    expect(CounterStore.use().count.value).toBe(5);
  });

  it('runs init once, on first use', () => {
    class InitStore extends GlobalStore {
      inits = 0;

      init() {
        this.inits++;
      }
    }
    InitStore.use();
    expect(InitStore.use().inits.value).toBe(1);
  });

  it('resolves dependencies on class stores and function composables', () => {
    const { add, todos, canAdd } = TodoStore.use();
    expect(canAdd.value).toBe(false);
    add('write spike');
    expect(todos.value).toEqual(['write spike']);
    expect(CounterStore.use().count.value).toBe(1);
    expect(canAdd.value).toBe(true);
  });

  it('re-resolves function dependencies in each test', () => {
    userSource.mockReturnValue({ isSuperuser: ref(true) });
    expect(TodoStore.use().canAdd.value).toBe(true);
  });

  it('cannot depend on a local composable', () => {
    class PaginatedStore extends GlobalStore {
      static dependencies = { pagination: PaginationComposable };
    }
    expect(() => PaginatedStore.use()).toThrow(
      'PaginatedStore cannot depend on PaginationComposable',
    );
  });

  it('requires a stamped composable id', () => {
    const Unstamped = new Function('Base', 'return class extends Base {}')(GlobalStore);
    expect(() => Unstamped.use()).toThrow('extend GlobalStore directly');
  });

  describe('like ComposableBase', () => {
    it('exposes fields and getters as refs and methods as functions', () => {
      const { count, doubled, increment } = CounterStore.use();
      increment();
      expect(count.value).toBe(1);
      expect(doubled.value).toBe(2);
    });

    it('keeps underscored members from consumers', () => {
      expect(CounterStore.use()).not.toHaveProperty('_secret');
    });

    it('lets consumers write a getter that has a setter', () => {
      const { label, count } = CounterStore.use();
      label.value = 'count 7';
      expect(count.value).toBe(7);
    });

    it('routes calls between methods through the exposed methods', () => {
      const { incrementTwice, increment } = CounterStore.use();
      incrementTwice();
      expect(increment).toHaveBeenCalledTimes(2);
    });
  });
});

describe('composable testing helpers', () => {
  it('stubs methods and records their calls', () => {
    const { load } = StubbedStore.use();
    expect(load()).toBeUndefined();
    expect(load).toHaveBeenCalled();
  });

  it('sets refs and overrides computed values', () => {
    StubbedStore.mock({ items: ['a'] });
    expect(StubbedStore.use().size.value).toBe(1);
    StubbedStore.mock({ size: 10 });
    expect(StubbedStore.use().size.value).toBe(10);
  });

  it('clears ref and computed overrides after each test', () => {
    expect(StubbedStore.use().size.value).toBe(0);
  });

  it('resets refs between tests without replacing refs captured at import', () => {
    expect(capturedAtImport.count.value).toBe(0);
    capturedAtImport.increment();
    expect(CounterStore.use().count.value).toBe(1);
  });

  it('resets stores that have no methods', () => {
    class ConstantStore extends GlobalStore {
      value = 1;
    }
    expect(ConstantStore.use().value.value).toBe(1);
  });

  it('keeps watchers on composable-backed refs running after a reset', () => {
    PersistedStore.use().save('after reset');
    expect(persisted).toContain('after reset');
  });

  it('rejects names that are not refs or computed', () => {
    expect(() => StubbedStore.mock({ missing: 1 })).toThrow(
      'StubbedStore has no ref or computed named missing',
    );
  });

  it('applies refs set by tests to local composables created later', () => {
    PaginationComposable.mock({ page: 2 });
    const { container } = renderPagination(ref([1, 2, 3]));
    expect(container).toHaveTextContent('page 2 of 2');
  });

  it('refuses to mock or stub without kolibri-jest-config', () => {
    const { testing } = hooks;
    hooks.testing = null;
    try {
      expect(() => CounterStore.mock({ count: 1 })).toThrow('CounterStore.mock() is only');
      expect(() => CounterStore.stub()).toThrow('CounterStore.stub() is only');
    } finally {
      hooks.testing = testing;
    }
  });
});
