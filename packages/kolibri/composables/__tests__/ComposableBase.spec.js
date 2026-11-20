import {
  computed,
  getCurrentInstance,
  inject,
  isRef,
  markRaw,
  nextTick,
  onUnmounted,
  reactive,
  readonly,
  ref,
  shallowReactive,
  watch,
} from 'vue';
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

const setupOrder = [];
const dependencySetupSource = ref(0);
let initWatchRuns = 0;

class OrderedComposable extends ComposableBase {
  static dependencies = {
    selection: () => {
      setupOrder.push('dependency');
      dependencySetupSource.value;
      return { facilityId: ref('facility-1') };
    },
  };

  init() {
    setupOrder.push('init');
    watch(() => {
      initWatchRuns++;
      return this.selection.facilityId;
    }, this.fetch);
  }

  fetch() {}
}

function useComponentOnly() {
  if (!getCurrentInstance()) {
    throw new Error('useComponentOnly() needs a component');
  }
  return ref('from component');
}

class ComponentBoundComposable extends ComposableBase {
  label = useComponentOnly();
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

  it('resolves dependencies before init, outside the watchers init creates', async () => {
    setupOrder.length = 0;
    initWatchRuns = 0;
    renderInComponent(() => OrderedComposable.use());
    expect(setupOrder).toEqual(['dependency', 'init']);
    dependencySetupSource.value++;
    await nextTick();
    expect(initWatchRuns).toBe(1);
  });

  it('rejects fields that init assigns without declaring them', () => {
    class Undeclared extends ComposableBase {
      init() {
        this.undeclared = 1;
      }
    }
    expect(() => Undeclared.use()).toThrow(TypeError);
  });

