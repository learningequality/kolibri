import { render, screen, waitFor } from '@testing-library/vue';
import plugin_data from 'kolibri-plugin-data';
import coreApp from 'kolibri';
import Sandbox from 'kolibri-sandbox';
import { events, nameSpace, MessageStatuses } from 'kolibri-sandbox/base';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import { createTranslator } from 'kolibri/utils/i18n';
import CustomContentRenderer from '../CustomContentRenderer';

const { contentFrameTitle$, viewerNotAvailable$, channelLoadError$ } = createTranslator(
  CustomContentRenderer.name,
  CustomContentRenderer.$trs,
);

jest.mock('kolibri', () => ({
  __esModule: true,
  default: { getSandboxHandlerUrl: jest.fn() },
}));

jest.mock('kolibri-sandbox', () => {
  const handlers = {};
  const initialize = jest.fn();
  return {
    __esModule: true,
    default: jest.fn(() => ({
      on: (event, callback) => {
        handlers[event] = callback;
      },
      initialize,
      destroy: jest.fn(),
      mediator: { sendMessage: jest.fn(), sendLocalMessage: jest.fn() },
      __handlers: handlers,
    })),
  };
});

jest.mock('kolibri-common/apiResources/ContentNodeResource', () => ({
  __esModule: true,
  default: { list: jest.fn(), retrieve: jest.fn(), fetchRandomCollection: jest.fn() },
}));

jest.mock('kolibri-common/apiResources/ChannelResource', () => ({
  __esModule: true,
  default: { fetchFilterOptions: jest.fn() },
}));

jest.mock('kolibri-plugin-data');

jest.mock('../../../composables/useContentLink', () => ({
  __esModule: true,
  default: () => ({ genContentLinkBackLinkCurrentPage: jest.fn() }),
}));

const TOPIC = {
  id: 'topic-id',
  channel_id: 'channel-id',
  files: [
    {
      extension: 'zip',
      preset: 'html5_zip',
      checksum: 'abc123',
      storage_url: '/content/storage/a/b/abc123.zip',
    },
  ],
};

function renderComponent() {
  return render(CustomContentRenderer, {
    props: { topic: TOPIC },
    routes: [],
  });
}

describe('CustomContentRenderer', () => {
  beforeEach(() => {
    plugin_data.urls = {
      __sandboxUrl: '/sandbox/',
      __zipContentUrl: '/zipcontent/',
      __zipContentOrigin: 'http://localhost',
      __zipContentPort: '8001',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sandbox iframe when a handler is registered for the preset', () => {
    coreApp.getSandboxHandlerUrl.mockImplementation(preset =>
      preset === 'html5_zip' ? '/static/handler.js' : null,
    );

    renderComponent();

    expect(screen.getByTitle(contentFrameTitle$())).toBeInTheDocument();
    expect(Sandbox).toHaveBeenCalled();
    expect(Sandbox.mock.results[0].value.initialize).toHaveBeenCalledWith(
      {},
      {},
      'http://localhost:8001/zipcontent/abc123.zip/index.html',
      TOPIC.files[0].checksum,
      { handlerUrl: '/static/handler.js' },
    );
  });

  it('reports that no viewer is available when the preset has no registered handler', async () => {
    coreApp.getSandboxHandlerUrl.mockReturnValue(null);

    renderComponent();

    expect(await screen.findByText(viewerNotAvailable$())).toBeInTheDocument();
    expect(Sandbox).not.toHaveBeenCalled();
  });

  it('reports an error when the sandbox fails to load the channel', async () => {
    coreApp.getSandboxHandlerUrl.mockReturnValue('/static/handler.js');

    renderComponent();
    Sandbox.mock.results[0].value.__handlers[events.ERROR](new Error('boom'));

    expect(await screen.findByText(channelLoadError$())).toBeInTheDocument();
  });

  it('keeps a loaded channel on screen when a later navigation inside it fails', async () => {
    // The sandbox reports every failed navigation in the content frame, so a broken
    // link followed inside the channel arrives as the same error as a failed load.
    coreApp.getSandboxHandlerUrl.mockReturnValue('/static/handler.js');

    renderComponent();
    const sandbox = Sandbox.mock.results[0].value;
    sandbox.__handlers[events.LOADING](false);
    sandbox.__handlers[events.ERROR]({ message: 'Not found', error: 'LOADING_ERROR' });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.queryByText(channelLoadError$())).not.toBeInTheDocument();
  });

  it('answers a data request on the channel over the sandbox transport', async () => {
    // Every window.kolibri.* call is a request/reply round trip, and the awaiting
    // half lives in the iframe - a reply sent locally would hang it forever.
    coreApp.getSandboxHandlerUrl.mockReturnValue('/static/handler.js');
    ContentNodeResource.list.mockResolvedValue({ more: null, results: [{ id: 'node-id' }] });

    renderComponent();
    const sandbox = Sandbox.mock.results[0].value;

    sandbox.__handlers[events.COLLECTIONREQUESTED]({ message_id: 'msg-1', options: {} });

    await waitFor(() => expect(sandbox.mediator.sendMessage).toHaveBeenCalled());
    expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
      nameSpace,
      event: events.DATARETURNED,
      data: {
        message_id: 'msg-1',
        type: 'response',
        data: { maxResults: 50, more: null, results: [{ id: 'node-id' }] },
        err: null,
        status: MessageStatuses.SUCCESS,
      },
    });
  });

  it.each([
    [events.COLLECTIONPAGEREQUESTED, { options: {} }],
    [events.MODELREQUESTED, { id: 'node-id' }],
    [events.SEARCHRESULTREQUESTED, { options: { keyword: 'maths' } }],
    [events.NAVIGATETO, { nodeId: 'missing-node-id' }],
    [events.CONTEXT, {}],
    [events.THEMECHANGED, {}],
    [events.KOLIBRIVERSIONREQUESTED, {}],
    [events.CHANNELMETADATAREQUESTED, {}],
    [events.CHANNELFILTEROPTIONSREQUESTED, {}],
    [events.RANDOMCOLLECTIONREQUESTED, { options: {} }],
  ])('answers a %s request over the sandbox transport', async (event, request) => {
    coreApp.getSandboxHandlerUrl.mockReturnValue('/static/handler.js');
    ContentNodeResource.list.mockResolvedValue({ more: null, results: [] });
    ContentNodeResource.retrieve.mockImplementation(id =>
      Promise.resolve(id === 'node-id' ? { id } : null),
    );
    ContentNodeResource.fetchRandomCollection.mockResolvedValue({ results: [] });
    ChannelResource.fetchFilterOptions.mockResolvedValue({});

    renderComponent();
    const sandbox = Sandbox.mock.results[0].value;

    sandbox.__handlers[event]({ message_id: 'msg-1', ...request });

    await waitFor(() =>
      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          nameSpace,
          event: events.DATARETURNED,
          data: expect.objectContaining({ message_id: 'msg-1' }),
        }),
      ),
    );
  });

  it('tears the sandbox down when the channel is left', () => {
    coreApp.getSandboxHandlerUrl.mockReturnValue('/static/handler.js');

    const { unmount } = renderComponent();
    const sandbox = Sandbox.mock.results[0].value;
    unmount();

    expect(sandbox.destroy).toHaveBeenCalled();
  });
});
