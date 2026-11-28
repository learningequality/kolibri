import { TextEncoder, TextDecoder } from 'node:util';
import xhrMock from 'xhr-mock';
import client from 'kolibri/client';
import pluginData from 'kolibri-plugin-data';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { createZipBytes } from 'kolibri-zip';
import shimAnswers from '../kolibriApi';

jest.mock('kolibri/client');
jest.mock('kolibri-plugin-data');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const nodeId = 'node-id';
const caller = { contentNode: { id: nodeId } };

async function call(event, data, viewer = caller) {
  return shimAnswers.answers[event](data, viewer);
}

describe('Kolibri content API', () => {
  beforeEach(() => {
    client.__reset();
    pluginData.urls = {
      __zipContentUrl: '/zipcontent/',
      __zipContentOrigin: 'http://content.local',
      urls: {
        'kolibri:core:contentnode_list': [['api/content/contentnode/', []]],
        'kolibri:core:contentnode_detail': [['api/content/contentnode/%(pk)s/', ['pk']]],
        'kolibri:core:contentnode_tree_detail': [['api/content/contentnode_tree/%(pk)s/', ['pk']]],
      },
    };
  });

  describe('ContentNode answers', () => {
    it.each(['retrieve', 'tree'])('rejects an empty ID for %s', async action => {
      await expect(call(`contentNode.${action}`, { id: '' })).rejects.toMatchObject({
        status: 400,
      });
      expect(client).not.toHaveBeenCalled();
    });

    it('passes pagination params, results, labels and the next-page cursor through', async () => {
      const params = { max_results: 2, channel_id: 'another-channel', kind: ['video', 'audio'] };
      const more = { ...params, cursor: 'next-page' };
      const page = { more, results: [{ id: 'first-hit' }], labels: { topic: ['Science'] } };
      const nextPage = { more: null, results: [{ id: 'last-hit' }], labels: {} };
      client.mockResolvedValueOnce({ data: page }).mockResolvedValueOnce({ data: nextPage });

      const result = await call('contentNode.list', { params });
      expect(result).toEqual(page);
      await expect(call('contentNode.list', { params: result.more })).resolves.toEqual(nextPage);
      expect(client).toHaveBeenNthCalledWith(1, {
        url: '/api/content/contentnode/',
        method: 'GET',
        params,
      });
      expect(client).toHaveBeenNthCalledWith(2, {
        url: '/api/content/contentnode/',
        method: 'GET',
        params: more,
      });
      expect(ContentNodeResource.cache).not.toHaveProperty('first-hit');
    });

    it('passes through the bare array when no page size is requested', async () => {
      const params = { kind: 'topic' };
      const nodes = [{ id: 'list-hit' }];
      client.__setPayload(nodes);
      await expect(call('contentNode.list', { params })).resolves.toEqual(nodes);
      expect(client).toHaveBeenCalledWith({
        url: '/api/content/contentnode/',
        method: 'GET',
        params,
      });
      expect(ContentNodeResource.cache).not.toHaveProperty('list-hit');
    });

    it('sends an over-limit page size unchanged and returns the endpoint status on an Error', async () => {
      const params = { max_results: 101 };
      client.mockRejectedValueOnce({ message: 'Bad Request', response: { status: 400 } });
      const error = await call('contentNode.list', { params }).catch(error => error);
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({ status: 400 });
      expect(client).toHaveBeenCalledWith({
        url: '/api/content/contentnode/',
        method: 'GET',
        params,
      });
    });

    it('retrieves the same node again when params differ, without using or updating the cache', async () => {
      const id = 'retrieve-hit';
      const cached = { id, title: 'Cached title' };
      const first = { id, title: 'First title' };
      const second = { id, title: 'Second title' };
      ContentNodeResource.cache[id] = cached;
      client.mockResolvedValueOnce({ data: first }).mockResolvedValueOnce({ data: second });
      try {
        await expect(call('contentNode.retrieve', { id, params: { lang: 'en' } })).resolves.toEqual(
          first,
        );
        await expect(call('contentNode.retrieve', { id, params: { lang: 'es' } })).resolves.toEqual(
          second,
        );
        expect(client.mock.calls.map(([request]) => request)).toEqual([
          { url: `/api/content/contentnode/${id}/`, method: 'GET', params: { lang: 'en' } },
          { url: `/api/content/contentnode/${id}/`, method: 'GET', params: { lang: 'es' } },
        ]);
        expect(ContentNodeResource.cache[id]).toEqual({ id, title: 'Cached title' });
      } finally {
        delete ContentNodeResource.cache[id];
      }
    });

    it('uses the tree endpoint, substitutes self and leaves the original params intact', async () => {
      const params = { descendant_of: 'self', depth: 2 };
      const tree = { id: 'tree-hit', children: { results: [{ id: 'child' }] } };
      client.__setPayload(tree);
      await expect(call('contentNode.tree', { id: 'self', params })).resolves.toEqual(tree);
      expect(client).toHaveBeenCalledWith({
        url: `/api/content/contentnode_tree/${nodeId}/`,
        method: 'GET',
        params: { descendant_of: nodeId, depth: 2 },
      });
      expect(params.descendant_of).toBe('self');
      expect(ContentNodeResource.cache).not.toHaveProperty('tree-hit');
    });

    it('preserves a literal self search while resolving the parent', async () => {
      await call('contentNode.list', { params: { search: 'self', parent: 'self' } });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ params: { search: 'self', parent: nodeId } }),
      );
    });

    it('resolves self inside a list of IDs', async () => {
      await call('contentNode.list', { params: { ids: ['self', 'other-id'] } });
      expect(client).toHaveBeenCalledWith(
        expect.objectContaining({ params: { ids: [nodeId, 'other-id'] } }),
      );
    });

    describe('for a node browsed on a remote device', () => {
      const baseurl = 'http://peer.local:8000/';
      const remoteCaller = {
        contentNode: { id: nodeId },
        files: [
          { checksum: 'b'.repeat(32), extension: 'mp3', available: false, storage_url: null },
          {
            checksum: 'a'.repeat(32),
            extension: 'zip',
            storage_url: `/content/storage/a/a/${'a'.repeat(32)}.zip?baseurl=${baseurl}`,
          },
        ],
      };

      it.each([
        ['contentNode.retrieve', { id: 'self' }, `/api/content/contentnode/${nodeId}/`, {}],
        ['contentNode.tree', { id: 'self' }, `/api/content/contentnode_tree/${nodeId}/`, {}],
        [
          'contentNode.list',
          { params: { parent: 'self', baseurl: 'http://elsewhere/' } },
          '/api/content/contentnode/',
          { parent: nodeId },
        ],
      ])('asks that device for %s', async (event, data, url, params) => {
        await call(event, data, remoteCaller);
        expect(client).toHaveBeenCalledWith({ url, method: 'GET', params: { ...params, baseurl } });
      });

      it('checks a navigation target on that device', async () => {
        const id = 'remote-target';
        const emit = jest.fn();
        client.__setPayload({ id });
        try {
          await call(
            'navigateTo',
            { nodeId: id },
            { ...remoteCaller, emit, hasListener: () => true },
          );
          expect(client).toHaveBeenCalledWith({
            url: `/api/content/contentnode/${id}/`,
            method: 'GET',
            params: { baseurl },
          });
          expect(emit).toHaveBeenCalledWith('navigateTo', { nodeId: id });
        } finally {
          delete ContentNodeResource.cache[id];
        }
      });
    });

    it('maps a network failure to status 500', async () => {
      client.mockRejectedValueOnce({ message: 'Network error', response: { status: 0 } });
      await expect(call('contentNode.list')).rejects.toMatchObject({ status: 500 });
    });

    it.each(['parent', 'related', 'prerequisite_for', 'has_prerequisite'])(
      'resolves a list %s from the calling node',
      async key => {
        await call('contentNode.list', { params: { [key]: 'self' } });
        expect(client).toHaveBeenCalledWith({
          url: '/api/content/contentnode/',
          method: 'GET',
          params: { [key]: nodeId },
        });
      },
    );

    it.each([
      ['contentNode.list', { params: { parent: 'self' } }],
      ['contentNode.retrieve', { id: 'self' }],
    ])('rejects self without a calling node for %s', async (event, data) => {
      await expect(call(event, data, { contentNode: null })).rejects.toMatchObject({ status: 400 });
      expect(client).not.toHaveBeenCalled();
    });

    it.each([
      ['contentNode.retrieve', { id: 42 }],
      ['contentNode.tree', { id: '..' }],
      ['contentNode.tree', { id: nodeId, params: [] }],
      ['contentNode.list', { params: 'not params' }],
      ['navigateTo', { nodeId: 42 }],
      ['navigateTo', { nodeId: '../facility' }],
      ['dependencyUrl', { path: 42 }],
    ])('rejects invalid arguments to %s before making requests', async (event, data) => {
      await expect(call(event, data)).rejects.toMatchObject({ status: 400 });
      expect(client).not.toHaveBeenCalled();
    });
  });

  describe('host answers', () => {
    it('emits a navigation request when the host listens', async () => {
      const emit = jest.fn();
      const hasListener = event => event === 'navigateTo';
      await call('navigateTo', { nodeId }, { emit, hasListener });
      expect(emit).toHaveBeenCalledWith('navigateTo', { nodeId });
    });

    it('rejects navigation to a missing node with the endpoint status', async () => {
      const emit = jest.fn();
      const hasListener = event => event === 'navigateTo';
      client.mockRejectedValueOnce({ message: 'Not found', response: { status: 404 } });
      await expect(call('navigateTo', { nodeId }, { emit, hasListener })).rejects.toMatchObject({
        status: 404,
      });
      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects navigation when there is no host listener', async () => {
      const hasListener = () => false;
      await expect(call('navigateTo', { nodeId }, { hasListener })).rejects.toMatchObject({
        status: 501,
      });
      expect(client).not.toHaveBeenCalled();
    });

    it.each([{ program: 'line(0, 0, 5, 5)' }, false, null])(
      'returns host data %p',
      async hostData => {
        await expect(call('requestData', undefined, { hostData })).resolves.toEqual(hostData);
      },
    );

    it('returns null without host data', async () => {
      await expect(call('requestData')).resolves.toBeNull();
    });
  });

  it('loads where the browser has no TransformStream', () => {
    const { TransformStream } = globalThis;
    delete globalThis.TransformStream;
    try {
      jest.isolateModules(() => {
        jest.doMock('kolibri-common/apiResources/ContentNodeResource', () => ContentNodeResource);
        expect(() => require('../kolibriApi')).not.toThrow();
      });
    } finally {
      globalThis.TransformStream = TransformStream;
    }
  });

  describe('dependencyUrl answers', () => {
    beforeEach(() => xhrMock.setup());
    afterEach(() => xhrMock.teardown());

    function dependency(checksum) {
      return {
        available: true,
        preset: 'html5_dependency',
        checksum,
        extension: 'zip',
        storage_url: `/content/${checksum}.zip`,
      };
    }

    async function serveZip(file, entries) {
      const bytes = await createZipBytes(entries);
      const respond = jest.fn((request, response) => {
        const range = request.header('Range');
        if (!range) {
          return response
            .status(200)
            .header('Content-Length', String(bytes.length))
            .body(bytes.buffer);
        }
        const [start, end] = range.replace('bytes=', '').split('-').map(Number);
        const chunk = bytes.slice(start, end + 1);
        return response
          .status(206)
          .header('Content-Range', `bytes ${start}-${end}/${bytes.length}`)
          .header('Content-Length', String(chunk.length))
          .body(chunk.buffer);
      });
      xhrMock.get(new URL(file.storage_url, window.location.href).href, respond);
      return respond;
    }

    it('matches a checksum before making any ZIP requests and returns its contents', async () => {
      const zip = dependency('direct-file-zip');
      const respond = await serveZip(zip, { 'other.js': 'other' });
      const audio = {
        available: true,
        checksum: 'audio-checksum',
        extension: 'mp3',
        storage_url: '/kolibri/content/storage/a/u/audio-checksum.mp3',
      };
      const contents = new Blob(['audio'], { type: 'audio/mpeg' });
      client.mockResolvedValueOnce({ data: contents });
      const path = 'audio-checksum.mp3';
      await expect(call('dependencyUrl', { path }, { files: [zip, audio] })).resolves.toBe(
        contents,
      );
      expect(client).toHaveBeenCalledWith({
        url: new URL(audio.storage_url, window.location.href).href,
        responseType: 'blob',
      });
      expect(respond).not.toHaveBeenCalled();
    });

    it('rejects with the storage status when a checksum match cannot be fetched', async () => {
      const audio = {
        available: true,
        checksum: 'missing-audio',
        extension: 'mp3',
        storage_url: '/kolibri/content/storage/m/i/missing-audio.mp3',
      };
      client.mockRejectedValueOnce({ message: 'Not Found', response: { status: 404 } });
      await expect(
        call('dependencyUrl', { path: 'missing-audio.mp3' }, { files: [audio] }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('lists a dependency again after its listing failed', async () => {
      const flaky = dependency('flaky-dependency');
      let fail = true;
      xhrMock.get(new URL(flaky.storage_url, window.location.href).href, (request, response) =>
        fail ? response.status(500) : undefined,
      );
      await serveZip(flaky, { 'runtime.js': 'runtime' });
      const viewer = { files: [flaky] };

      await expect(call('dependencyUrl', { path: 'runtime.js' }, viewer)).rejects.toMatchObject({
        status: 502,
      });
      fail = false;
      await expect(call('dependencyUrl', { path: 'runtime.js' }, viewer)).resolves.toBe(
        'http://content.local/zipcontent/flaky-dependency.zip/runtime.js',
      );
    });

    it('finds paths in order, skips unavailable ZIPs and reuses listings', async () => {
      const unavailable = { ...dependency('unavailable'), available: false, storage_url: null };
      const first = dependency('first-dependency');
      const second = dependency('second-dependency');
      const firstResponse = await serveZip(first, { 'shared.js': 'first' });
      const secondResponse = await serveZip(second, {
        'shared.js': 'second',
        'js/runtime.js': 'runtime',
      });
      const viewer = { files: [unavailable, first, second] };

      await expect(call('dependencyUrl', { path: 'js/runtime.js' }, viewer)).resolves.toBe(
        'http://content.local/zipcontent/second-dependency.zip/js/runtime.js',
      );
      expect(firstResponse).toHaveBeenCalled();
      expect(secondResponse).toHaveBeenCalled();
      firstResponse.mockClear();
      secondResponse.mockClear();

      await expect(call('dependencyUrl', { path: 'shared.js' }, viewer)).resolves.toBe(
        'http://content.local/zipcontent/first-dependency.zip/shared.js',
      );
      await expect(call('dependencyUrl', { path: 'js/runtime.js' }, viewer)).resolves.toBe(
        'http://content.local/zipcontent/second-dependency.zip/js/runtime.js',
      );
      expect(firstResponse).not.toHaveBeenCalled();
      expect(secondResponse).not.toHaveBeenCalled();
    });

    it('finds a member with URL delimiters after a failed dependency listing', async () => {
      const broken = dependency('broken-dependency');
      const valid = dependency('encoded-dependency');
      xhrMock.get(new URL(broken.storage_url, window.location.href).href, {
        status: 404,
      });
      await serveZip(valid, { 'js/lib#1?.js': 'runtime' });
      await expect(
        call('dependencyUrl', { path: 'js/lib#1?.js' }, { files: [broken, valid] }),
      ).resolves.toBe('http://content.local/zipcontent/encoded-dependency.zip/js/lib%231%3F.js');
    });

    it('rejects with 502 when no dependency matches and a listing failed', async () => {
      const broken = dependency('unlistable-dependency');
      xhrMock.get(new URL(broken.storage_url, window.location.href).href, { status: 500 });
      await expect(
        call('dependencyUrl', { path: 'runtime.js' }, { files: [broken] }),
      ).rejects.toMatchObject({ status: 502 });
    });

    it('rejects a path missing from all dependencies', async () => {
      const zip = dependency('missing-file-zip');
      await serveZip(zip, { 'runtime.js': 'runtime' });
      await expect(
        call('dependencyUrl', { path: 'missing.js' }, { files: [zip] }),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
