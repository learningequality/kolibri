import cloneDeep from 'lodash/cloneDeep';
import { coreStoreFactory } from 'kolibri/store';
import coreModule from '../../../../../core/frontend/state/modules/core';
import pluginModule from '../../modules/pluginModule';
import { contentNodeGranularPayload } from './data';

const allChannels = [
  {
    name: 'Awesome Channel',
    description: 'An awesome channel',
    id: 'awesome_channel',
    lang_code: 'en',
    lang_name: 'English',
    total_resources: 1000,
    total_file_size: 5000000000,
    version: 10,
  },
  {
    name: 'Bird Channel',
    id: 'bird_channel',
    desription: '',
    // No language code by design
    total_resources: 100,
    version: 9,
  },
  {
    name: 'Hunden Channel',
    id: 'hunden_channel',
    desription: '',
    lang_code: 'de',
    lang_name: 'German',
    total_resources: 100,
    version: 8,
  },
  {
    name: 'Kaetze Channel',
    id: 'kaetze_channel',
    desription: '',
    lang_code: 'de',
    lang_name: 'German',
    total_resources: 100,
    version: 7,
  },
];

// The transferredChannel used by makeSelectContentPageStore, exported so tests can
// derive expected display values (resource counts, file sizes) from the same source of truth.
export const selectContentTransferredChannel = {
  ...allChannels[0],
  on_device_resources: 2000,
  on_device_file_size: 95189556, // about 95 MB
};

const channelsOnDevice = [
  { ...selectContentTransferredChannel, available: true },
  {
    ...allChannels[1],
    on_device_resources: 0,
    on_device_file_size: 0,
    available: false,
  },
  {
    ...allChannels[3],
    on_device_resources: 10,
    on_device_file_size: 100,
    available: true,
  },
];

export default function makeStore() {
  const store = coreStoreFactory(pluginModule);
  store.registerModule('core', coreModule);
  return store;
}
// Use for availableChannelsPage and all children:
// channel-list-item
export function makeAvailableChannelsPageStore({ channelList } = {}) {
  const store = coreStoreFactory(cloneDeep(pluginModule));
  store.registerModule('core', coreModule);
  store.state.manageContent.channelList =
    channelList !== undefined ? channelList : [...channelsOnDevice];
  Object.assign(store.state.manageContent.wizard, {
    driveList: [
      {
        id: 'f9e29616935fbff37913ed46bf20e2c1',
        name: 'SANDISK (F:)',
      },
      {
        id: 'f9e29616935fbff37913ed46bf20e2c0',
        name: 'SANDISK (G:)',
      },
    ],
    availableChannels: [...allChannels],
    transferType: 'localimport',
  });
  return store;
}

// Use for selectContentPage and all children:
// contentTreeViewer
export function makeSelectContentPageStore() {
  const store = coreStoreFactory(cloneDeep(pluginModule));
  store.registerModule('core', coreModule);
  Object.assign(store.state.manageContent, {
    channelList: channelsOnDevice,
    taskList: [],
  });
  Object.assign(store.state.manageContent.wizard, {
    availableChannels: [...allChannels],
    transferType: 'localimport',
    transferredChannel: { ...selectContentTransferredChannel },
    currentTopicNode: contentNodeGranularPayload(),
  });
  return store;
}
