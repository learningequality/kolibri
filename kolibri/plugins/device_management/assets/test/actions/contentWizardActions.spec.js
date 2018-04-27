/* eslint-env mocha */
import { expect } from 'chai';
import Vue from 'vue-test'; // eslint-disable-line
import Vuex from 'vuex';
import sinon from 'sinon';
import { TaskResource, RemoteChannelResource } from 'kolibri.resources';
import {
  transitionWizardPage,
  FORWARD,
  BACKWARD,
  LOCAL_DRIVE,
  KOLIBRI_STUDIO,
} from '../../src/state/actions/contentWizardActions';
import { ContentWizardPages } from '../../src/constants';
import { availableChannels, wizardState } from '../../src/state/getters';
import mutations from '../../src/state/mutations';
import * as selectContentActions from '../../src/state/actions/selectContentActions';
import { mockResource } from 'testUtils'; // eslint-disable-line
import { importExportWizardState } from '../../src/state/wizardState';

mockResource(RemoteChannelResource);

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

function makeStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channelList: [...installedChannels],
        wizardState: {
          ...importExportWizardState(),
          driveList: [...driveList],
        },
      },
    },
    mutations,
  });
}

describe('transitionWizardPage action', () => {
  // Tests import/export workflow from ManageContentPage to the SelectContentPage
  // Covers integrations with showAvailableChannelsPage, loadChannelMetaData
  // and showSelectContentPage
  let store;
  let showSelectContentPageStub;
  let loadChannelMetaDataStub;

  const pageName = () => wizardState(store.state).pageName;
  const transferType = () => wizardState(store.state).transferType;
  const selectedDrive = () => wizardState(store.state).selectedDrive;

  before(() => {
    TaskResource.localDrives = sinon.stub();
  });

  beforeEach(() => {
    store = makeStore();

    loadChannelMetaDataStub = sinon
      .stub(selectContentActions, 'loadChannelMetaData')
      .returns(Promise.resolve());

    showSelectContentPageStub = sinon.stub(selectContentActions, 'showSelectContentPage');
  });

  afterEach(() => {
    loadChannelMetaDataStub.restore();
    showSelectContentPageStub.restore();
    TaskResource.localDrives.resetHistory();
  });

  it('REMOTEIMPORT flow correctly updates wizardState', () => {
    const publicChannels = [
      { id: 'public_channel_1', name: 'Public Channel One' },
      { id: 'public_channel_2', name: 'Public Channel Two' },
    ];
    // makes call to RemoteChannel API
    let fetchSpy = sinon.stub().returns({
      _promise: Promise.resolve(publicChannels),
    });
    RemoteChannelResource.getCollection.returns({
      fetch: fetchSpy,
    });

    // STEP 1 - click "import" -> SELECT_IMPORT_SOURCE
    transitionWizardPage(store, FORWARD, { import: true });
    expect(pageName()).to.equal('SELECT_IMPORT_SOURCE');

    // STEP 2 - choose "internet" from options -> AVAILABLE_CHANNELS
    return transitionWizardPage(store, FORWARD, { source: KOLIBRI_STUDIO })
      .then(() => {
        expect(pageName()).to.equal('AVAILABLE_CHANNELS');
        expect(transferType()).to.equal('remoteimport');

        // Calls from inside showAvailableChannelsPage
        sinon.assert.calledOnce(RemoteChannelResource.getCollection);
        sinon.assert.calledOnce(fetchSpy);
        expect(availableChannels(store.state)).to.deep.equal(publicChannels);

        // STEP 3 - pick first channel -> LOADING_CHANNEL_METADATA
        return transitionWizardPage(store, FORWARD, {
          channel: {
            id: 'public_channel_1',
          },
        }).then(() => {
          sinon.assert.calledOnce(loadChannelMetaDataStub);
          store.dispatch('SET_WIZARD_PAGENAME', ContentWizardPages.LOADING_CHANNEL_METADATA);
          // STEP 4 - LOADING_CHANNEL_METADATA -> SELECT CONTENT PAGE
          return transitionWizardPage(store, FORWARD);
        });
      })
      .then(() => {
        sinon.assert.calledOnce(showSelectContentPageStub);
        RemoteChannelResource.__resetMocks();
      });
  });

  it('LOCALIMPORT flow correctly updates wizardState', () => {
    TaskResource.localDrives.returns(
      Promise.resolve({
        entity: [],
      })
    );
    const selectedUsbDrive = driveList[1];
    const channel = {
      ...selectedUsbDrive.metadata.channels[0],
    };

    // STEP 1 - click "import" -> SELECT_IMPORT_SOURCE
    transitionWizardPage(store, FORWARD, { import: true });
    expect(pageName()).to.equal('SELECT_IMPORT_SOURCE');

    // STEP 2 - choose "usb drive" from options -> SELECT_DRIVE
    transitionWizardPage(store, FORWARD, { source: LOCAL_DRIVE });
    expect(pageName()).to.equal('SELECT_DRIVE');
    expect(transferType()).to.equal('localimport');

    // STEP 3 - choose "drive_2" -> AVAILABLE_CHANNELS
    return transitionWizardPage(store, FORWARD, { driveId: 'drive_2' })
      .then(() => {
        expect(pageName()).to.equal('AVAILABLE_CHANNELS');
        expect(selectedDrive()).to.deep.equal(selectedUsbDrive);
        expect(availableChannels(store.state)).to.deep.equal(selectedUsbDrive.metadata.channels);

        // STEP 4 - pick the first channel -> go to loading channel metadata
        return transitionWizardPage(store, FORWARD, { channel }).then(() => {
          sinon.assert.calledOnce(loadChannelMetaDataStub);
          store.dispatch('SET_WIZARD_PAGENAME', ContentWizardPages.LOADING_CHANNEL_METADATA);
          // STEP 5 - pick the first channel -> go to "select content" page
          return transitionWizardPage(store, FORWARD);
        });
      })
      .then(() => {
        sinon.assert.calledOnce(showSelectContentPageStub);
      });
  });

  it('LOCALEXPORT flow correctly updates wizardState', () => {
    TaskResource.localDrives.returns(
      Promise.resolve({
        entity: [],
      })
    );
    const channel = {
      ...installedChannels[0],
    };

    // STEP 1 - click "export" -> SELECT_DRIVE
    transitionWizardPage(store, FORWARD, { import: false });
    expect(pageName()).to.equal('SELECT_DRIVE');
    expect(transferType()).to.equal('localexport');

    // STEP 2 - choose "drive_1" -> AVAILABLE_CHANNELS
    return transitionWizardPage(store, FORWARD, { driveId: 'drive_1' })
      .then(() => {
        expect(pageName()).to.equal('AVAILABLE_CHANNELS');
        expect(availableChannels(store.state)).to.deep.equal(installedChannels);

        // STEP 3 - pick the first channel -> go to loading channel metadata
        return transitionWizardPage(store, FORWARD, { channel }).then(() => {
          sinon.assert.calledOnce(loadChannelMetaDataStub);
          store.dispatch('SET_WIZARD_PAGENAME', ContentWizardPages.LOADING_CHANNEL_METADATA);
          // STEP 4 - pick the first channel -> go to "select content" page
          return transitionWizardPage(store, FORWARD);
        });
      })
      .then(() => {
        sinon.assert.calledOnce(showSelectContentPageStub);
      });
  });

  it('in all modes, going back from SELECT_CONTENT to AVAILABLE_CHANNELS should reset parts of wizardState', () => {
    // Putting unrealistic data into state to emphasize the generality of this behavior
    const initial = {
      currentTopicNode: {
        id: 'currentTopicNode',
      },
      nodesForTransfer: {
        included: [1, 2, 3],
        omitted: [4, 5, 6],
      },
      pageName: 'SELECT_CONTENT',
      availableSpace: 123123123,
      availableChannels: ['a', 'b', 'c'],
      driveList: ['c', 'd', 'e'],
      selectedDrive: {
        foo: 'bar',
      },
      transferType: 'intergalatic',
      path: [{ bar: 'foo', baz: 'buzz' }],
      status: 'awesome',
      pathCache: { a: { b: 1 } },
      transferredChannel: {
        id: 'channelios',
      },
    };
    const expected = {
      ...initial,
      currentTopicNode: {},
      nodesForTransfer: {
        included: [],
        omitted: [],
      },
      pageName: 'AVAILABLE_CHANNELS',
      path: [],
      status: '',
      pathCache: {},
      transferredChannel: {},
    };
    store.state.pageState.wizardState = { ...initial };
    return transitionWizardPage(store, BACKWARD).then(() => {
      expect(wizardState(store.state)).to.deep.equal(expected);
    });
  });
});
