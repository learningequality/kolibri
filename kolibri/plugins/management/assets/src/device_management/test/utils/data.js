const defaultChannel = {
  description: 'An awesome channel',
  id: 'awesome_channel',
  language: 'English',
  language_code: 'en',
  name: 'Channel Title',
  thumbnail: '',
  total_file_size: 5000000000,
  total_resource_count: 5000,
  version: 20,
};

export function channelFactory(attrs = {}) {
  return {...defaultChannel, ...attrs};
}

const defaultNode = {
  kind: 'topic',
  path: [],
  resourcesOnDevice: 0,
  totalResources: 1,
  fileSize: 1,
};

export function makeNode(id, attrs = {}) {
  return {
    id,
    title: `node_${id}`,
    ...defaultNode,
    ...attrs
  };
}
