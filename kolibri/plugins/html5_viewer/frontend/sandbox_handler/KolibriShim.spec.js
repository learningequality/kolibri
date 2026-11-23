import Mediator from 'kolibri-sandbox/mediator';
import { events } from '../kolibriApiEvents';
import KolibriShim from './KolibriShim';

describe('window.kolibri', () => {
  const version = '0.19.0';
  let iframe, contentWindow, api, mediator, remote, shim;

  beforeEach(() => {
    iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    contentWindow = iframe.contentWindow;
    remote = { postMessage: jest.fn() };
    mediator = new Mediator(remote);
    shim = new KolibriShim(mediator);
    shim.initialize(contentWindow, { version });
    api = contentWindow.kolibri;
  });

  afterEach(() => {
    shim.destroy();
    mediator.destroy();
    iframe.remove();
  });

  it('exposes only the content API and the supplied version', () => {
    expect(Object.keys(api).sort()).toEqual([
      'contentNode',
      'dependencyUrl',
      'navigateTo',
      'requestData',
      'version',
    ]);
    expect(Object.keys(api.contentNode).sort()).toEqual(['list', 'retrieve', 'tree']);
    expect(api.version).toBe(version);
  });

  it.each([
    [
      events.LIST,
      { params: { max_results: 20, parent: 'self' } },
      { more: null, results: [], labels: {} },
    ],
    [events.RETRIEVE, { id: 'self', params: { fields: 'id' } }, { id: 'node' }],
    [events.TREE, { id: 'topic', params: { kind_in: 'video' } }, { id: 'topic', children: [] }],
    [events.NAVIGATE_TO, { nodeId: 'node' }, undefined],
    [events.REQUEST_DATA, undefined, null],
    [events.DEPENDENCY_URL, { path: 'runtime/index.js' }, '/zipcontent/dep/runtime/index.js'],
  ])('%s forwards arguments and returns the answer', async (event, data, result) => {
    const iframeParams = data?.params && Object.assign(new contentWindow.Object(), data.params);
    const calls = {
      [events.LIST]: () => api.contentNode.list(iframeParams),
      [events.RETRIEVE]: () => api.contentNode.retrieve(data.id, iframeParams),
      [events.TREE]: () => api.contentNode.tree(data.id, iframeParams),
      [events.NAVIGATE_TO]: () => api.navigateTo(data.nodeId),
      [events.REQUEST_DATA]: () => api.requestData(),
      [events.DEPENDENCY_URL]: () => api.dependencyUrl(data.path),
    };
    const reply = calls[event]();
    expect(remote.postMessage).toHaveBeenCalledTimes(1);
    expect(remote.postMessage).toHaveBeenCalledWith({ nameSpace: 'kolibri', event, data }, '*', [
      expect.any(MessagePort),
    ]);
    remote.postMessage.mock.calls[0][2][0].postMessage({ result });
    await expect(reply).resolves.toEqual(result);
  });

  it('resolves file contents from dependencyUrl to an object URL in the content window', async () => {
    const objectUrl = 'blob:http://content.local/audio';
    // jsdom implements no URL.createObjectURL.
    contentWindow.URL.createObjectURL = jest.fn(() => objectUrl);
    const contents = new Blob(['audio'], { type: 'audio/mpeg' });
    const reply = api.dependencyUrl('audio-checksum.mp3');
    remote.postMessage.mock.calls[0][2][0].postMessage({ result: contents });

    await expect(reply).resolves.toBe(objectUrl);
  });

  it('rejects a call whose arguments cannot be sent, without throwing at the call site', async () => {
    remote.postMessage.mockImplementation(() => {
      throw new DOMException('Proxy object could not be cloned.', 'DataCloneError');
    });
    const params = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error('Inspection failed');
        },
      },
    );
    let reply;
    expect(() => {
      reply = api.contentNode.list(params);
    }).not.toThrow();
    await expect(reply).rejects.toBeInstanceOf(contentWindow.Error);
    await expect(reply).rejects.toMatchObject({ status: 400 });
  });

  it('rejects with an iframe Error carrying the reply status and message', async () => {
    expect(contentWindow.Error).not.toBe(Error);
    const reply = api.contentNode.retrieve('missing');
    remote.postMessage.mock.calls[0][2][0].postMessage({ error: 'Not found', status: 404 });

    await expect(reply).rejects.toBeInstanceOf(contentWindow.Error);
    await expect(reply).rejects.toMatchObject({ message: 'Not found', status: 404 });
  });
});
