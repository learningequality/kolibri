import { h, ref } from 'vue';
import VueRouter from 'vue-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import pluginData from 'kolibri-plugin-data';
import coreApp from 'kolibri';
import client from 'kolibri/client';
import { error as appError } from 'kolibri/utils/appError';
import ContentViewer from 'kolibri/components/internal/ContentViewer';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useContentViewer from 'kolibri/composables/useContentViewer';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { PageNames } from '../../../constants';
import CustomContentRenderer from '../CustomContentRenderer';

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    presetViewerComponent: jest.fn(),
    elementViewerComponent: jest.fn(() => null),
  },
}));
jest.mock('kolibri/client');

const CONTENT_NODE_URL = '/api/content/contentnode/';
const TRACK_PROGRESS_URL = '/api/logger/trackprogress/';
const OPEN_TOPIC = 'Open topic';
const OPEN_FIRST_RESOURCE = 'Open first resource';
const OPEN_SECOND_RESOURCE = 'Open second resource';
const OPEN_MISSING_RESOURCE = 'Open missing resource';
const REPORT_HANDLER_ERROR = 'Report handler error';
const REPORT_LOADING_ERROR = 'Report loading error';
const START_TRACKING = 'Start tracking';
const FINISH_LOADING = 'Finish loading';
const THROW_ERROR = 'Throw error';

const TOPIC = {
  id: 'custom-topic',
  title: 'Custom topic',
  kind: 'topic',
  files: [
    {
      id: 'zip-file',
      preset: 'html5_zip',
      extension: 'zip',
      checksum: 'abc123',
      storage_url: '/content/storage/a/b/abc123.zip',
      file_size: 100,
      available: true,
      supplementary: false,
      thumbnail: false,
    },
  ],
};
const SUBTOPIC = { id: 'subtopic', kind: 'topic' };
const MISSING_ID = 'missing-resource';
const OTHER_TOPIC = { ...TOPIC, id: 'other-topic', title: 'Other topic' };
const RESOURCE = {
  id: 'first-resource',
  content_id: 'first-content',
  channel_id: 'channel-id',
  title: 'First resource',
  kind: 'html5',
  files: TOPIC.files,
};
const NEXT_RESOURCE = {
  ...RESOURCE,
  id: 'second-resource',
  content_id: 'second-content',
  title: 'Second resource',
};

const RegisteredViewer = {
  setup(props, context) {
    const { contentNode, reportError, reportLoadingError } = useContentViewer(context);
    const loadedNodeId = contentNode.value.id;
    const thrown = ref(false);
    const actions = {
      [OPEN_TOPIC]: () => context.emit('navigateTo', { nodeId: SUBTOPIC.id }),
      [OPEN_FIRST_RESOURCE]: () => context.emit('navigateTo', { nodeId: RESOURCE.id }),
      [OPEN_SECOND_RESOURCE]: () => context.emit('navigateTo', { nodeId: NEXT_RESOURCE.id }),
      [OPEN_MISSING_RESOURCE]: () => context.emit('navigateTo', { nodeId: MISSING_ID }),
      [REPORT_HANDLER_ERROR]: () => reportError({ error: 'HANDLER_ERROR' }),
      [REPORT_LOADING_ERROR]: () => reportLoadingError('Could not load the file'),
      [START_TRACKING]: () => context.emit('startTracking'),
      [FINISH_LOADING]: () => context.emit('loaded'),
      [THROW_ERROR]: () => {
        thrown.value = true;
      },
    };
    return () => {
      if (thrown.value) {
        throw new Error('Renderer failed');
      }
      return h('section', [
        h('h2', contentNode.value.title),
        h('p', { attrs: { 'data-testid': 'loaded-node' } }, loadedNodeId),
        ...(contentNode.value.kind === 'topic'
          ? Object.entries(actions).map(([label, action]) =>
              h('button', { on: { click: action } }, label),
            )
          : []),
      ]);
    };
  },
};

function renderWithViewer(component, options) {
  return render(component, options, localVue => {
    localVue.component('ContentViewer', ContentViewer);
  });
}

function holdNodeRequest(node) {
  let release;
  const url = `${CONTENT_NODE_URL}${node.id}/`;
  const respond = client.getMockImplementation();
  client.mockImplementation(request =>
    request.url === url
      ? new Promise(resolve => {
          release = () => resolve({ data: node });
        })
      : respond(request),
  );
  return () => release();
}

async function renderChannel() {
  const router = new VueRouter({
    mode: 'abstract',
    routes: [{ name: PageNames.TOPICS_TOPIC, path: '/topics/:id' }],
  });
  await router.push({ name: PageNames.TOPICS_TOPIC, params: { id: TOPIC.id } });
  const rendered = renderWithViewer(CustomContentRenderer, {
    props: { topic: TOPIC },
    routes: router,
  });
  return { router, ...rendered };
}

