import { mount } from '@vue/test-utils';
import KModal from 'kolibri-design-system/lib/KModal';
import UiAlert from 'kolibri-design-system/lib/keen/UiAlert';
import SelectDriveModal from '../../src/views/ManageContentPage/SelectTransferSourceModal/SelectDriveModal';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

SelectDriveModal.methods.refreshDriveList = () => Promise.resolve();

function makeWrapper(options = {}) {
  const { props = {}, store, data } = options;
  return mount(SelectDriveModal, {
    propsData: {
      mode: 'import',
      ...props,
    },
    data() {
      return {
        driveStatus: '',
        ...data,
      };
    },
    store: store || makeStore(),
    stubs: {
      transition: {
        name: 'transition',
        template: '<div><slot></slot></div>',
      },
      UiAlert: {
        name: 'UiAlert',
        template: '<div><slot></slot></div>',
      },
    },
  });
}

function makeStore() {
  const store = makeAvailableChannelsPageStore();
  store.commit('manageContent/wizard/SET_DRIVE_LIST', [
    {
      id: 'unwritable_drive',
      metadata: { channels: [{ id: 'installed_channel' }] },
      name: 'Unwritable',
      writable: false,
    },
    {
      id: 'writable_importable_drive',
      metadata: { channels: [{ id: 'channel_1', version: 1 }] },
      name: 'Writable and Importable',
      writable: true,
    },
    {
      id: 'incompatible_chanel_drive',
      metadata: { channels: [{ id: 'channel_2', version: 1 }] },
      name: 'Incompatible Channel',
      writable: true,
    },
    {
      id: 'no_content_drive',
      metadata: { channels: [] },
      name: 'Writable and Importable',
      writable: true,
    },
  ]);
  return store;
}

// prettier-ignore
function getElements(wrapper) {
  return {
    titleText: () => wrapper.findComponent(KModal).props().title,
    driveListLoading: () => wrapper.find('.drive-list-loading'),
    driveListLoadingText: () => wrapper.find('.drive-list-loading').text().trim(),
    driveListContainer: () => wrapper.find('.drive-list'),
    writableImportableRadio: () => wrapper.find('input[value="writable_importable_drive"]'),
    noContentRadio: () => wrapper.find('input[value="no_content_drive"]'),
    unwritableRadio: () => wrapper.find('input[value="unwritable_drive"]'),
    incompatibleRadio: () => wrapper.find('input[value="incompatible_chanel_drive"]'),
    cancelButton: () => wrapper.find('button[name="cancel"]'),
    continueButton: () => wrapper.find('button[name="submit"]'),
    UiAlerts: () => wrapper.findComponent(UiAlert),
    findingLocalDrives: () => wrapper.find('.finding-local-drives'),
    selectDriveModal: () => wrapper.findComponent({ name: 'KModal'}),
  };
}

describe('selectDriveModal component', () => {
  let store;

  beforeEach(() => {
    store = makeStore();
  });

  function setTransferType(transferType) {
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', transferType);
  }

  it('when drive list is loading, show a message', async () => {
    const wrapper = makeWrapper({ store, data: { driveStatus: 'LOADING' } });
    const alert = wrapper.findComponent({ name: 'UiAlert' });
    expect(alert.text().trim()).toEqual('Finding local drives…');
  });

  it('when drive list is loaded, it shows the drive-list component ', async () => {
    const wrapper = makeWrapper({ store });
    const { driveListContainer, driveListLoading } = getElements(wrapper);
    expect(driveListContainer().element.tagName).toBe('DIV');
    expect(driveListLoading().exists()).toEqual(false);
  });

  it('in import mode, drive-list only shows the drives with content', () => {
    setTransferType('localimport');
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio, noContentRadio } = getElements(wrapper);
    expect(writableImportableRadio().element.tagName).toBe('INPUT');
    expect(noContentRadio().exists()).toEqual(false);
  });

  it('in import more mode, drive-list only shows drives with a compatible channel', () => {
    setTransferType('localimport');
    const channel = {
      id: 'channel_1',
      version: 1,
      available: true,
    };
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', channel);
    store.state.manageContent.channelList = [{ ...channel }];
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio } = getElements(wrapper);
    expect(writableImportableRadio().element.tagName).toBe('INPUT');
  });

  it('in import more mode, drive-list hides drives with an incompatible channel', () => {
    setTransferType('localimport');
    const channel = {
      id: 'channel_2',
      version: 6,
      available: true,
    };
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', channel);
    store.state.manageContent.channelList = [{ ...channel }];
    const wrapper = makeWrapper({ store });
    const { incompatibleRadio } = getElements(wrapper);
    expect(incompatibleRadio().exists()).toEqual(false);
  });

  it('in export mode, drive-list only shows drives that are writable', () => {
    setTransferType('localexport');
    const wrapper = makeWrapper({ store });
    const { writableImportableRadio, noContentRadio, unwritableRadio } = getElements(wrapper);
    expect(writableImportableRadio().element.tagName).toBe('INPUT');
    expect(noContentRadio().element.tagName).toBe('INPUT');
    expect(unwritableRadio().exists()).toEqual(false);
  });

  it('in import mode, if there are no drives with content, there is an empty state', () => {
    setTransferType('localimport');
    store.state.manageContent.wizard.driveList.forEach(d => {
      d.metadata.channels = [];
    });
    const wrapper = makeWrapper({ store });
    const driveListText = wrapper.findComponent({ name: 'UiAlert' });
    const expectedMessage =
      'No USB or network drives with Kolibri resources are connected to the server.';
    expect(driveListText.text().trim()).toEqual(expectedMessage);
  });

  it('in export mode, if there are no writable drives, there is an empty state', () => {
    setTransferType('localexport');
    store.state.manageContent.wizard.driveList.forEach(d => {
      d.writable = false;
    });
    const wrapper = makeWrapper({ store });
    const driveListText = wrapper.findComponent({ name: 'UiAlert' });
    const expectedMessage = 'Could not find a writable drive connected to the server';
    expect(driveListText.text().trim()).toEqual(expectedMessage);
  });

  it('when no drive is selected, "Continue" button is disabled', () => {
    const wrapper = makeWrapper({ store });
    const { continueButton } = getElements(wrapper);
    expect(continueButton().attributes().disabled).toEqual('disabled');
  });

  it('when a drive is selected, "Continue" button is enabled', async () => {
    const wrapper = makeWrapper({ store });
    const { continueButton, writableImportableRadio } = getElements(wrapper);
    writableImportableRadio().trigger('change');
    await wrapper.vm.$nextTick();
    expect(continueButton().attributes().disabled).toEqual(undefined);
  });

  it('clicking "Continue" triggers a "go forward" action', () => {
    const wrapper = makeWrapper({ store });
    const transitionStub = jest
      .spyOn(wrapper.vm, 'goForwardFromSelectDriveModal')
      .mockImplementation(() => {});
    const { writableImportableRadio, selectDriveModal } = getElements(wrapper);
    writableImportableRadio().trigger('change');
    selectDriveModal().vm.$emit('submit');
    // same parameters for import or export flow
    expect(transitionStub).toBeCalledWith({
      driveId: 'writable_importable_drive',
      forExport: false,
    });
  });

  it('clicking "Cancel" triggers a "cancel" event', async () => {
    const wrapper = makeWrapper({ store });
    const { cancelButton } = getElements(wrapper);
    cancelButton().trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'KModal' }).emitted().cancel).toHaveLength(1);
  });

  // not tested
  // * when resfreshDriveList fails
});
