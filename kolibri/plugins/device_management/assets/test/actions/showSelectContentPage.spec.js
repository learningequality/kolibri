/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import { ChannelResource, ContentNodeGranularResource, TaskResource } from 'kolibri.resources';
import { loadChannelMetaData } from '../../src/state/actions/selectContentActions';
import mutations from '../../src/state/mutations';
import { wizardState } from '../../src/state/getters';
import { mockResource } from 'testUtils'; // eslint-disable-line
import { importExportWizardState } from '../../src/state/wizardState';
import { defaultChannel } from '../utils/data';

mockResource(ChannelResource);
mockResource(ContentNodeGranularResource);
mockResource(TaskResource);

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        taskList: [],
        channelList: [
          { id: 'channel_1', name: 'Installed Channel', root: 'channel_1_root', available: true },
        ],
        wizardState: {
          ...importExportWizardState(),
          pageName: 'SELECT_CONTENT',
          transferredChannel: { ...defaultChannel },
        },
      },
    },
    mutations: {
      ...mutations,
      addTask(state, task) {
        state.pageState.taskList.push(task);
      },
    },
  });
}

// Have store suddenly add a Task to the store so the task waiting step
// resolves successfully
function hackStoreWatcher(store) {
  setTimeout(() => {
    store.dispatch('addTask', { id: 'task_1', status: 'COMPLETED' });
  }, 1);
}

describe('loadChannelMetaData action', () => {
  let store;

  before(() => {
    // Add mock methods not in generic mock Resource
    TaskResource.startRemoteChannelImport = sinon.stub();
    TaskResource.startDiskChannelImport = sinon.stub();
  });

  beforeEach(() => {
    store = makeStore();
    hackStoreWatcher(store);
    const taskEntity = { entity: { id: 'task_1' } };
    TaskResource.cancelTask = sinon.stub().returns(Promise.resolve());
    TaskResource.startDiskChannelImport.returns(Promise.resolve(taskEntity));
    TaskResource.startRemoteChannelImport.returns(Promise.resolve(taskEntity));
    ChannelResource.getModel.returns({
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
    TaskResource.startRemoteChannelImport.resetHistory();
    TaskResource.startDiskChannelImport.resetHistory();
    TaskResource.cancelTask.resetHistory();
  });

  function setUpStateForTransferType(transferType) {
    store.state.pageState.wizardState.transferType = transferType;
    store.state.pageState.wizardState.selectedDrive = {
      id: `${transferType}_specs_drive`,
    };
    store.state.pageState.wizardState.transferredChannel = {
      id: `${transferType}_brand_new_channel`,
    };
  }

  function useInstalledChannel() {
    store.state.pageState.wizardState.transferredChannel = { id: 'channel_1' };
  }

  // Tests for common behavior
  function testNoChannelsAreImported(store, options) {
    return loadChannelMetaData(store, options).then(() => {
      sinon.assert.notCalled(TaskResource.startDiskChannelImport);
      sinon.assert.notCalled(TaskResource.startRemoteChannelImport);
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
        sinon.assert.calledWith(TaskResource.startDiskChannelImport, {
          channel_id: 'localimport_brand_new_channel',
          drive_id: 'localimport_specs_drive',
        });
        sinon.assert.notCalled(TaskResource.startRemoteChannelImport);
      });
    });

    it('errors from startDiskChannelImport are handled', () => {
      TaskResource.startDiskChannelImport.returns(Promise.reject());
      return loadChannelMetaData(store).then(() => {
        expect(wizardState(store.state).status).to.equal('CONTENT_DB_LOADING_ERROR');
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
        sinon.assert.calledWith(TaskResource.startRemoteChannelImport, {
          channel_id: 'remoteimport_brand_new_channel',
        });
        sinon.assert.notCalled(TaskResource.startDiskChannelImport);
      });
    });

    it('errors from startRemoteChannelImport are handled', () => {
      TaskResource.startRemoteChannelImport.returns(Promise.reject());
      return loadChannelMetaData(store).then(() => {
        expect(wizardState(store.state).status).to.equal('CONTENT_DB_LOADING_ERROR');
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
