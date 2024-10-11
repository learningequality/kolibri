import TaskResource from 'kolibri/apiResources/TaskResource';
import { TaskTypes } from 'kolibri-common/utils/syncTaskUtils';
import { loadChannelMetadata } from '../../src/modules/wizard/actions/selectContentActions';
import ChannelResource from '../../src/apiResources/deviceChannel';
import { defaultChannel } from '../utils/data';
import { makeSelectContentPageStore } from '../utils/makeStore';

jest.mock('kolibri/apiResources/TaskResource');
jest.mock('kolibri-common/apiResources/ChannelResource');
jest.genMockFromModule('../../src/apiResources/deviceChannel');

// Have store suddenly add a Task to the store so the task waiting step
// resolves successfully
function hackStoreWatcher(store) {
  setTimeout(() => {
    store.commit('manageContent/SET_TASK_LIST', [{ id: 'task_1', status: 'COMPLETED' }]);
  }, 1);
}

describe('loadChannelMetadata action', () => {
  let store;

  beforeAll(() => {
    ChannelResource.fetchModel = jest.fn();
  });

  beforeEach(() => {
    store = makeSelectContentPageStore();
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', defaultChannel);
    store.commit('manageContent/SET_CHANNEL_LIST', [
      { id: 'channel_1', name: 'Installed Channel', root: 'channel_1_root', available: true },
    ]);
    hackStoreWatcher(store);
    const taskEntity = { data: { id: 'task_1' } };
    TaskResource.startTask.mockResolvedValue(taskEntity);
    ChannelResource.fetchModel.mockResolvedValue({
      name: 'Channel One',
      root: 'channel_1_root',
    });
  });

  afterEach(() => {
    ChannelResource.fetchModel.mockReset();
    TaskResource.startTask.mockReset();
  });

  function setUpStateForTransferType(transferType) {
    const drive = {
      id: `${transferType}_specs_drive`,
      name: 'test drive',
    };
    store.commit('manageContent/wizard/SET_TRANSFER_TYPE', transferType);
    store.commit('manageContent/wizard/SET_DRIVE_LIST', [drive]);
    store.state.manageContent.wizard.selectedDrive = drive;
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', {
      id: `${transferType}_brand_new_channel`,
    });
  }

  function useInstalledChannel() {
    store.commit('manageContent/wizard/SET_TRANSFERRED_CHANNEL', { id: 'channel_1' });
  }

  // Tests for common behavior
  function testNoChannelsAreImported(store, options) {
    return loadChannelMetadata(store, options).then(() => {
      expect(TaskResource.startTask).not.toHaveBeenCalled();
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
      return loadChannelMetadata(store).then(() => {
        expect(TaskResource.startTask).toHaveBeenCalledWith({
          type: TaskTypes.DISKCHANNELIMPORT,
          channel_id: 'localimport_brand_new_channel',
          drive_id: 'localimport_specs_drive',
        });
      });
    });

    it('errors from startTask are handled', () => {
      TaskResource.startTask.mockRejectedValue();
      return loadChannelMetadata(store).then(() => {
        expect(store.state.manageContent.wizard.status).toEqual('CONTENT_DB_LOADING_ERROR');
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
      return loadChannelMetadata(store).then(() => {
        expect(TaskResource.startTask).toHaveBeenCalledWith({
          type: TaskTypes.REMOTECHANNELIMPORT,
          channel_id: 'remoteimport_brand_new_channel',
        });
      });
    });

    it('errors from startTask are handled', () => {
      TaskResource.startTask.mockRejectedValue();
      return loadChannelMetadata(store).then(() => {
        expect(store.state.manageContent.wizard.status).toEqual('CONTENT_DB_LOADING_ERROR');
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
