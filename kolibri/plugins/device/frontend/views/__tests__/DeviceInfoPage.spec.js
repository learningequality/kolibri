import { nextTick, ref } from 'vue';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import ConnectionUrlsResource from 'kolibri-common/apiResources/ConnectionUrlsResource';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { connectDevicesStrings } from 'kolibri-common/strings/connectDevicesStrings';
import makeStore from '../../__tests__/utils/makeStore';
import DeviceInfoPage, { pageTitleStrings } from '../DeviceInfoPage';

jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { deprecationWarnings: {} },
}));
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(url => Promise.resolve(`data:${url}`)),
}));
jest.mock('kolibri-common/apiResources/ConnectionUrlsResource', () => {
  const resource = jest.requireActual('kolibri-common/apiResources/ConnectionUrlsResource').default;
  resource.list = jest.fn();
  return { __esModule: true, default: resource };
});

const { header$ } = pageTitleStrings;
const { title$, qrAlt$ } = connectDevicesStrings;
const IP_URL = 'http://192.168.1.5:8080/';

function renderComponent({ windowIsSmall = ref(false) } = {}) {
  useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall }));
  const store = makeStore();
  store.commit('deviceInfo/SET_STATE', {
    deviceInfo: { urls: [], device_id: 'abcdef', device_name: 'Device' },
  });
  pageLoading.value = false;
  return render(DeviceInfoPage, { store, routes: [] });
}

describe('DeviceInfoPage', () => {
  beforeEach(() => {
    ConnectionUrlsResource.list.mockResolvedValue([{ url: IP_URL, is_local_hostname: false }]);
  });

  it('titles the tab with its visible header, the only h1', async () => {
    document.title = '';
    renderComponent();
    await nextTick();
    expect(document.title).toBe(`${header$()} - Kolibri`);
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(header$());
  });

  it('shows the connect devices details inline on wide windows', async () => {
    renderComponent();
    expect(await screen.findByRole('img', { name: qrAlt$() })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: title$() })).not.toBeInTheDocument();
  });

  it('opens the connect devices details in a dialog on small windows', async () => {
    renderComponent({ windowIsSmall: ref(true) });
    await global.flushPromises();
    expect(screen.queryByRole('img', { name: qrAlt$() })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: title$() }));
    const dialog = await screen.findByRole('dialog', { name: title$() });
    expect(await within(dialog).findByRole('img', { name: qrAlt$() })).toBeInTheDocument();
  });

  it('closes the dialog when the window widens, leaving only the inline details', async () => {
    const windowIsSmall = ref(true);
    renderComponent({ windowIsSmall });
    await fireEvent.click(screen.getByRole('button', { name: title$() }));
    await screen.findByRole('dialog', { name: title$() });

    windowIsSmall.value = false;
    await global.flushPromises();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: qrAlt$() })).toHaveLength(1);
  });

  it('moves focus to the inline details when the window widens with the dialog open', async () => {
    const windowIsSmall = ref(true);
    renderComponent({ windowIsSmall });
    await fireEvent.click(screen.getByRole('button', { name: title$() }));
    await screen.findByRole('dialog', { name: title$() });

    windowIsSmall.value = false;
    const qrImage = await screen.findByRole('img', { name: qrAlt$() });
    expect(document.body).not.toHaveFocus();
    expect(document.activeElement).toContainElement(qrImage);
  });

  it('moves focus to the dialog button when the window narrows with focus in the inline details', async () => {
    const windowIsSmall = ref(false);
    renderComponent({ windowIsSmall });
    const link = await screen.findByRole('link', { name: IP_URL });
    link.focus();

    windowIsSmall.value = true;
    await global.flushPromises();
    expect(screen.getByRole('button', { name: title$() })).toHaveFocus();
  });

  it('keeps the dialog closed when the window narrows again', async () => {
    const windowIsSmall = ref(true);
    renderComponent({ windowIsSmall });
    await fireEvent.click(screen.getByRole('button', { name: title$() }));
    await screen.findByRole('dialog', { name: title$() });

    windowIsSmall.value = false;
    await global.flushPromises();
    windowIsSmall.value = true;
    await global.flushPromises();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: title$() })).toBeInTheDocument();
  });
});
