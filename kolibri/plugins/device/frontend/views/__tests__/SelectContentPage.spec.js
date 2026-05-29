import { render, screen } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import SelectContentPage from '../SelectContentPage';
import { makeSelectContentPageStore } from '../../__tests__/utils/makeStore';
import ChannelContentsSummary from '../SelectContentPage/ChannelContentsSummary';
import NewChannelVersionBanner from '../ManageContentPage/NewChannelVersionBanner';
import router from './testRouter';

const summaryTr = createTranslator('ChannelContentsSummary', ChannelContentsSummary.$trs);
const bannerTr = createTranslator('NewChannelVersionBanner', NewChannelVersionBanner.$trs);

function renderComponent(options) {
  const { store, props = {} } = options;
  return render(SelectContentPage, {
    props,
    store: store || makeSelectContentPageStore(),
    ...router,
  });
}

function updateMetaChannel(store, updates) {
  const { transferredChannel } = store.state.manageContent.wizard;
  store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', {
    ...transferredChannel,
    ...updates,
  });
}

describe('SelectContentPage', () => {
  let store;

  beforeAll(async () => {
    await i18nSetup(true);
  });

  beforeEach(() => {
    store = makeSelectContentPageStore();
  });

  it('shows the thumbnail, title, descripton, and version of the channel', () => {
    const heading = 'Awesome Channel';
    const version = '10';
    const description = 'An awesome channel';
    const fakeImage = 'data:image/png;base64,abcd1234';
    updateMetaChannel(store, { thumbnail: fakeImage });
    renderComponent({ store });
    expect(screen.getByRole('img')).toHaveAttribute('src', fakeImage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading);
    expect(screen.getByText(summaryTr.$tr('version', { version: version }))).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('shows the total size of the channel', () => {
    renderComponent({ store });
    expect(screen.getAllByRole('row')[1]).toHaveTextContent(
      `${summaryTr.$tr('totalSizeRow')} 1,000 5 GB`,
    );
  });

  it('shows the total size of any resources on the device', () => {
    renderComponent({ store });
    expect(screen.getAllByRole('row')[2]).toHaveTextContent(
      `${summaryTr.$tr('onDeviceRow')} 2,000 95 MB`,
    );
  });

  it('shows size and resources as 0 if channel is not on device', () => {
    updateMetaChannel(store, {
      id: 'not_awesome_channel',
      on_device_resources: 0,
      on_device_file_size: 0,
    });
    renderComponent({ store });
    expect(screen.getAllByRole('row')[2]).toHaveTextContent(
      `${summaryTr.$tr('onDeviceRow')} 0 0 B`,
    );
  });

  it('shows a update notification if a new version is available', () => {
    updateMetaChannel(store, { version: 1000 });
    renderComponent({ store });
    const NEW_VERSION = '1000';
    expect(
      screen.getByText(bannerTr.$tr('versionAvailable', { version: NEW_VERSION })),
    ).toBeInTheDocument();
  });

  it('if a new version is not available, then no notification/button appear', () => {
    updateMetaChannel(store, { version: 10 }); // same version
    renderComponent({ store });
    const NEW_VERSION = '1000';
    expect(
      screen.queryByText(bannerTr.$tr('versionAvailable', { version: NEW_VERSION })),
    ).not.toBeInTheDocument();
  });

  describe('draft channel (installed version = 0)', () => {
    function setInstalledVersion(store, version) {
      const existing = store.state.manageContent.channelList[0];
      store.commit('manageContent/SET_CHANNEL_LIST', [{ ...existing, version }]);
    }

    it('shows ContentTreeViewer when installed version is 0 and Studio has newer version', () => {
      setInstalledVersion(store, 0);
      updateMetaChannel(store, { version: 5 });
      const wrapper = makeWrapper({ store });
      expect(wrapper.findAllComponents({ name: 'ContentTreeViewer' }).length).toBeGreaterThan(0);
    });

    it('shows NewChannelVersionBanner when installed version is 0 and Studio has newer version', () => {
      setInstalledVersion(store, 0);
      updateMetaChannel(store, { version: 5 });
      const wrapper = makeWrapper({ store });
      expect(wrapper.findComponent({ name: 'NewChannelVersionBanner' }).exists()).toBe(true);
    });

    it('shows SelectionBottomBar when installed version is 0 and Studio has newer version', () => {
      setInstalledVersion(store, 0);
      updateMetaChannel(store, { version: 5 });
      const wrapper = makeWrapper({ store });
      expect(wrapper.findAllComponents({ name: 'SelectionBottomBar' }).length).toBeGreaterThan(0);
    });

    it('hides ContentTreeViewer when installed version > 0 and newer version available on Studio', () => {
      // Preserve existing non-draft behavior
      updateMetaChannel(store, { version: 1000 });
      const wrapper = makeWrapper({ store });
      expect(wrapper.findAllComponents({ name: 'ContentTreeViewer' }).length).toBe(0);
    });
  });
});
