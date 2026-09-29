import { isRef } from 'vue';
import { setupDevtoolsPlugin } from '@vue/devtools-api';
import urls from 'kolibri/urls';
import { isResolved } from './composableDependencies';
import { COMPOSABLE_ID, globalRecords, hooks } from './composableRuntime';

export const INSPECTOR_ID = 'kolibri-global-stores';
export const TIMELINE_LAYER_ID = 'kolibri-composable-methods';
export const REFRESH_DELAY = 100;

const TIMELINE_DEPTH = 3;

function timelineValue(value, depth = 0) {
  if (isRef(value)) {
    return timelineValue(value.value, depth);
  }
  if (value && value._isVue) {
    return `<${value.$options.name || 'component'}>`;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (depth >= TIMELINE_DEPTH) {
    return Array.isArray(value) ? `Array(${value.length})` : 'Object';
  }
  if (Array.isArray(value)) {
    return value.map(item => timelineValue(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, timelineValue(item, depth + 1)]),
  );
}

function label(record) {
  return record.Class.name || record.id || 'anonymous composable';
}

function dependencyValue(api, entry) {
  if (Object.hasOwn(entry.source, COMPOSABLE_ID)) {
    const nodeId = entry.source[COMPOSABLE_ID];
    return {
      _custom: {
        type: 'global-store',
        display: entry.source.name,
        readOnly: true,
        actions: [
          {
            icon: 'open_in_new',
            tooltip: 'Show in Global stores',
            action: () => api.selectInspectorNode(INSPECTOR_ID, nodeId),
          },
        ],
      },
    };
  }
  if (!isResolved(entry)) {
    return { _custom: { type: 'unresolved', display: 'not resolved yet', readOnly: true } };
  }
  return entry.value;
}

function sections(api, record) {
  const all = {
    refs: Object.entries(record.refs).map(([key, slot]) => ({
      key,
      value: slot.ref.value,
      editable: true,
    })),
    computed: Object.entries(record.computed).map(([key, entry]) => ({
      key,
      value: entry.ref.value,
      editable: entry.writable,
    })),
    methods: Object.entries(record.methods).map(([key, { definition }]) => ({
      key,
      value: definition,
    })),
    raw: Object.entries(record.raw).map(([key, value]) => ({ key, value })),
    dependencies: Object.entries(record.dependencies).map(([key, entry]) => ({
      key,
      value: dependencyValue(api, entry),
    })),
  };
  return Object.fromEntries(Object.entries(all).filter(([, entries]) => entries.length));
}

function componentSectionName(records, record) {
  const sameClass = records.filter(other => other.Class === record.Class);
  const suffix = sameClass.length > 1 ? ` #${sameClass.indexOf(record) + 1}` : '';
  return `${label(record)}${suffix}`;
}

export function installComposableDevtools(Vue) {
  const ownedRecords = new WeakMap();
  const componentStateTypes = [];
  let api = null;
  let registered = false;
  let refreshTimer = null;

  function refresh() {
    if (api && !refreshTimer) {
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.notifyComponentUpdate();
      }, REFRESH_DELAY);
    }
  }

  hooks.created.push(record => {
    if (record.owner) {
      const records = ownedRecords.get(record.owner) || [];
      records.push(record);
      ownedRecords.set(record.owner, records);
      const type = componentSectionName(records, record);
      if (!componentStateTypes.includes(type)) {
        componentStateTypes.push(type);
      }
    }
    refresh();
  });

  hooks.disposed.push(record => {
    if (record.owner) {
      const records = ownedRecords.get(record.owner) || [];
      ownedRecords.set(
        record.owner,
        records.filter(other => other !== record),
      );
    }
  });

  hooks.methodWrappers.push((record, key, run) => (...args) => {
    if (api) {
      api.addTimelineEvent({
        layerId: TIMELINE_LAYER_ID,
        event: {
          time: api.now(),
          title: `${label(record)}.${key}`,
          data: { args: args.map(arg => timelineValue(arg)) },
        },
      });
    }
    const result = run(...args);
    Promise.resolve(result).then(refresh, refresh);
    return result;
  });

  function setup(devtoolsApi) {
    api = devtoolsApi;
    api.addInspector({ id: INSPECTOR_ID, label: 'Global stores', icon: 'public' });
    api.addTimelineLayer({ id: TIMELINE_LAYER_ID, label: 'Composable methods', color: 0x0277bd });

    api.on.getInspectorTree(payload => {
      if (payload.inspectorId === INSPECTOR_ID) {
        payload.rootNodes = [...globalRecords.values()].map(record => ({
          id: record.id,
          label: label(record),
        }));
      }
    });

    api.on.getInspectorState(payload => {
      const record = payload.inspectorId === INSPECTOR_ID && globalRecords.get(payload.nodeId);
      if (record) {
        payload.state = sections(api, record);
      }
    });

    api.on.editInspectorState(payload => {
      const record = payload.inspectorId === INSPECTOR_ID && globalRecords.get(payload.nodeId);
      if (record) {
        payload.set(record.instance);
      }
    });

    api.on.inspectComponent(payload => {
      const records = ownedRecords.get(payload.componentInstance) || [];
      for (const record of records) {
        const type = componentSectionName(records, record);
        for (const [category, entries] of Object.entries(sections(api, record))) {
          payload.instanceData.state.push({
            type,
            key: category,
            value: Object.fromEntries(entries.map(({ key, value }) => [key, value])),
            editable: category === 'refs',
          });
        }
      }
    });

    api.on.editComponentState(payload => {
      const records = ownedRecords.get(payload.componentInstance) || [];
      const record = records.find(other => componentSectionName(records, other) === payload.type);
      if (record && payload.path[0] === 'refs') {
        payload.set(record.instance, payload.path.slice(1));
      }
    });
  }

  Vue.mixin({
    beforeCreate() {
      if (!registered && this.$root === this && this.$options.router) {
        registered = true;
        setupDevtoolsPlugin(
          {
            id: 'org.learningequality.kolibri.composables',
            label: 'Kolibri composables',
            packageName: 'kolibri',
            homepage: 'https://github.com/learningequality/kolibri',
            logo: new URL(
              urls.static('assets/default_theme/kolibri-logo.svg'),
              window.location.href,
            ).href,
            componentStateTypes,
            app: this,
          },
          setup,
        );
      }
    },
  });
}
