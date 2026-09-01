import { render, screen } from '@testing-library/vue';
import coreApp from 'kolibri';
import Sandbox from 'kolibri-sandbox';
import { events } from 'kolibri-sandbox/base';
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
      mediator: { sendMessage: jest.fn() },
      __handlers: handlers,
    })),
  };
});

jest.mock('kolibri/urls', () => ({
  __esModule: true,
  default: {
    sandbox: () => '/sandbox',
    zipContentUrl: () => '/zipcontent/index.html',
  },
}));

jest.mock('../../../composables/useContentLink', () => ({
  __esModule: true,
  default: () => ({ genContentLinkBackLinkCurrentPage: jest.fn() }),
}));

const TOPIC = {
  id: 'topic-id',
  channel_id: 'channel-id',
  files: [{ extension: 'zip', preset: 'html5_zip', checksum: 'abc123' }],
};

function renderComponent() {
  return render(CustomContentRenderer, {
    props: { topic: TOPIC },
    routes: [],
  });
}

describe('CustomContentRenderer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sandbox iframe when a handler is registered for the preset', () => {
    coreApp.getSandboxHandlerUrl.mockReturnValue('/static/handler.js');

    renderComponent();

    expect(screen.getByTitle(contentFrameTitle$())).toBeInTheDocument();
    expect(Sandbox).toHaveBeenCalled();
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
});
