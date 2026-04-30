import RemoteChannelResource from 'kolibri-common/apiResources/RemoteChannelResource';
import ContentNodeGranularResource from 'kolibri-common/apiResources/ContentNodeGranularResource';
import { getChannelWithContentSizes } from '../apiChannelMetadata';
import { loadChannelMetadata, getAvailableSpaceOnDrive } from '../actions/selectContentActions';
import { showSelectContentPage } from '../handlers';
import { makeSelectContentPageStore } from '../../../__tests__/utils/makeStore';
import { ContentWizardErrors } from '../../../constants';

jest.mock('kolibri-common/apiResources/RemoteChannelResource');
jest.mock('kolibri-common/apiResources/ContentNodeGranularResource');
jest.mock('../apiChannelMetadata');
jest.mock('../actions/selectContentActions', () => {
  const mod = { getAvailableSpaceOnDrive: jest.fn(), loadChannelMetadata: jest.fn() };
  Object.defineProperty(mod, '__esModule', { value: true });
  return mod;
});
jest.mock('kolibri/utils/appError', () => ({ handleApiError: jest.fn() }), { virtual: true });
jest.mock('kolibri/router', () => ({ replace: jest.fn() }), { virtual: true });

const CHANNEL_ID = 'awesome_channel';

const draftChannel = {
  id: CHANNEL_ID,
  name: 'Awesome Channel',
  version: 0,
  root: 'root_node_id',
  available: true,
  on_device_resources: 100,
  on_device_file_size: 1000000,
};

describe('showSelectContentPage REMOTEIMPORT 404 handling', () => {
  let store;

  beforeAll(() => {
    // fetchModel is inherited from the Resource prototype, so auto-mocking
    // does not create a jest.fn() for it — assign explicitly (same pattern
    // used in actions/__tests__/showSelectContentPage.spec.js line 24).
    RemoteChannelResource.fetchModel = jest.fn();
    ContentNodeGranularResource.fetchModel = jest.fn();
  });

  beforeEach(() => {
    store = makeSelectContentPageStore();
    // Put draft channel (version 0) into the channel list
    store.commit('manageContent/SET_CHANNEL_LIST', [draftChannel]);
    getAvailableSpaceOnDrive.mockResolvedValue(1000000);
    loadChannelMetadata.mockResolvedValue();
    ContentNodeGranularResource.fetchModel.mockResolvedValue({
      id: 'root_node_id',
      children: { results: [] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to on-device channel when Studio returns 404 for a draft channel (version 0)', () => {
    getChannelWithContentSizes.mockResolvedValue(draftChannel);
    RemoteChannelResource.fetchModel.mockRejectedValue({ response: { status: 404 } });

    return showSelectContentPage(store, { channel_id: CHANNEL_ID }).then(() => {
      expect(store.state.manageContent.wizard.status).not.toEqual(
        ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO,
      );
    });
  });

  it('shows CHANNEL_NOT_FOUND_ON_STUDIO error when Studio returns 404 for a non-draft channel (version > 0)', () => {
    const nonDraftChannel = { ...draftChannel, version: 3 };
    store.commit('manageContent/SET_CHANNEL_LIST', [nonDraftChannel]);
    getChannelWithContentSizes.mockResolvedValue(nonDraftChannel);
    RemoteChannelResource.fetchModel.mockRejectedValue({ response: { status: 404 } });

    return showSelectContentPage(store, { channel_id: CHANNEL_ID }).then(() => {
      expect(store.state.manageContent.wizard.status).toEqual(
        ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO,
      );
    });
  });

  it('shows CHANNEL_NOT_FOUND_ON_STUDIO error when Studio returns 404 and channel is not on device', () => {
    store.commit('manageContent/SET_CHANNEL_LIST', []);
    getChannelWithContentSizes.mockRejectedValue({
      response: { status: 404, config: { url: '/api/channel/' + CHANNEL_ID } },
    });
    RemoteChannelResource.fetchModel.mockRejectedValue({ response: { status: 404 } });

    return showSelectContentPage(store, { channel_id: CHANNEL_ID }).then(() => {
      expect(store.state.manageContent.wizard.status).toEqual(
        ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO,
      );
    });
  });

  it('resolves normally when Studio returns the channel (no 404)', () => {
    const studioChannel = { ...draftChannel, version: 5 };
    getChannelWithContentSizes.mockResolvedValue(draftChannel);
    RemoteChannelResource.fetchModel.mockResolvedValue(studioChannel);

    return showSelectContentPage(store, { channel_id: CHANNEL_ID }).then(() => {
      expect(store.state.manageContent.wizard.status).not.toEqual(
        ContentWizardErrors.CHANNEL_NOT_FOUND_ON_STUDIO,
      );
    });
  });
});
