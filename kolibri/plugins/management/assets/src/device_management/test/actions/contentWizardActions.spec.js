/* eslint-env mocha */
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import assert from 'assert';
import sinon from 'sinon';
import {
  startImportWizard,
  startExportWizard,
  transitionWizardPage,

} from '../../state/actions/contentWizardActions';
import { availableChannels, wizardState } from '../../state/getters';
import mutations from '../../state/mutations';
import * as contentTransferActions from '../../state/actions/contentTransferActions';
import { TaskResource, RemoteChannelResource } from 'kolibri.resources';
import { mockResource } from 'testUtils'; // eslint-disable-line

mockResource(RemoteChannelResource);

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        wizardState: {
          availableChannels: [],
          meta: {},
        },
      },
    },
    mutations,
  });
}

describe.only('transitionWizardPage action', () => {
  // Tests import/export workflow from ManageContentPage to the SelectContentPage
  // Covers integrations with showAvailableChannelsPage and showSelectContentPage
  let store;
  let selectContentStub;

  const pageName = () => wizardState(store.state).page;
  const meta = () => wizardState(store.state).meta;

  const installedChannels = [
    { id: 'installed_channel_1', name: 'Installed Channel One' },
    { id: 'installed_channel_2', name: 'Installed Channel Two' },
  ];

  const driveList = [
    {
      id: 'drive_1',
      name: 'Drive Nummer Eins',
      metadata: {
        channels: [
          { id: 'drive_1_channel_1', name: 'Drive 1 Channel One' },
          { id: 'drive_1_channel_2', name: 'Drive 1 Channel Two' },
        ],
      },
    },
    {
      id: 'drive_2',
      name: 'Drive Nummer Zwei',
      metadata: {
        channels: [
          { id: 'drive_2_channel_1', name: 'Drive 2 Channel One' },
          { id: 'drive_2_channel_2', name: 'Drive 2 Channel Two' },
        ],
      },
    },
  ];

  function testShowSelectContentCall(transferMeta, channel) {
    // test handoff of data to showSelectContentPage
    sinon.assert.calledOnce(selectContentStub);
    sinon.assert.calledWithMatch(selectContentStub, sinon.match.any, {
      ...transferMeta,
      channel,
    });
  }

  beforeEach(() => {
    store = makeStore();
    wizardState(store.state).driveList = driveList;
    wizardState(store.state).channelList = installedChannels;

    selectContentStub = sinon.stub(contentTransferActions, 'showSelectContentPage')
      .returns(Promise.resolve());
  });

  afterEach(() => {
    selectContentStub.restore();
  });

  it('REMOTEIMPORT flow correctly updates wizardState', () => {
    const publicChannels = [
      { id: 'public_channel_1', name: 'Public Channel One' },
      { id: 'public_channel_2', name: 'Public Channel Two' },
    ];
    // makes call to RemoteChannel API
    const fetchSpy = RemoteChannelResource.__getCollectionFetchReturns(publicChannels).fetch;
    const transferMeta = {
      transferType: 'remoteimport',
      source: {
        type: 'NETWORK_SOURCE',
        baseUrl: '',
      },
      destination: {},
    };
    // flow will be the same even if channel is unlisted with a token
    const channel = {
      ...publicChannels[0],
      onDevice: false,
      token: '',
    };

    // STEP 1 - click "import" -> open "choose source" modal
    startImportWizard(store);
    assert.equal(pageName(), 'CHOOSE_IMPORT_SOURCE');

    // STEP 2 - choose "internet" from options -> go to "available channels" page
    return transitionWizardPage(store, 'forward', { source: 'network' })
      .then(() => {
        assert.equal(pageName(), 'AVAILABLE_CHANNELS');
        assert.deepEqual(meta(), transferMeta);
        sinon.assert.calledOnce(RemoteChannelResource.getCollection);
        sinon.assert.calledOnce(fetchSpy);
        assert.equal(availableChannels(store.state), publicChannels);

        // STEP 3 - pick first channel -> go to "select content" page
        return transitionWizardPage(store, 'forward', { channel });
      })
      .then(() => {
        testShowSelectContentCall(transferMeta, channel);
        RemoteChannelResource.__resetMocks();
      });
  });

  it('LOCALIMPORT flow correctly updates wizardState', () => {
    const transferMeta = {
      transferType: 'localimport',
      source: {
        type: 'LOCAL_DRIVE',
        driveId: 'drive_2',
        driveName: 'Drive Nummer Zwei',
      },
      destination: {},
    };
    const channel = {
      ...driveList[1].metadata.channels[0],
      onDevice: false,
    };

    // STEP 1 - click "import" -> open "choose source" modal
    startImportWizard(store);
    assert.equal(pageName(), 'CHOOSE_IMPORT_SOURCE');

    // STEP 2 - choose "usb drive" from options -> go to "choose drive" modal
    transitionWizardPage(store, 'forward', { source: 'local' });
    assert.equal(pageName(), 'IMPORT_LOCAL');

    // STEP 3 - choose "drive_2" -> go to "available channels" page
    return transitionWizardPage(store, 'forward', { driveId: 'drive_2' })
      .then(() => {
        assert.equal(pageName(), 'AVAILABLE_CHANNELS');
        assert.deepEqual(meta(), transferMeta);
        assert.deepEqual(availableChannels(store.state), driveList[1].metadata.channels);

        // STEP 4 - pick the first channel -> go to "select content" page
        return transitionWizardPage(store, 'forward', { channel });
      })
      .then(() => {
        testShowSelectContentCall(transferMeta, channel);
      })
  });

  it('LOCALEXPORT flow correctly updates wizardState', () => {
    const localDrivesStub = sinon.stub(TaskResource, 'localDrives').returns(Promise.resolve({
      entity: [],
    }));
    const channel = {
      ...installedChannels[0],
      onDevice: true,
    };
    const transferMeta = {
      transferType: 'localexport',
      source: {},
      destination: {
        type: 'LOCAL_DRIVE',
        driveId: 'drive_1',
        driveName: 'Drive One',
      },
    }

    // STEP 1 - click "export" -> open "choose drive" modal
    startExportWizard(store);
    assert.equal(pageName(), 'EXPORT');

    // STEP 2 - choose "drive_1" -> go to "Available Channels" page
    return transitionWizardPage(store, 'forward', { driveId: 'drive_1' })
      .then(() => {
        assert.equal(pageName(), 'AVAILABLE_CHANNELS');
        assert.deepEqual(meta(), transferMeta);
        assert.deepEqual(availableChannels(store.state), installedChannels);

        // STEP 3 - pick a channel, go to "Select Content" page
        return transitionWizardPage(store, 'forward', { channel });
      })
      .then(() => {
        testShowSelectContentCall(transferMeta, channel);
        localDrivesStub.restore();
      });
  });
})
