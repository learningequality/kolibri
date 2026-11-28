import { render, screen } from '@testing-library/vue';
import { h } from 'vue';
import kolibri from 'kolibri';
import ContentViewer from '../../components/internal/ContentViewer';
import useSandbox from '../internal/useSandbox';

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    canHandleElement: element => element?.matches('object'),
    elementViewerComponent: () => null,
    presetViewerComponent: jest.fn(),
    getSandboxHandlerUrl: () => '/handler.js',
  },
}));

jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { urls: { __sandboxUrl: '/sandbox/' } },
}));

function requestFromIframe(iframe, event, data, nameSpace = 'x') {
  const { port1, port2 } = new MessageChannel();
  const reply = new Promise((resolve, reject) => {
    const close = () => {
      port1.close();
      port2.close();
    };
    const timeout = setTimeout(() => {
      close();
      reject(new Error(`No reply to ${nameSpace}:${event}`));
    }, 1000);
    port1.onmessage = ({ data }) => {
      clearTimeout(timeout);
      close();
      resolve(data);
    };
  });
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { nameSpace, event, data },
      source: iframe.contentWindow,
      ports: [port2],
    }),
  );
  return reply;
}

function pdfElement(url) {
  const element = document.createElement('object');
  element.setAttribute('type', 'application/pdf');
  element.setAttribute('data', url);
  return element;
}

describe('useSandbox shim answers', () => {
  it('answers each event on its namespace with the current viewer context', async () => {
    let initializeSandbox;
    const frameTitle = 'Content viewer';
    const Renderer = {
      setup(props, context) {
        ({ initializeSandbox } = useSandbox(context, {
          shimAnswers: {
            nameSpace: 'x',
            answers: {
              inspect: (data, { contentNode, files, hostData }) => ({
                data,
                contentNode,
                fileUrls: files.map(file => file.storage_url),
                hostData,
              }),
              navigate: (id, { emit, hasListener }) => {
                if (hasListener('navigateTo')) {
                  emit('navigateTo', { nodeId: id });
                }
                return hasListener('navigateTo');
              },
            },
          },
        }));
        return () => h('iframe', { attrs: { title: frameTitle } });
      },
    };
    kolibri.presetViewerComponent.mockReturnValue(Renderer);
    const navigateTo = jest.fn();
    const { updateProps } = render(ContentViewer, {
      props: { element: pdfElement('/lesson.pdf') },
      listeners: { navigateTo },
    });
    const iframe = screen.getByTitle(frameTitle);
    initializeSandbox(iframe);

    await expect(requestFromIframe(iframe, 'inspect', 'first')).resolves.toEqual({
      result: { data: 'first', contentNode: null, fileUrls: ['/lesson.pdf'], hostData: null },
    });

    const hostData = { lesson: 'updated' };
    await updateProps({ hostData, element: pdfElement('/updated.pdf') });

    await expect(requestFromIframe(iframe, 'inspect', 'second')).resolves.toEqual({
      result: { data: 'second', contentNode: null, fileUrls: ['/updated.pdf'], hostData },
    });
    await expect(requestFromIframe(iframe, 'navigate', 'next-node')).resolves.toEqual({
      result: true,
    });
    expect(navigateTo).toHaveBeenCalledWith({ nodeId: 'next-node' });
    await expect(requestFromIframe(iframe, 'inspect', null, 'other')).resolves.toMatchObject({
      status: 501,
    });
  });
});
