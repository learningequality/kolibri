const TOTAL_RESOURCES = 'total_resources';
const ON_DEVICE_RESOURCES = 'on_device_resources';
const TOTAL_FILE_SIZE = 'total_file_size';
const ON_DEVICE_FILE_SIZE = 'on_device_file_size';

export const defaultChannel = {
  description: 'An awesome channel',
  id: 'awesome_channel',
  language: 'English',
  language_code: 'en',
  name: 'Channel Title',
  [ON_DEVICE_FILE_SIZE]: 95189556,
  [ON_DEVICE_RESOURCES]: 52,
  thumbnail: '',
  [TOTAL_FILE_SIZE]: 5000000000,
  [TOTAL_RESOURCES]: 5000,
  version: 20,
};

const defaultNode = {
  kind: 'topic',
  // [ON_DEVICE_FILE_SIZE]: 1,
  [ON_DEVICE_RESOURCES]: 1,
  path: [],
  // [TOTAL_FILE_SIZE]: 1,
  [TOTAL_RESOURCES]: 1,
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
    total_resources: 2,
    [ON_DEVICE_RESOURCES]: 0,
    children: [
      {
        id: 'ee73cfd40eec4260a1f302157dda69d4',
        title: 'Put together, take apart',
        available: false,
        importable: true,
        kind: 'topic',
        total_resources: 1,
        [ON_DEVICE_RESOURCES]: 0,
      },
      {
        id: 'f3cb61172a114c21a32982d1316ec786',
        title: 'Addition and subtraction word problems',
        available: false,
        kind: 'video',
        total_resources: 1,
        [ON_DEVICE_RESOURCES]: 0,
        importable: false,
      },
    ],
  };
}