  it('rejects init replacing a method', () => {
    class Replacing extends ComposableBase {
      onChange = () => {};

      init() {
        this.onChange = () => {};
      }
    }
    expect(() => Replacing.use()).toThrow(TypeError);
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

  describe('with dependencies of each result kind', () => {
    const focused = ref(false);
    const panelOpen = ref(false);
    const route = shallowReactive({ path: '/a' });
    const rawCache = markRaw({ items: [] });
    const settings = readonly({ theme: 'dark' });

    class Router {
      push() {
        return 'pushed';
      }
    }

    class Dependent extends ComposableBase {
      static dependencies = {
        focused: () => focused,
        unfocused: () => computed(() => !focused.value),
        router: () => new Router(),
        nothing: () => undefined,
        route: () => route,
        status: () => ({ ready: computed(() => true) }),
        panel: () => ({ open: panelOpen }),
        cache: () => rawCache,
        settings: () => settings,
      };

      dependencyIs(key, value) {
        return this[key] === value;
      }

      openPanel() {
        this.panel.open = true;
      }

      addToStatus() {
        this.status.extra = true;
      }

      isRoute(value) {
        return this.route === value;
      }

      navigate(path) {
        this.route.path = path;
      }

      setNotReady() {
        this.status.ready = false;
      }

      get state() {
        return {
          focused: this.focused,
          unfocused: this.unfocused,
          pushed: this.router.push(),
          nothing: this.nothing,
        };
      }

      focus() {
        this.focused = true;
      }

      replaceRouter() {
        this.router = new Router();
      }

      setUnfocused() {
        this.unfocused = true;
      }
    }

    beforeEach(() => {
      focused.value = false;
      panelOpen.value = false;
    });

    it('unwraps refs and computed refs, and passes other values through', () => {
      const dependent = Dependent.use();
      expect(dependent.state.value).toEqual({
        focused: false,
        unfocused: true,
        pushed: 'pushed',
        nothing: undefined,
      });
      dependent.focus();
      expect(focused.value).toBe(true);
      expect(dependent.state.value).toEqual({
        focused: true,
        unfocused: false,
        pushed: 'pushed',
        nothing: undefined,
      });
    });

    it('rejects assigning to a dependency that is not a writable ref', () => {
      const dependent = Dependent.use();
      expect(() => dependent.replaceRouter()).toThrow(TypeError);
      expect(() => dependent.setUnfocused()).toThrow(TypeError);
      expect(() => dependent.setNotReady()).toThrow(TypeError);
      expect(() => dependent.addToStatus()).toThrow(TypeError);
    });

    it('writes a writable ref inside a plain object dependency', () => {
      Dependent.use().openPanel();
      expect(panelOpen.value).toBe(true);
    });

    it('passes a reactive dependency through as it is', () => {
      const dependent = Dependent.use();
      expect(dependent.isRoute(route)).toBe(true);
      dependent.navigate('/b');
      expect(route.path).toBe('/b');
    });

    it('passes markRaw and readonly dependencies through as they are', () => {
      const dependent = Dependent.use();
      expect(dependent.dependencyIs('cache', rawCache)).toBe(true);
      expect(dependent.dependencyIs('settings', settings)).toBe(true);
    });
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

let lazilyStubbedInits = 0;

class LazilyStubbedStore extends GlobalStore {
  init() {
    lazilyStubbedInits++;
  }

  load() {
    return 'real';
  }
}

LazilyStubbedStore.stub();
const lazilyStubbedInitsAtImport = lazilyStubbedInits;

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

class InitializedStore extends GlobalStore {
  label = 'declared';

  init() {
    this.label = 'from init';
  }
}

const watchedCounts = [];

class WatchingStore extends GlobalStore {
  count = 0;

  init() {
    watch(
      () => this.count,
      count => watchedCounts.push(count),
      { flush: 'sync' },
    );
    this.load();
  }

  load() {}
}

class CacheStore extends GlobalStore {
  cache = markRaw(new Map());
  source = markRaw({ name: 'declared' });

  init() {
    this.source = markRaw({ name: 'init' });
  }
}

const dependencySource = ref(0);
const dependencyWatchCalls = [];

class DependencyWatchingStore extends GlobalStore {
  static dependencies = {
    watcher: () => {
      watch(dependencySource, value => dependencyWatchCalls.push(value), { flush: 'sync' });
    },
  };

  resolve() {
    return this.watcher;
  }
}

const fieldWatchSource = ref(0);
const fieldWatchRecorded = [];

function useSourceWatcher(callback) {
  watch(fieldWatchSource, callback, { flush: 'sync' });
  return null;
}

class FieldWatchingStore extends GlobalStore {
  _watcher = useSourceWatcher(value => this.record(value));

  record(value) {
    fieldWatchRecorded.push(value);
  }
}

let latestFieldReader;

function useFieldReader(read) {
  latestFieldReader = read;
  return null;
}

class FieldReadingStore extends GlobalStore {
  static dependencies = { user: () => ({ id: ref('user-1') }) };

  count = 1;
  _reader = useFieldReader(() => ({
    user: this.user.id,
    doubled: this.doubled,
    count: this.count,
  }));

  get doubled() {
    return this.count * 2;
  }
}

let latestFieldWriters;

function useFieldWriters(writers) {
  latestFieldWriters = writers;
  return null;
}

class FieldWritingStore extends GlobalStore {
  cache = markRaw({ source: 'declared' });
  _writers = useFieldWriters({
    replaceCache: () => {
      this.cache = markRaw({ source: 'replaced' });
    },
    writeUndeclared: () => {
      this.undeclared = 1;
    },
  });
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

  it('keeps one consumer from changing the shared object every consumer gets', () => {
    expect(() => {
      CounterStore.use().extra = 1;
    }).toThrow(TypeError);
    reactive(CounterStore.use());
    expect(isRef(CounterStore.use().count)).toBe(true);
  });

  it('rejects a dependency named like one of its members', () => {
    class ShadowingStore extends GlobalStore {
      static dependencies = { counter: CounterStore };

      get counter() {
        return 0;
      }
    }
    expect(() => ShadowingStore.use()).toThrow(
      'ShadowingStore has a dependency and a member both named counter',
    );
  });

  it('rejects stores whose init uses each other', () => {
    class CycleAStore extends GlobalStore {
      static dependencies = { other: () => CycleBStore.use() };

      init() {
        this.other;
      }
    }
    class CycleBStore extends GlobalStore {
      static dependencies = { other: () => CycleAStore.use() };

      init() {
        this.other;
      }
    }
    expect(() => CycleAStore.use()).toThrow(
      'Circular init dependency: CycleAStore -> CycleBStore -> CycleAStore',
    );
  });

  it('stops the effects of a function dependency that throws', () => {
    const source = ref(0);
    const calls = [];
    class FailingStore extends GlobalStore {
      static dependencies = {
        failing: () => {
          watch(source, value => calls.push(value), { flush: 'sync' });
          throw new Error('cannot resolve');
        },
      };

      read() {
        return this.failing;
      }
    }
    const store = FailingStore.use();
    expect(() => store.read()).toThrow('cannot resolve');
    expect(() => store.read()).toThrow('cannot resolve');
    source.value = 1;
    expect(calls).toEqual([]);
  });

  it('rejects arguments to use(), since there is one instance to receive them', () => {
    expect(() => CounterStore.use(1)).toThrow(
      'CounterStore.use() takes no arguments: global stores have one instance',
    );
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

  describe('with a function dependency resolved before the test', () => {
    beforeAll(() => {
      userSource.mockReturnValue({ isSuperuser: ref(false) });
      TodoStore.use().canAdd.value;
    });

    it('re-resolves it in each test', () => {
      userSource.mockReturnValue({ isSuperuser: ref(true) });
      expect(TodoStore.use().canAdd.value).toBe(true);
    });
  });

  it('cannot depend on a local composable', () => {
    class PaginatedStore extends GlobalStore {
      static dependencies = { pagination: PaginationComposable };
    }
    expect(() => PaginatedStore.use()).toThrow(
      'PaginatedStore cannot depend on PaginationComposable',
    );
  });

  it('cannot depend on a local composable through its use function', () => {
    class PaginatedByUseStore extends GlobalStore {
      static dependencies = { pagination: PaginationComposable.use };
    }
    expect(() => PaginatedByUseStore.use()).toThrow(
      'PaginatedByUseStore cannot depend on PaginationComposable',
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

  it('stubs a store without building it', () => {
    expect(lazilyStubbedInitsAtImport).toBe(0);
    expect(LazilyStubbedStore.use().load()).toBeUndefined();
  });

  it('sets refs and overrides computed values', () => {
    StubbedStore.mock({ items: ['a'] });
    expect(StubbedStore.use().size.value).toBe(1);
    StubbedStore.mock({ size: 10 });
    expect(StubbedStore.use().size.value).toBe(10);
  });

  describe('a computed override', () => {
    it('applies to the test that sets it', () => {
      StubbedStore.mock({ size: 10 });
      expect(StubbedStore.use().size.value).toBe(10);
    });

    it('is cleared before the next test', () => {
      expect(StubbedStore.use().size.value).toBe(0);
    });
  });

  it('starts a store from the values its init assigns', () => {
    expect(InitializedStore.use().label.value).toBe('from init');
  });

  it('runs init effects once, on the instance tests spy on', () => {
    watchedCounts.length = 0;
    const { count, load } = WatchingStore.use();
    count.value += 1;
    expect(watchedCounts).toEqual([count.value]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('exposes markRaw fields that init reassigns', () => {
    expect(CacheStore.use().source).toEqual({ name: 'init' });
  });

  it('runs the effects of a function dependency once', () => {
    dependencyWatchCalls.length = 0;
    DependencyWatchingStore.use().resolve();
    dependencySource.value += 1;
    expect(dependencyWatchCalls).toEqual([dependencySource.value]);
  });

  describe('after a reset', () => {
    beforeAll(() => {
      StubbedStore.use().items.value = ['a'];
      capturedAtImport.count.value = 5;
      InitializedStore.use().label.value = 'changed';
      WatchingStore.use();
      CacheStore.use().cache.set('key', 1);
      DependencyWatchingStore.use().resolve();
      FieldWatchingStore.use();
      FieldReadingStore.use();
      FieldWritingStore.use();
    });

    it('restores refs, and computed values that depend on them', () => {
      expect(StubbedStore.use().items.value).toEqual([]);
      expect(StubbedStore.use().size.value).toBe(0);
    });

    it('restores refs without replacing refs captured at import', () => {
      expect(capturedAtImport.count.value).toBe(0);
      capturedAtImport.increment();
      expect(CounterStore.use().count.value).toBe(1);
    });

    it('restores the values its init assigns', () => {
      expect(InitializedStore.use().label.value).toBe('from init');
    });

    it('replaces init effects', () => {
      watchedCounts.length = 0;
      const { count, load } = WatchingStore.use();
      count.value += 1;
      expect(watchedCounts).toEqual([count.value]);
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('restores markRaw fields', () => {
      expect(CacheStore.use().cache.size).toBe(0);
    });

    it('replaces the effects of a function dependency', () => {
      dependencyWatchCalls.length = 0;
      DependencyWatchingStore.use().resolve();
      dependencySource.value += 1;
      expect(dependencyWatchCalls).toEqual([dependencySource.value]);
    });

    it('replaces field initializer effects, which call the methods tests spy on', () => {
      fieldWatchRecorded.length = 0;
      const { record } = FieldWatchingStore.use();
      fieldWatchSource.value += 1;
      expect(fieldWatchRecorded).toEqual([fieldWatchSource.value]);
      expect(record).toHaveBeenCalledTimes(1);
    });

    it('gives field initializers the live dependencies, getters and refs', () => {
      FieldReadingStore.mock({ doubled: 100 });
      FieldReadingStore.use().count.value = 5;
      expect(latestFieldReader()).toEqual({ user: 'user-1', doubled: 100, count: 5 });
    });

    it('lets field initializers reassign markRaw fields, and not undeclared ones', () => {
      latestFieldWriters.replaceCache();
      expect(FieldWritingStore.use().cache).toEqual({ source: 'replaced' });
      expect(() => latestFieldWriters.writeUndeclared()).toThrow(TypeError);
    });
  });

  it('resets stores without re-rendering components the test left mounted', async () => {
    StubbedStore.mock({ items: [{ name: 'first' }] });
    const { container } = renderInComponent(() => StubbedStore.use(), {
      template: '<p>{{ items[0].name }}</p>',
    });
    await nextTick();
    expect(container).toHaveTextContent('first');
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

  it('rejects names that are not refs or computed of a local composable with no instance', () => {
    expect(() => PaginationComposable.mock({ bogus: 1 })).toThrow(
      'PaginationComposable has no ref or computed named bogus',
    );
    expect(() => PaginationComposable.mock({ next: 1 })).toThrow(
      'PaginationComposable has no ref or computed named next',
    );
  });

  it('applies refs set by tests to local composables created later', () => {
    PaginationComposable.mock({ page: 2 });
    const { container } = renderPagination(ref([1, 2, 3]));
    expect(container).toHaveTextContent('page 2 of 2');
  });

  it('mocks a local composable whose fields need a component', () => {
    ComponentBoundComposable.mock({ label: 'mocked' });
    const { container } = renderInComponent(() => ComponentBoundComposable.use(), {
      template: '<p>{{ label }}</p>',
    });
    expect(container).toHaveTextContent('mocked');
  });

  it('checks mocked names against a live instance', () => {
    renderInComponent(() => ComponentBoundComposable.use());
    expect(() => ComponentBoundComposable.mock({ bogus: 1 })).toThrow(
      'ComponentBoundComposable has no ref or computed named bogus',
    );
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

  describe('outside a test', () => {
    const errors = [];

    beforeAll(() => {
      for (const mock of [
        () => CounterStore.mock({ count: 1 }),
        () => PaginationComposable.mock({ page: 2 }),
      ]) {
        try {
          mock();
        } catch (error) {
          errors.push(error.message);
        }
      }
    });

    it('refuses to mock, since the reset before each test would undo it', () => {
      expect(errors).toEqual([
        expect.stringContaining('CounterStore.mock() only applies inside a test'),
        expect.stringContaining('PaginationComposable.mock() only applies inside a test'),
      ]);
    });
  });
});
