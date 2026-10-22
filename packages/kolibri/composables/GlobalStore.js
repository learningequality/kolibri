import { effectScope } from 'vue';
import { COMPOSABLE_ID, ComposableBase, build, globalRecords } from './internal/composableRuntime';

function assertStoreDependencies(Store) {
  for (const source of Object.values(Store.dependencies || {})) {
    const Class = source.composableClass ?? source;
    if (Class.prototype instanceof ComposableBase && !(Class.prototype instanceof GlobalStore)) {
      throw new Error(
        `${Store.name} cannot depend on ${Class.name}: a global store's dependencies must be global stores or function composables`,
      );
    }
  }
}

const storesBeingBuilt = [];

function assertNotBuilding(Store) {
  const cycleStart = storesBeingBuilt.findIndex(
    other => other[COMPOSABLE_ID] === Store[COMPOSABLE_ID],
  );
  if (cycleStart !== -1) {
    const cycle = [...storesBeingBuilt.slice(cycleStart), Store].map(other => other.name);
    throw new Error(`Circular init dependency: ${cycle.join(' -> ')}`);
  }
}

/**
 * A composable with one instance per class, shared across plugin bundles.
 *
 * The instance is keyed by its package-relative path and class name, so bundles built against
 * different versions of its package share it, with the shape of whichever bundle used it first.
 * Keep a store's fields, getters and methods compatible across versions of its package.
 *
 * Vue 2.7 binds lifecycle hooks, `inject` and watcher error handling to the current component, and
 * has no public API to unset it. A store first used in a component's `setup`, or a function
 * dependency first resolved there, binds those calls in its fields, `init` and function
 * dependencies to that component. Stores that make such calls should be used once at module scope.
 *
 * Dependencies resolve on first access, often inside a computed or render. Vue 2.7 has no public
 * API to pause dependency tracking, so reactive reads while a dependency resolves, including a
 * store dependency's field initializers and `init`, become dependencies of whichever computed or
 * render first accessed it.
 */
export default class GlobalStore extends ComposableBase {
  static _use(...args) {
    if (args.length) {
      throw new Error(`${this.name}.use() takes no arguments: global stores have one instance`);
    }
    if (!Object.hasOwn(this, COMPOSABLE_ID)) {
      throw new Error(
        `${this.name} has no composable id: extend GlobalStore directly, in a .js file, so kolibri-build or kolibri-jest-config can stamp one`,
      );
    }
    const id = this[COMPOSABLE_ID];
    if (!globalRecords.has(id)) {
      assertStoreDependencies(this);
      assertNotBuilding(this);
      storesBeingBuilt.push(this);
      const scope = effectScope(true);
      let record;
      try {
        record = scope.run(() => build(this, [], { owner: null }));
      } finally {
        storesBeingBuilt.pop();
        if (!record) {
          scope.stop();
        }
      }
      record.scope = scope;
      globalRecords.set(id, record);
    }
    return globalRecords.get(id).consumer;
  }
}
