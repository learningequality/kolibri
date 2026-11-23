import SandboxShim from 'kolibri-sandbox/SandboxShim';
import { events, nameSpace } from '../kolibriApiEvents';

export default class KolibriShim extends SandboxShim {
  static shimName = nameSpace;

  initialize(contentWindow, { version } = {}) {
    const ContentError = contentWindow.Error;
    const error = (message, status) => Object.assign(new ContentError(message), { status });
    const request = async (event, data) => {
      try {
        return await this.request(event, data);
      } catch ({ message, status }) {
        throw error(message, status);
      }
    };
    Object.defineProperty(contentWindow, this.nameSpace, {
      value: {
        version,
        contentNode: {
          list: params => request(events.LIST, { params }),
          retrieve: (id, params) => request(events.RETRIEVE, { id, params }),
          tree: (id, params) => request(events.TREE, { id, params }),
        },
        navigateTo: nodeId => request(events.NAVIGATE_TO, { nodeId }),
        requestData: () => request(events.REQUEST_DATA),
        dependencyUrl: async path => {
          const dependency = await request(events.DEPENDENCY_URL, { path });
          return typeof dependency === 'string'
            ? dependency
            : contentWindow.URL.createObjectURL(dependency);
        },
      },
      configurable: true,
    });
  }
}
