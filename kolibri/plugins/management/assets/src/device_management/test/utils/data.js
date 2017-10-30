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

export function selectContentsPageState() {
  return {
    channel: {},
    channelImportTask: {},
    source: {},
    destination: {},
    transferType: '',
    status: '', // content_db_{loading,error}, tree_view_{loading,error}, transfer_{started,error}
    treeView: {
      currentNode: {},
      breadcrumbs: [],
    },
    path: [],
    selectedItems: {
      nodes: {
        include: [],
        omit: [],
      },
    },
  };
}

export function contentNodeGranularPayload() {
  return {
    pk: 'e5cb45958ea84caeb6149b289a0baea9',
    title: 'Addition and subtraction intro',
    available: false,
    importable: true,
    kind: 'topic',
    total_resources: 2,
    resources_on_device: 0,
    children: [
      {
        pk: 'ee73cfd40eec4260a1f302157dda69d4',
        title: 'Put together, take apart',
        available: false,
        importable: true,
        kind: "topic",
        total_resources: 1,
        resources_on_device: 0,
      },
      {
        pk: 'f3cb61172a114c21a32982d1316ec786',
        title: 'Addition and subtraction word problems',
        available: false,
        kind: "video",
        total_resources: 1,
        resources_on_device: 0,
        importable: false
      }
    ],
  };
}
