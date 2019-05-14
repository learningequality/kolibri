const IMPORTABLE_RESOURCES = 'importable_resources';
const ON_DEVICE_RESOURCES = 'on_device_resources';
const IMPORTABLE_FILE_SIZE = 'importable_file_size';
const ON_DEVICE_FILE_SIZE = 'on_device_file_size';

export const defaultChannel = {
  description: 'An awesome channel',
  id: 'awesome_channel',
  language: 'English',
  language_code: 'en',
  name: 'Channel Title',
  [ON_DEVICE_FILE_SIZE]: 95189556,
  [ON_DEVICE_RESOURCES]: 52,
  published_size: 95189556,
  total_resource_count: 52,
  thumbnail: '',
  [IMPORTABLE_FILE_SIZE]: 5000000000,
  [IMPORTABLE_RESOURCES]: 5000,
  [IMPORTABLE_FILE_SIZE + '_deduped']: 5000000000,
  [IMPORTABLE_RESOURCES + '_deduped']: 5000,
  version: 20,
};

export const dupedChannel = {
  description: 'A duped channel',
  id: 'duped_channel',
  language: 'English',
  language_code: 'en',
  name: 'Channel Title',
  [ON_DEVICE_FILE_SIZE]: 1000000000,
  [ON_DEVICE_RESOURCES]: 1000,
  published_size: 95189556,
  total_resource_count: 52,
  thumbnail: '',
  [IMPORTABLE_FILE_SIZE]: 5000000000,
  [IMPORTABLE_RESOURCES]: 5000,
  [IMPORTABLE_FILE_SIZE + '_deduped']: 1000000000,
  [IMPORTABLE_RESOURCES + '_deduped']: 1000,
  importable_resource_duplication: 5,
  importable_file_duplication: 5,
  total_resource_duplication: 5,
  total_file_duplication: 5,
  version: 20,
  root: 'duped_topic_id',
};

const defaultNode = {
  kind: 'topic',
  [ON_DEVICE_FILE_SIZE]: 0,
  [ON_DEVICE_RESOURCES]: 1,
  path: [],
  [IMPORTABLE_FILE_SIZE]: 1,
  [IMPORTABLE_RESOURCES]: 1,
  available: true,
  importable: true,
};

export function makeNode(id, attrs = {}) {
  return {
    ...defaultNode,
    id,
    title: `node_${id}`,
    ...attrs,
  };
}

export function contentNodeGranularPayload() {
  return {
    id: 'topic_1',
    title: 'Addition and subtraction intro',
    available: false,
    importable: true,
    kind: 'topic',
    importable_resources: 2,
    [ON_DEVICE_RESOURCES]: 0,
    children: [
      {
        id: 'ee73cfd40eec4260a1f302157dda69d4',
        title: 'Put together, take apart',
        available: false,
        importable: true,
        kind: 'topic',
        importable_resources: 1,
        [ON_DEVICE_RESOURCES]: 0,
      },
      {
        id: 'f3cb61172a114c21a32982d1316ec786',
        title: 'Addition and subtraction word problems',
        available: false,
        kind: 'video',
        importable_resources: 1,
        [ON_DEVICE_RESOURCES]: 0,
        importable: false,
      },
    ],
  };
}
