import Vue, { computed, getCurrentInstance, markRaw, nextTick } from 'vue';
import { render } from '@testing-library/vue';
import urls from 'kolibri/urls';
import ComposableBase from '../ComposableBase';
import GlobalStore from '../GlobalStore';
import {
  INSPECTOR_ID,
  REFRESH_DELAY,
  TIMELINE_LAYER_ID,
  installComposableDevtools,
} from '../internal/composableDevtools';

jest.mock('kolibri/urls');

function createDevtoolsApi() {
  const handlers = {};
  const on = new Proxy(
    {},
    {
      get: (target, event) => handler => {
        handlers[event] = handler;
      },
    },
  );
  return {
    handlers,
    on,
    inspectors: [],
    layers: [],
    events: [],
    addInspector(inspector) {
      this.inspectors.push(inspector);
    },
    addTimelineLayer(layer) {
      this.layers.push(layer);
    },
    addTimelineEvent(event) {
      this.events.push(event);
    },
    now: () => 0,
    selectInspectorNode: jest.fn(),
    sendInspectorTree: jest.fn(),
    sendInspectorState: jest.fn(),
    notifyComponentUpdate: jest.fn(),
  };
}

const api = createDevtoolsApi();
const descriptors = [];
window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = {
  emit: (event, descriptor, setup) => {
    descriptors.push(descriptor);
    setup(api);
  },
};
installComposableDevtools(Vue);

class SessionStore extends GlobalStore {
  username = 'learner';

  get greeting() {
    return `Hello ${this.username}`;
  }

  rename(username) {
    this.username = username;
  }

  track() {}
}

class ProfileStore extends GlobalStore {
  static dependencies = { session: SessionStore, settings: () => ({ theme: 'dark' }) };

  _draft = '';
  options = markRaw({ compact: true });

  themeName() {
    return this.settings.theme;
  }
}

const SPEC = 'kolibri/composables/__tests__/composableDevtools.spec.js';

function inspectGlobalStore(name) {
  const payload = { inspectorId: INSPECTOR_ID, nodeId: `${SPEC}#${name}`, state: null };
  api.handlers.getInspectorState(payload);
  return payload.state;
}

class ToggleComposable extends ComposableBase {
  open = false;

  toggle() {
    this.open = !this.open;
  }
}

function editPayload(path, value) {
  return {
    path,
    set(target, targetPath = path) {
      const parent = targetPath.slice(0, -1).reduce((object, key) => object[key], target);
      parent[targetPath[targetPath.length - 1]] = value;
    },
  };
}

function renderWithToggle() {
  let toggle;
  let component;
  const { unmount } = render({
    setup() {
      toggle = ToggleComposable.use();
      component = getCurrentInstance().proxy;
      return {};
    },
    template: '<p>toggle</p>',
  });
  return { toggle, component, unmount };
}