describe('CustomContentRenderer', () => {
  beforeAll(() => {
    pluginData.urls = {
      urls: {
        'kolibri:core:contentnode_detail': [[`${CONTENT_NODE_URL.slice(1)}%(pk)s/`, ['pk']]],
        'kolibri:core:trackprogress_list': [[TRACK_PROGRESS_URL.slice(1), []]],
      },
    };
  });

  beforeEach(() => {
    coreApp.presetViewerComponent.mockImplementation(preset =>
      preset === 'html5_zip' ? RegisteredViewer : null,
    );
    const nodesByUrl = Object.fromEntries(
      [SUBTOPIC, RESOURCE, NEXT_RESOURCE].map(node => [`${CONTENT_NODE_URL}${node.id}/`, node]),
    );
    client.mockImplementation(({ method, url }) => {
      if (method === 'POST' && url === TRACK_PROGRESS_URL) {
        return Promise.resolve({ data: { progress: 0, time_spent: 0 } });
      }
      if (!nodesByUrl[url]) {
        return Promise.reject({ message: 'Not found', response: { status: 404 } });
      }
      return Promise.resolve({ data: nodesByUrl[url] });
    });
  });

  afterEach(() => {
    appError.value = null;
    ContentNodeResource.cache = {};
  });

  it('renders the registered viewer for the topic', async () => {
    await renderChannel();

    expect(screen.getByRole('heading', { name: TOPIC.title })).toBeInTheDocument();
  });

  it('navigates to a topic with a backlink to the custom channel', async () => {
    const { router } = await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: OPEN_TOPIC }));

    await waitFor(() => {
      expect(router.currentRoute).toMatchObject({
        name: PageNames.TOPICS_TOPIC,
        params: { id: SUBTOPIC.id },
        query: {
          prevName: PageNames.TOPICS_TOPIC,
          prevParams: encodeURI(JSON.stringify({ id: TOPIC.id })),
        },
      });
    });
  });

  it('opens a resource in an overlay and replaces it on the next navigation', async () => {
    const { router } = await renderChannel();

    const trigger = screen.getByRole('button', { name: OPEN_FIRST_RESOURCE });
    trigger.focus();
    await fireEvent.click(trigger);
    const firstDialog = await screen.findByRole('dialog', { name: RESOURCE.title });
    expect(
      within(firstDialog).getByRole('button', { name: coreStrings.closeAction$() }),
    ).toHaveFocus();
    expect(await within(firstDialog).findByTestId('loaded-node')).toHaveTextContent(RESOURCE.id);

    await fireEvent.click(screen.getByRole('button', { name: OPEN_SECOND_RESOURCE }));
    const secondDialog = await screen.findByRole('dialog', { name: NEXT_RESOURCE.title });
    expect(await within(secondDialog).findByTestId('loaded-node')).toHaveTextContent(
      NEXT_RESOURCE.id,
    );
    expect(screen.queryByRole('dialog', { name: RESOURCE.title })).not.toBeInTheDocument();
    expect(router.currentRoute.query).toEqual({});

    await fireEvent.keyDown(
      within(secondDialog).getByRole('button', { name: coreStrings.closeAction$() }),
      { key: 'Escape' },
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps a resource open when a widget inside it handles Escape', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: OPEN_FIRST_RESOURCE }));
    const dialog = await screen.findByRole('dialog', { name: RESOURCE.title });
    const widget = await within(dialog).findByTestId('loaded-node');
    widget.addEventListener('keydown', event => event.preventDefault());

    await fireEvent.keyDown(widget, { key: 'Escape' });

    expect(screen.getByRole('dialog', { name: RESOURCE.title })).toBeInTheDocument();
  });

  it('keeps a resource open when a widget inside it dismisses on Escape keyup', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: OPEN_FIRST_RESOURCE }));
    const dialog = await screen.findByRole('dialog', { name: RESOURCE.title });
    const widget = await within(dialog).findByTestId('loaded-node');
    const dismiss = jest.fn();
    widget.tabIndex = 0;
    widget.addEventListener('keyup', event => event.key === 'Escape' && dismiss());
    widget.focus();

    await userEvent.keyboard('{Escape}');

    expect(dismiss).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: RESOURCE.title })).toBeInTheDocument();
  });

  it('keeps focus inside the resource overlay when tabbing back from Close', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: OPEN_FIRST_RESOURCE }));
    const dialog = await screen.findByRole('dialog', { name: RESOURCE.title });
    const close = within(dialog).getByRole('button', { name: coreStrings.closeAction$() });
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });

    expect(close).toHaveFocus();
  });

  it('opens the latest requested resource when an earlier lookup resolves last', async () => {
    await renderChannel();
    const releaseFirst = holdNodeRequest(RESOURCE);

    await fireEvent.click(screen.getByRole('button', { name: OPEN_FIRST_RESOURCE }));
    await fireEvent.click(screen.getByRole('button', { name: OPEN_SECOND_RESOURCE }));
    await screen.findByRole('dialog', { name: NEXT_RESOURCE.title });
    releaseFirst();
    await new Promise(resolve => setTimeout(resolve));

    expect(screen.getByRole('dialog', { name: NEXT_RESOURCE.title })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: RESOURCE.title })).not.toBeInTheDocument();
  });

  it('does not navigate when a topic lookup resolves after unmounting', async () => {
    const { router, unmount } = await renderChannel();
    const releaseTopic = holdNodeRequest(SUBTOPIC);

    await fireEvent.click(screen.getByRole('button', { name: OPEN_TOPIC }));
    unmount();
    releaseTopic();
    await new Promise(resolve => setTimeout(resolve));

    expect(router.currentRoute.params).toEqual({ id: TOPIC.id });
  });

  it('leaves the page alone when the content navigates to a missing node', async () => {
    const { router } = await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: OPEN_MISSING_RESOURCE }));
    await new Promise(resolve => setTimeout(resolve));

    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${CONTENT_NODE_URL}${MISSING_ID}/` }),
    );
    expect(appError.value).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(router.currentRoute.params).toEqual({ id: TOPIC.id });
  });

  it('loads the content of a new topic rather than keeping the first', async () => {
    const { updateProps } = await renderChannel();
    expect(screen.getByTestId('loaded-node')).toHaveTextContent(TOPIC.id);

    await updateProps({ topic: OTHER_TOPIC });

    expect(screen.getByTestId('loaded-node')).toHaveTextContent(OTHER_TOPIC.id);
  });

  it('closes the open resource when the topic changes', async () => {
    const { updateProps } = await renderChannel();
    await fireEvent.click(screen.getByRole('button', { name: OPEN_FIRST_RESOURCE }));
    await screen.findByRole('dialog', { name: RESOURCE.title });

    await updateProps({ topic: OTHER_TOPIC });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open a resource requested from the previous topic', async () => {
    const { updateProps } = await renderChannel();
    const releaseResource = holdNodeRequest(RESOURCE);

    await fireEvent.click(screen.getByRole('button', { name: OPEN_FIRST_RESOURCE }));
    await updateProps({ topic: OTHER_TOPIC });
    releaseResource();
    await new Promise(resolve => setTimeout(resolve));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an alert for a loading error before the viewer starts', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: REPORT_LOADING_ERROR }));

    expect(screen.getByRole('alert')).toHaveTextContent('Kolibri is unable to load this channel');
  });

  it('does not show an alert for a handler error after the channel has loaded', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: START_TRACKING }));
    await fireEvent.click(screen.getByRole('button', { name: FINISH_LOADING }));
    await fireEvent.click(screen.getByRole('button', { name: REPORT_HANDLER_ERROR }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows only the content viewer error for an error it catches', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: THROW_ERROR }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Kolibri is unable to render this resource',
    );
    consoleError.mockRestore();
  });

  it('reports a handler error', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: REPORT_HANDLER_ERROR }));

    expect(screen.getByRole('alert')).toHaveTextContent('Kolibri is unable to load this channel');
  });

  it('shows an alert for a loading error after the viewer starts', async () => {
    await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: START_TRACKING }));
    await fireEvent.click(screen.getByRole('button', { name: REPORT_LOADING_ERROR }));

    expect(screen.getByRole('alert')).toHaveTextContent('Kolibri is unable to load this channel');
  });

  it('resets the channel alert when the topic changes', async () => {
    const { updateProps } = await renderChannel();

    await fireEvent.click(screen.getByRole('button', { name: REPORT_LOADING_ERROR }));
    await updateProps({ topic: OTHER_TOPIC });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: FINISH_LOADING }));
    await updateProps({ topic: TOPIC });
    await fireEvent.click(screen.getByRole('button', { name: REPORT_HANDLER_ERROR }));

    expect(screen.getByRole('alert')).toHaveTextContent('Kolibri is unable to load this channel');
  });

  it('shows the content viewer error when no viewer is registered', async () => {
    coreApp.presetViewerComponent.mockReturnValue(null);

    await renderChannel();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Kolibri is unable to render this resource',
    );
  });
});
