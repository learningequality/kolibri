import Vuex from 'vuex';
import { importExportWizardState } from '../../src/state/wizardState';
import mutations from '../../src/state/mutations';
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

const channelsOnDevice = [
  {
    ...allChannels[0],
    on_device_resources: 2000,
    on_device_file_size: 95189556, // about 90 MB
    available: true,
  },
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

// Use for availableChannelsPage and all children:
// channel-list-item
//
export function makeAvailableChannelsPageStore() {
  return new Vuex.Store({
    state: {
      core: {
        session: {
          kind: [],
        },
      },
      pageState: {
        channelList: channelsOnDevice,
        taskList: [],
        channelListLoading: false,
        wizardState: {
          ...importExportWizardState(),
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
          availableChannels: allChannels,
          transferType: 'localimport',
        },
      },
    },
    mutations,
  });
}

// Use for selectContentPage and all children:
// contentTreeViewer
export function makeSelectContentPageStore() {
  return new Vuex.Store({
    state: {
      pageState: {
        channelList: channelsOnDevice,
        taskList: [],
        wizardState: {
          ...importExportWizardState(),
          availableChannels: allChannels,
          transferType: 'localimport',
          transferredChannel: { ...allChannels[0] },
          currentTopicNode: contentNodeGranularPayload(),
        },
      },
    },
    mutations: {
      ...mutations,
      // test-only mutation
      addTask(state, task) {
        state.pageState.taskList.push(task);
      },
    },
  });
}