describe('composable devtools plugin', () => {
  it('registers against the first root component with a router', () => {
    urls.__echoUrls();
    render({ template: '<p>no router</p>' });
    expect(descriptors).toHaveLength(0);
    render({ template: '<p>app</p>' }, { routes: [] });
    expect(descriptors[0].app.$root).toBe(descriptors[0].app);
    expect(descriptors[0].logo).toBe(
      'http://kolibri.time/static/assets/default_theme/kolibri-logo.svg',
    );
    expect(api.inspectors).toEqual([expect.objectContaining({ id: INSPECTOR_ID, icon: 'public' })]);
    expect(api.layers).toEqual([expect.objectContaining({ id: TIMELINE_LAYER_ID })]);
  });

  it('registers only once for later app roots', () => {
    render({ template: '<p>second app</p>' }, { routes: [] });
    expect(descriptors).toHaveLength(1);
  });

  it('lists global stores in the inspector tree', () => {
    SessionStore.use();
    const payload = { inspectorId: INSPECTOR_ID, rootNodes: [] };
    api.handlers.getInspectorTree(payload);
    expect(payload.rootNodes).toContainEqual({
      id: `${SPEC}#SessionStore`,
      label: 'SessionStore',
    });
  });

  it('shows and edits the refs, computed and methods of a global store', () => {
    api.handlers.editInspectorState({
      inspectorId: INSPECTOR_ID,
      nodeId: `${SPEC}#SessionStore`,
      ...editPayload(['username'], 'coach'),
    });
    expect(inspectGlobalStore('SessionStore')).toEqual({
      refs: [{ key: 'username', value: 'coach', editable: true }],
      computed: [{ key: 'greeting', value: 'Hello coach', editable: false }],
      methods: [
        { key: 'rename', value: SessionStore.prototype.rename },
        { key: 'track', value: SessionStore.prototype.track },
      ],
    });
  });

  it('shows private members, markRaw fields and dependencies', () => {
    ProfileStore.use();
    const { refs, raw, dependencies } = inspectGlobalStore('ProfileStore');
    expect(refs).toEqual([{ key: '_draft', value: '', editable: true }]);
    expect(raw).toEqual([{ key: 'options', value: { compact: true } }]);
    expect(dependencies).toEqual([
      { key: 'session', value: { _custom: expect.objectContaining({ display: 'SessionStore' }) } },
      {
        key: 'settings',
        value: { _custom: expect.objectContaining({ display: 'not resolved yet' }) },
      },
    ]);
  });

  it('shows the value of a resolved function dependency', () => {
    expect(ProfileStore.use().themeName()).toBe('dark');
    const { dependencies } = inspectGlobalStore('ProfileStore');
    expect(dependencies[1]).toEqual({ key: 'settings', value: { theme: 'dark' } });
  });

  it('jumps from a global store dependency to that store in the inspector', () => {
    ProfileStore.use();
    const { dependencies } = inspectGlobalStore('ProfileStore');
    dependencies[0].value._custom.actions[0].action();
    expect(api.selectInspectorNode).toHaveBeenCalledWith(INSPECTOR_ID, `${SPEC}#SessionStore`);
  });

  it('records method calls on the timeline', () => {
    SessionStore.use().rename('admin');
    expect(api.events).toContainEqual({
      layerId: TIMELINE_LAYER_ID,
      event: { time: 0, title: 'SessionStore.rename', data: { args: ['admin'] } },
    });
  });

  it('records refs by value, components by name, and deep values as summaries', () => {
    const component = new Vue({ name: 'SomePage' });
    const facilityId = computed(() => 'facility-1');
    SessionStore.use().track(facilityId, component, {
      filters: { ids: [facilityId], nested: { deeper: { deepest: true } } },
    });
    expect(api.events).toContainEqual({
      layerId: TIMELINE_LAYER_ID,
      event: {
        time: 0,
        title: 'SessionStore.track',
        data: {
          args: [
            'facility-1',
            '<SomePage>',
            { filters: { ids: ['facility-1'], nested: { deeper: 'Object' } } },
          ],
        },
      },
    });
  });

  it('batches devtools refreshes after a burst of method calls', async () => {
    const settle = () => new Promise(resolve => setTimeout(resolve, REFRESH_DELAY * 2));
    await settle();
    api.sendInspectorState.mockClear();
    const { rename } = SessionStore.use();
    rename('a');
    rename('b');
    rename('c');
    await settle();
    expect(api.sendInspectorState).toHaveBeenCalledTimes(1);
  });

  it('groups local composables by category in the panel of the component that created them', () => {
    const { toggle, component } = renderWithToggle();
    toggle.toggle();
    const payload = { componentInstance: component, instanceData: { state: [] } };
    api.handlers.inspectComponent(payload);
    expect(payload.instanceData.state).toEqual([
      { type: 'ToggleComposable', key: 'refs', value: { open: true }, editable: true },
      {
        type: 'ToggleComposable',
        key: 'methods',
        value: { toggle: ToggleComposable.prototype.toggle },
        editable: false,
      },
    ]);
  });

  it('edits local composable refs from the component panel', async () => {
    const { toggle, component } = renderWithToggle();
    api.handlers.editComponentState({
      componentInstance: component,
      type: 'ToggleComposable',
      ...editPayload(['refs', 'open'], true),
    });
    await nextTick();
    expect(toggle.open.value).toBe(true);
  });

  it('forgets local composables when their component unmounts', () => {
    const { component, unmount } = renderWithToggle();
    unmount();
    const payload = { componentInstance: component, instanceData: { state: [] } };
    api.handlers.inspectComponent(payload);
    expect(payload.instanceData.state).toEqual([]);
  });
});
