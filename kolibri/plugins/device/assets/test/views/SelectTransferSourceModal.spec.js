import { shallowMount } from '@vue/test-utils';
import SelectTransferSourceModal from '../../src/views/ManageContentPage/SelectTransferSourceModal';
import { makeAvailableChannelsPageStore } from '../utils/makeStore';

function makeWrapper(options) {
  const wrapper = shallowMount(SelectTransferSourceModal, {
    ...options,
    stubs: {
      SelectImportSourceModal: '<div data-test="select-import-source"></div>',
      SelectDriveModal: '<div data-test="select-drive"></div>',
    },
  });
  const els = {
    titleText: () => wrapper.find({ name: 'KModal' }).props().title,
    selectImportSource: () => wrapper.find('[data-test="select-import-source"]'),
    selectDrive: () => wrapper.find('[data-test="select-drive"]'),
  };
  return { wrapper, els };
}

describe('selectImportSourceModal component', () => {
  let store;

  beforeEach(() => {
    store = makeAvailableChannelsPageStore();
  });

  it('when at select source stage, shows correct modal', () => {
    const { els } = makeWrapper({ store, propsData: { pageName: 'SELECT_IMPORT_SOURCE' } });
    expect(els.selectImportSource().exists()).toEqual(true);
    expect(els.selectDrive().exists()).toEqual(false);
  });

  it('when exporting or local importing, shows the correct modal', () => {
    const { els } = makeWrapper({ store, propsData: { pageName: 'SELECT_DRIVE' } });
    expect(els.selectDrive().exists()).toEqual(true);
    expect(els.selectImportSource().exists()).toEqual(false);
  });

  // not tested:
  // whether correct form is showing
});
