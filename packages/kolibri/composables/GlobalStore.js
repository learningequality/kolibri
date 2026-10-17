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

export default class GlobalStore extends ComposableBase {
  static _use() {
    if (!Object.hasOwn(this, COMPOSABLE_ID)) {
      throw new Error(
        `${this.name} has no composable id: extend GlobalStore directly, in a .js file, so kolibri-build or kolibri-jest-config can stamp one`,
      );
    }
    const id = this[COMPOSABLE_ID];
    if (!globalRecords.has(id)) {
      assertStoreDependencies(this);
      const scope = effectScope(true);
      const record = scope.run(() => build(this, [], null));
      record.scope = scope;
      globalRecords.set(id, record);
    }
    return globalRecords.get(id).consumer;
  }
}
