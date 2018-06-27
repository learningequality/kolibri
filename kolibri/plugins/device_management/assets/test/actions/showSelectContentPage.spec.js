import { ChannelResource, ContentNodeGranularResource, TaskResource } from 'kolibri.resources';
import { loadChannelMetaData } from '../../src/state/actions/selectContentActions';
import { wizardState } from '../../src/state/getters';
import { jestMockResource } from 'testUtils'; // eslint-disable-line
import { defaultChannel } from '../utils/data';
import { makeSelectContentPageStore } from '../utils/makeStore';

jestMockResource(ChannelResource);
jestMockResource(ContentNodeGranularResource);
jestMockResource(TaskResource);

// Have store suddenly add a Task to the store so the task waiting step
// resolves successfully
function hackStoreWatcher(store) {
  setTimeout(() => {
    store.commit('SET_CONTENT_PAGE_TASKS', [{ id: 'task_1', status: 'COMPLETED' }]);
  }, 1);
}

describe('loadChannelMetaData action', () => {
  let store;

  beforeEach(() => {
    // Add mock methods not in generic mock Resource
    TaskResource.startRemoteChannelImport = jest.fn();
    TaskResource.startDiskChannelImport = jest.fn();
  });

  beforeEach(() => {
    store = makeSelectContentPageStore();
    store.commit('SET_TRANSFERRED_CHANNEL', defaultChannel);
    store.commit('SET_CHANNEL_LIST', [
      { id: 'channel_1', name: 'Installed Channel', root: 'channel_1_root', available: true },
    ]);
    hackStoreWatcher(store);
    const taskEntity = { entity: { id: 'task_1' } };
    TaskResource.cancelTask = jest.fn().mockResolvedValue();
    TaskResource.startDiskChannelImport.mockResolvedValue(taskEntity);
    TaskResource.startRemoteChannelImport.mockResolvedValue(taskEntity);
    ChannelResource.getModel.mockReturnValue({
      fetch: () => ({
        _promise: Promise.resolve({
          name: 'Channel One',
          root: 'channel_1_root',
        }),
      }),
    });
  });

  afterEach(() => {
    ChannelResource.__resetMocks();
    ContentNodeGranularResource.__resetMocks();
    TaskResource.__resetMocks();
    TaskResource.startRemoteChannelImport.mockReset();
    TaskResource.startDiskChannelImport.mockReset();
    TaskResource.cancelTask.mockReset();
  });

  function setUpStateForTransferType(transferType) {
    store.commit('SET_TRANSFER_TYPE', transferType);
    store.commit('SET_DRIVE_LIST', [
      {
        id: `${transferType}_specs_drive`,
        name: 'test drive',
      },
    ]);
    store.commit('SET_SELECTED_DRIVE', `${transferType}_specs_drive`);
    store.commit('SET_TRANSFERRED_CHANNEL', {
      id: `${transferType}_brand_new_channel`,
    });
  }

  function useInstalledChannel() {
    store.commit('SET_TRANSFERRED_CHANNEL', { id: 'channel_1' });
  }

  // Tests for common behavior
  function testNoChannelsAreImported(store, options) {
    return loadChannelMetaData(store, options).then(() => {
      expect(TaskResource.startDiskChannelImport).not.toHaveBeenCalled();
      expect(TaskResource.startRemoteChannelImport).not.toHaveBeenCalled();
    });
  }

  describe('during LOCALIMPORT only', () => {
    beforeEach(() => {
      setUpStateForTransferType('localimport');
    });

    it('if channel already installed, "startdiskchannelimport" is not called', () => {
      useInstalledChannel();
      return testNoChannelsAreImported(store);
    });

    it('if channel is *not* on device, then "startdiskchannelimport" is called', () => {
      return loadChannelMetaData(store).then(() => {
        expect(TaskResource.startDiskChannelImport).toHaveBeenCalledWith({
          channel_id: 'localimport_brand_new_channel',
          drive_id: 'localimport_specs_drive',
        });
        expect(TaskResource.startRemoteChannelImport).not.toHaveBeenCalled();
      });
    });

    it('errors from startDiskChannelImport are handled', () => {
      TaskResource.startDiskChannelImport.mockRejectedValue();
      return loadChannelMetaData(store).then(() => {
        expect(wizardState(store.state).status).toEqual('CONTENT_DB_LOADING_ERROR');
      });
    });
  });

  describe('during REMOTEIMPORT only', () => {
    beforeEach(() => {
      setUpStateForTransferType('remoteimport');
    });

    it('if channel is already installed, then "startremotechannelimport" is *not* called', () => {
      useInstalledChannel();
      return testNoChannelsAreImported(store);
    });

    it('if channel is *not* on device, then "startremotechannelimport" is called', () => {
      return loadChannelMetaData(store).then(() => {
        expect(TaskResource.startRemoteChannelImport).toHaveBeenCalledWith({
          channel_id: 'remoteimport_brand_new_channel',
        });
        expect(TaskResource.startDiskChannelImport).not.toHaveBeenCalled();
      });
    });

    it('errors from startRemoteChannelImport are handled', () => {
      TaskResource.startRemoteChannelImport.mockRejectedValue();
      return loadChannelMetaData(store).then(() => {
        expect(wizardState(store.state).status).toEqual('CONTENT_DB_LOADING_ERROR');
      });
    });
  });

  describe('during LOCALEXPORT only', () => {
    beforeEach(() => {
      setUpStateForTransferType('localexport');
      // In principle, only channels already on the device can be exported
      useInstalledChannel();
    });

    it('"startdiskchannelimport" and "startremotechannelimport" are not called', () => {
      return testNoChannelsAreImported(store);
    });
  });

  // Not tested:
  // * When channel import Tasks fail
});
