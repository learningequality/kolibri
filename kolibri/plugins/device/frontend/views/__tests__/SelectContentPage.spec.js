import { render, screen } from '@testing-library/vue';
import SelectContentPage from '../SelectContentPage';
import { makeSelectContentPageStore } from '../../__tests__/utils/makeStore';
import router from './testRouter';

SelectContentPage.methods.getAvailableSpaceOnDrive = () => {};

function renderComponent(options) {
  const { store, props = {} } = options;
  const renderResult = render(SelectContentPage, {
    props,
    store: store || makeSelectContentPageStore(),
    ...router,
  });
  renderResult.container.refreshPage = () => {};
  return renderResult;
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
    const fakeImage = 'data:image/png;base64,abcd1234';
    updateMetaChannel(store, { thumbnail: fakeImage });
    renderComponent({ store });
    expect(screen.getByRole('img')).toHaveAttribute('src', fakeImage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Awesome Channel');
    expect(screen.getByText('Version 10')).toBeInTheDocument();
    expect(screen.getByText('An awesome channel')).toBeInTheDocument();
  });

  it('shows the total size of the channel', () => {
    renderComponent({ store });
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Total size 1,000 5 GB');
  });

  it('shows the total size of any resources on the device', () => {
    renderComponent({ store });
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('On your device 2,000 95 MB');
  });

  it('shows size and resources as 0 if channel is not on device', () => {
    updateMetaChannel(store, {
      id: 'not_awesome_channel',
      on_device_resources: 0,
      on_device_file_size: 0,
    });
    renderComponent({ store });
    expect(screen.getAllByRole('row')[2]).toHaveTextContent('On your device 0 0 B');
  });

  it('shows a update notification if a new version is available', () => {
    updateMetaChannel(store, { version: 1000 });
    renderComponent({ store });
    expect(screen.getByText('Version 1000 is available')).toBeInTheDocument();
  });

  it('if a new version is not available, then no notification/button appear', () => {
    updateMetaChannel(store, { version: 10 }); // same version
    renderComponent({ store });
    expect(screen.queryByText('Version 1000 is available')).not.toBeInTheDocument();
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
